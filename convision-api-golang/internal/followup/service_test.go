package followup_test

import (
	"errors"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/followup"
)

// ---- mock implementations ----

// mockClinicalRecordRepoForFU implements domain.ClinicalRecordRepository.
type mockClinicalRecordRepoForFU struct {
	records map[uint]*domain.ClinicalRecord
	nextID  uint
}

func newMockClinicalRecordRepoForFU() *mockClinicalRecordRepoForFU {
	return &mockClinicalRecordRepoForFU{
		records: make(map[uint]*domain.ClinicalRecord),
		nextID:  1,
	}
}

func (m *mockClinicalRecordRepoForFU) add(r *domain.ClinicalRecord) {
	m.nextID++
	r.ID = m.nextID
	cp := *r
	m.records[r.ID] = &cp
}

func (m *mockClinicalRecordRepoForFU) Create(r *domain.ClinicalRecord) error {
	m.nextID++
	r.ID = m.nextID
	cp := *r
	m.records[r.ID] = &cp
	return nil
}

func (m *mockClinicalRecordRepoForFU) GetByID(id uint) (*domain.ClinicalRecord, error) {
	r, ok := m.records[id]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}
	cp := *r
	return &cp, nil
}

func (m *mockClinicalRecordRepoForFU) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	for _, r := range m.records {
		if r.AppointmentID == appointmentID {
			cp := *r
			return &cp, nil
		}
	}
	return nil, &domain.ErrNotFound{Resource: "clinical_record"}
}

func (m *mockClinicalRecordRepoForFU) Update(r *domain.ClinicalRecord) error {
	if _, ok := m.records[r.ID]; !ok {
		return &domain.ErrNotFound{Resource: "clinical_record"}
	}
	cp := *r
	m.records[r.ID] = &cp
	return nil
}

func (m *mockClinicalRecordRepoForFU) Delete(id uint) error {
	panic("not implemented in mock")
}

// mockFollowUpRepo implements domain.FollowUpRepository.
type mockFollowUpRepo struct {
	byRecordID map[uint]*domain.FollowUp
	nextID     uint
}

func newMockFollowUpRepo() *mockFollowUpRepo {
	return &mockFollowUpRepo{
		byRecordID: make(map[uint]*domain.FollowUp),
		nextID:     1,
	}
}

func (m *mockFollowUpRepo) Create(f *domain.FollowUp) error {
	m.nextID++
	f.ID = m.nextID
	cp := *f
	m.byRecordID[f.ClinicalRecordID] = &cp
	return nil
}

func (m *mockFollowUpRepo) GetByRecordID(clinicalRecordID uint) (*domain.FollowUp, error) {
	f, ok := m.byRecordID[clinicalRecordID]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "follow_up"}
	}
	cp := *f
	return &cp, nil
}

func (m *mockFollowUpRepo) Update(f *domain.FollowUp) error {
	if _, ok := m.byRecordID[f.ClinicalRecordID]; !ok {
		return &domain.ErrNotFound{Resource: "follow_up"}
	}
	cp := *f
	m.byRecordID[f.ClinicalRecordID] = &cp
	return nil
}

// mockVisualExamRepoForFU implements domain.VisualExamRepository (minimal stub).
type mockVisualExamRepoForFU struct{}

func (m *mockVisualExamRepoForFU) Create(e *domain.VisualExam) error { return nil }
func (m *mockVisualExamRepoForFU) GetByRecordID(clinicalRecordID uint) (*domain.VisualExam, error) {
	return nil, &domain.ErrNotFound{Resource: "visual_exam"}
}
func (m *mockVisualExamRepoForFU) Update(e *domain.VisualExam) error { return nil }

// mockAppointmentRepoForFU implements domain.AppointmentRepository (minimal stub).
type mockAppointmentRepoForFU struct{}

