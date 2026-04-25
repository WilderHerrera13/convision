package appointment_test

import (
	"errors"
	"testing"
	"time"

	"go.uber.org/zap"

	appointmentsvc "github.com/convision/api/internal/appointment"
	"github.com/convision/api/internal/domain"
)

// mockAppointmentRepo is an in-memory implementation of domain.AppointmentRepository
// used for unit testing the appointment service lifecycle methods.
type mockAppointmentRepo struct {
	appointments map[uint]*domain.Appointment
	nextID       uint
}

func newMockAppointmentRepo() *mockAppointmentRepo {
	return &mockAppointmentRepo{
		appointments: make(map[uint]*domain.Appointment),
		nextID:       1,
	}
}

// add inserts an appointment into the in-memory store, assigning it the next ID.
func (m *mockAppointmentRepo) add(a *domain.Appointment) {
	m.nextID++
	a.ID = m.nextID
	cp := *a
	m.appointments[a.ID] = &cp
}

func (m *mockAppointmentRepo) GetByID(id uint) (*domain.Appointment, error) {
	a, ok := m.appointments[id]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "appointment"}
	}
	cp := *a
	return &cp, nil
}

func (m *mockAppointmentRepo) Update(a *domain.Appointment) error {
	if _, ok := m.appointments[a.ID]; !ok {
		return &domain.ErrNotFound{Resource: "appointment"}
	}
	cp := *a
	m.appointments[a.ID] = &cp
	return nil
}

func (m *mockAppointmentRepo) GetActiveBySpecialist(specialistID uint) (*domain.Appointment, error) {
	for _, a := range m.appointments {
		if a.TakenByID != nil && *a.TakenByID == specialistID && a.Status == domain.AppointmentStatusInProgress {
			cp := *a
			return &cp, nil
		}
	}
	return nil, &domain.ErrNotFound{Resource: "appointment"}
}

func (m *mockAppointmentRepo) Create(a *domain.Appointment) error {
	m.nextID++
	a.ID = m.nextID
	cp := *a
	m.appointments[a.ID] = &cp
	return nil
}

func (m *mockAppointmentRepo) Delete(id uint) error {
	if _, ok := m.appointments[id]; !ok {
		return &domain.ErrNotFound{Resource: "appointment"}
	}
	delete(m.appointments, id)
	return nil
}

func (m *mockAppointmentRepo) GetByPatientID(patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}

func (m *mockAppointmentRepo) GetBySpecialistID(specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}

func (m *mockAppointmentRepo) List(filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}

func (m *mockAppointmentRepo) SaveManagementReport(id uint, consultationType, reportNotes string) error {
	panic("not implemented in mock")
}

func (m *mockAppointmentRepo) GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*domain.SpecialistReportSummary, error) {
	panic("not implemented in mock")
}

func (m *mockAppointmentRepo) ExistsByPatientAndDate(patientID uint, specialistID *uint, date time.Time) (bool, error) {
	panic("not implemented in mock")
}

// ---------- Take tests ----------

func TestTake_Success(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusScheduled,
	}
	repo.add(appt)

	result, err := svc.Take(appt.ID, 42)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Status != domain.AppointmentStatusInProgress {
		t.Errorf("expected status in_progress, got %s", result.Status)
	}
	if result.TakenByID == nil || *result.TakenByID != 42 {
		t.Errorf("expected TakenByID=42, got %v", result.TakenByID)
	}
	if result.StartedAt == nil {
		t.Error("expected StartedAt to be set")
	}
}

func TestTake_SetsStartedAtOnce(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	// Simulate an appointment that was paused (already has StartedAt set).
	originalStart := time.Now().Add(-1 * time.Hour)
	specialistID := uint(42)
	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusPaused,
		TakenByID: &specialistID,
		StartedAt: &originalStart,
	}
	repo.add(appt)

	result, err := svc.Take(appt.ID, specialistID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.StartedAt == nil {
		t.Fatal("expected StartedAt to be set")
	}
	// StartedAt should not change when already set.
	if !result.StartedAt.Equal(originalStart) {
		t.Errorf("expected StartedAt to remain %v, got %v", originalStart, *result.StartedAt)
	}
}