func (m *mockAppointmentRepoForFU) GetByID(id uint) (*domain.Appointment, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) GetByPatientID(patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) GetBySpecialistID(specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) Create(a *domain.Appointment) error {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) Update(a *domain.Appointment) error {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) Delete(id uint) error { panic("not implemented in mock") }
func (m *mockAppointmentRepoForFU) List(filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) SaveManagementReport(id uint, consultationType, reportNotes string) error {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*domain.SpecialistReportSummary, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) ExistsByPatientAndDate(patientID uint, specialistID *uint, date time.Time) (bool, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForFU) GetActiveBySpecialist(specialistID uint) (*domain.Appointment, error) {
	panic("not implemented in mock")
}

// ---- helper to build a fully-wired followup service ----

func buildFollowUpService(
	records *mockClinicalRecordRepoForFU,
	followUps *mockFollowUpRepo,
) *followup.Service {
	return followup.NewService(
		records,
		followUps,
		&mockVisualExamRepoForFU{},
		&mockAppointmentRepoForFU{},
		zap.NewNop(),
	)
}

// ---- UpsertAnamnesis tests ----

func TestFollowUpUpsertAnamnesis_Create(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	input := followup.FollowUpAnamnesisInput{
		ControlReason:          "routine check",
		CorrectionSatisfaction: "8",
	}
	result, err := svc.UpsertAnamnesis(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.ControlReason != "routine check" {
		t.Errorf("expected ControlReason='routine check', got '%s'", result.ControlReason)
	}
	if result.CorrectionSatisfaction != "8" {
		t.Errorf("expected CorrectionSatisfaction='8', got '%s'", result.CorrectionSatisfaction)
	}
	// Default required fields must be set.
	if result.EvolutionType != domain.EvolutionTypeStable {
		t.Errorf("expected default EvolutionType=stable, got %s", result.EvolutionType)
	}
	if result.FormulaDecision != domain.FormulaDecisionMaintain {
		t.Errorf("expected default FormulaDecision=maintain, got %s", result.FormulaDecision)
	}
}

func TestFollowUpUpsertAnamnesis_Update(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Seed existing follow-up.
	followUps.byRecordID[r.ID] = &domain.FollowUp{
		ClinicalRecordID:       r.ID,
		ControlReason:          "old reason",
		EvolutionType:          domain.EvolutionTypeStable,
		FormulaDecision:        domain.FormulaDecisionMaintain,
	}

	input := followup.FollowUpAnamnesisInput{
		ControlReason:          "updated reason",
		CorrectionSatisfaction: "9",
	}
	result, err := svc.UpsertAnamnesis(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.ControlReason != "updated reason" {
		t.Errorf("expected ControlReason='updated reason', got '%s'", result.ControlReason)
	}
}

func TestFollowUpUpsertAnamnesis_WrongClinic(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   2,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	_, err := svc.UpsertAnamnesis(r.ID, 1, followup.FollowUpAnamnesisInput{ControlReason: "x"})
	if err == nil {
		t.Fatal("expected error for wrong clinic, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

// ---- UpsertEvolution tests ----

func TestFollowUpUpsertEvolution_Create(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	input := followup.FollowUpEvolutionInput{
		EvolutionType:        domain.EvolutionTypeImproved,
		EvolutionDescription: "patient reports improvement",
		NewDiagnosis:         false,
		ContinuityPlan:       "continue current treatment",
	}
	result, err := svc.UpsertEvolution(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.EvolutionType != domain.EvolutionTypeImproved {
		t.Errorf("expected EvolutionType=improved, got %s", result.EvolutionType)
	}
	if result.EvolutionDescription != "patient reports improvement" {
		t.Errorf("expected EvolutionDescription set, got '%s'", result.EvolutionDescription)
	}
}

func TestFollowUpUpsertEvolution_Update(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Seed existing follow-up.
	followUps.byRecordID[r.ID] = &domain.FollowUp{
		ClinicalRecordID: r.ID,
		EvolutionType:    domain.EvolutionTypeStable,
		FormulaDecision:  domain.FormulaDecisionMaintain,
	}

	input := followup.FollowUpEvolutionInput{
		EvolutionType:        domain.EvolutionTypeWorsened,
		EvolutionDescription: "condition deteriorated",
	}
	result, err := svc.UpsertEvolution(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.EvolutionType != domain.EvolutionTypeWorsened {
		t.Errorf("expected EvolutionType=worsened, got %s", result.EvolutionType)
	}
}

// ---- UpsertFormula tests ----

func TestFollowUpUpsertFormula_Create(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	input := followup.FollowUpFormulaInput{
		FormulaDecision: domain.FormulaDecisionUpdate,
	}
	result, err := svc.UpsertFormula(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.FormulaDecision != domain.FormulaDecisionUpdate {
		t.Errorf("expected FormulaDecision=update, got %s", result.FormulaDecision)
	}
}

func TestFollowUpUpsertFormula_Update(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Seed existing follow-up with maintain decision.
	followUps.byRecordID[r.ID] = &domain.FollowUp{
		ClinicalRecordID: r.ID,
		EvolutionType:    domain.EvolutionTypeStable,
		FormulaDecision:  domain.FormulaDecisionMaintain,
	}

	input := followup.FollowUpFormulaInput{
		FormulaDecision: domain.FormulaDecisionUpdate,
	}
	result, err := svc.UpsertFormula(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.FormulaDecision != domain.FormulaDecisionUpdate {
		t.Errorf("expected FormulaDecision=update, got %s", result.FormulaDecision)
	}
}

// ---- SignAndComplete tests ----

func TestFollowUpSignAndComplete_Success(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Seed a valid follow-up with all required fields.
	followUps.byRecordID[r.ID] = &domain.FollowUp{
		ClinicalRecordID:     r.ID,
		ControlReason:        "annual control",
		EvolutionDescription: "patient stable",
		EvolutionType:        domain.EvolutionTypeStable,
		FormulaDecision:      domain.FormulaDecisionMaintain,
	}

	result, err := svc.SignAndComplete(r.ID, 42, "TP-5678")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Status != domain.ClinicalRecordStatusSigned {
		t.Errorf("expected status signed, got %s", result.Status)
	}
	if result.SignedAt == nil {
		t.Error("expected SignedAt to be set")
	}
	if result.SignedByID == nil || *result.SignedByID != 42 {
		t.Errorf("expected SignedByID=42, got %v", result.SignedByID)
	}
}

func TestFollowUpSignAndComplete_MissingFollowUp(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// No follow-up data at all.
	_, err := svc.SignAndComplete(r.ID, 42, "TP-5678")
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

func TestFollowUpSignAndComplete_EmptyControlReason(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Follow-up exists but ControlReason is empty.
	followUps.byRecordID[r.ID] = &domain.FollowUp{
		ClinicalRecordID:     r.ID,
		ControlReason:        "",
		EvolutionDescription: "patient stable",
		EvolutionType:        domain.EvolutionTypeStable,
		FormulaDecision:      domain.FormulaDecisionMaintain,
	}

	_, err := svc.SignAndComplete(r.ID, 42, "TP-5678")
	if err == nil {
		t.Fatal("expected validation error for empty control reason, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

func TestFollowUpSignAndComplete_EmptyEvolutionDescription(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeFollowUp,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Follow-up has control reason but no evolution description.
	followUps.byRecordID[r.ID] = &domain.FollowUp{
		ClinicalRecordID:     r.ID,
		ControlReason:        "annual control",
		EvolutionDescription: "",
		EvolutionType:        domain.EvolutionTypeStable,
		FormulaDecision:      domain.FormulaDecisionMaintain,
	}

	_, err := svc.SignAndComplete(r.ID, 42, "TP-5678")
	if err == nil {
		t.Fatal("expected validation error for empty evolution description, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

func TestFollowUpSignAndComplete_RecordNotFound(t *testing.T) {
	records := newMockClinicalRecordRepoForFU()
	followUps := newMockFollowUpRepo()
	svc := buildFollowUpService(records, followUps)

	_, err := svc.SignAndComplete(999, 42, "TP-5678")
	if err == nil {
		t.Fatal("expected error for non-existent record, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}