func TestTake_Conflict(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	specialistID := uint(42)

	// Add an already active appointment for specialist 42.
	active := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusInProgress,
		TakenByID: &specialistID,
	}
	repo.add(active)
	activeID := active.ID

	// Add a new scheduled appointment to take.
	pending := &domain.Appointment{
		PatientID: 11,
		Status:    domain.AppointmentStatusScheduled,
	}
	repo.add(pending)

	_, err := svc.Take(pending.ID, specialistID)
	if err == nil {
		t.Fatal("expected ErrActiveAppointment, got nil")
	}

	var conflictErr *appointmentsvc.ErrActiveAppointment
	if !errors.As(err, &conflictErr) {
		t.Errorf("expected *ErrActiveAppointment, got %T: %v", err, err)
	}
	if conflictErr.ActiveID != activeID {
		t.Errorf("expected ActiveID=%d, got %d", activeID, conflictErr.ActiveID)
	}
}

func TestTake_NotFound(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	_, err := svc.Take(999, 42)
	if err == nil {
		t.Fatal("expected error for non-existent appointment, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

func TestTake_InvalidStatus(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	// An already-completed appointment cannot be taken.
	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusCompleted,
	}
	repo.add(appt)

	_, err := svc.Take(appt.ID, 42)
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

// ---------- Complete tests ----------

func TestComplete_Success(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	specialistID := uint(42)
	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusInProgress,
		TakenByID: &specialistID,
	}
	repo.add(appt)

	result, err := svc.Complete(appt.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Status != domain.AppointmentStatusCompleted {
		t.Errorf("expected status completed, got %s", result.Status)
	}
	if result.CompletedAt == nil {
		t.Error("expected CompletedAt to be set")
	}
}

func TestComplete_FromPaused(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	specialistID := uint(42)
	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusPaused,
		TakenByID: &specialistID,
	}
	repo.add(appt)

	result, err := svc.Complete(appt.ID)
	if err != nil {
		t.Fatalf("expected no error completing paused appointment, got %v", err)
	}
	if result.Status != domain.AppointmentStatusCompleted {
		t.Errorf("expected status completed, got %s", result.Status)
	}
	if result.CompletedAt == nil {
		t.Error("expected CompletedAt to be set")
	}
}

func TestComplete_InvalidStatus(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusScheduled,
	}
	repo.add(appt)

	_, err := svc.Complete(appt.ID)
	if err == nil {
		t.Fatal("expected validation error completing scheduled appointment, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

func TestComplete_NotFound(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	_, err := svc.Complete(999)
	if err == nil {
		t.Fatal("expected error for non-existent appointment, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

// ---------- GetActive tests ----------

func TestGetActive_Found(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	specialistID := uint(42)
	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusInProgress,
		TakenByID: &specialistID,
	}
	repo.add(appt)

	result, err := svc.GetActive(specialistID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.ID != appt.ID {
		t.Errorf("expected appointment ID=%d, got %d", appt.ID, result.ID)
	}
	if result.Status != domain.AppointmentStatusInProgress {
		t.Errorf("expected in_progress, got %s", result.Status)
	}
}

func TestGetActive_NotFound(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	_, err := svc.GetActive(99)
	if err == nil {
		t.Fatal("expected ErrNotFound, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

// ---------- Pause tests ----------

func TestPause_Success(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	specialistID := uint(42)
	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusInProgress,
		TakenByID: &specialistID,
	}
	repo.add(appt)

	result, err := svc.Pause(appt.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Status != domain.AppointmentStatusPaused {
		t.Errorf("expected status paused, got %s", result.Status)
	}
}

func TestPause_InvalidStatus(t *testing.T) {
	repo := newMockAppointmentRepo()
	svc := appointmentsvc.NewService(repo, zap.NewNop())

	appt := &domain.Appointment{
		PatientID: 10,
		Status:    domain.AppointmentStatusScheduled,
	}
	repo.add(appt)

	_, err := svc.Pause(appt.ID)
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}
