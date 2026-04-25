package clinicalrecord_test

import (
	"errors"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/clinicalrecord"
	"github.com/convision/api/internal/domain"
)

// ---- mock implementations ----

// mockClinicalRecordRepo implements domain.ClinicalRecordRepository.
type mockClinicalRecordRepo struct {
	records map[uint]*domain.ClinicalRecord
	nextID  uint
}

func newMockClinicalRecordRepo() *mockClinicalRecordRepo {
	return &mockClinicalRecordRepo{
		records: make(map[uint]*domain.ClinicalRecord),
		nextID:  1,
	}
}

func (m *mockClinicalRecordRepo) add(r *domain.ClinicalRecord) {
	m.nextID++
	r.ID = m.nextID
	cp := *r
	m.records[r.ID] = &cp
}

func (m *mockClinicalRecordRepo) Create(r *domain.ClinicalRecord) error {
	m.nextID++
	r.ID = m.nextID
	cp := *r
	m.records[r.ID] = &cp
	return nil
}

func (m *mockClinicalRecordRepo) GetByID(id uint) (*domain.ClinicalRecord, error) {
	r, ok := m.records[id]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}
	cp := *r
	return &cp, nil
}

func (m *mockClinicalRecordRepo) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	for _, r := range m.records {
		if r.AppointmentID == appointmentID {
			cp := *r
			return &cp, nil
		}
	}
	return nil, &domain.ErrNotFound{Resource: "clinical_record"}
}

func (m *mockClinicalRecordRepo) Update(r *domain.ClinicalRecord) error {
	if _, ok := m.records[r.ID]; !ok {
		return &domain.ErrNotFound{Resource: "clinical_record"}
	}
	cp := *r
	m.records[r.ID] = &cp
	return nil
}

func (m *mockClinicalRecordRepo) Delete(id uint) error {
	if _, ok := m.records[id]; !ok {
		return &domain.ErrNotFound{Resource: "clinical_record"}
	}
	delete(m.records, id)
	return nil
}

// mockAnamnesisRepo implements domain.AnamnesisRepository.
type mockAnamnesisRepo struct {
	byRecordID map[uint]*domain.Anamnesis
}

func newMockAnamnesisRepo() *mockAnamnesisRepo {
	return &mockAnamnesisRepo{byRecordID: make(map[uint]*domain.Anamnesis)}
}

func (m *mockAnamnesisRepo) Create(a *domain.Anamnesis) error {
	cp := *a
	m.byRecordID[a.ClinicalRecordID] = &cp
	return nil
}

func (m *mockAnamnesisRepo) GetByRecordID(clinicalRecordID uint) (*domain.Anamnesis, error) {
	a, ok := m.byRecordID[clinicalRecordID]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "anamnesis"}
	}
	cp := *a
	return &cp, nil
}

func (m *mockAnamnesisRepo) Update(a *domain.Anamnesis) error {
	if _, ok := m.byRecordID[a.ClinicalRecordID]; !ok {
		return &domain.ErrNotFound{Resource: "anamnesis"}
	}
	cp := *a
	m.byRecordID[a.ClinicalRecordID] = &cp
	return nil
}

// mockVisualExamRepo implements domain.VisualExamRepository.
type mockVisualExamRepo struct {
	byRecordID map[uint]*domain.VisualExam
}

func newMockVisualExamRepo() *mockVisualExamRepo {
	return &mockVisualExamRepo{byRecordID: make(map[uint]*domain.VisualExam)}
}

func (m *mockVisualExamRepo) Create(e *domain.VisualExam) error {
	cp := *e
	m.byRecordID[e.ClinicalRecordID] = &cp
	return nil
}

func (m *mockVisualExamRepo) GetByRecordID(clinicalRecordID uint) (*domain.VisualExam, error) {
	e, ok := m.byRecordID[clinicalRecordID]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "visual_exam"}
	}
	cp := *e
	return &cp, nil
}

func (m *mockVisualExamRepo) Update(e *domain.VisualExam) error {
	if _, ok := m.byRecordID[e.ClinicalRecordID]; !ok {
		return &domain.ErrNotFound{Resource: "visual_exam"}
	}
	cp := *e
	m.byRecordID[e.ClinicalRecordID] = &cp
	return nil
}

// mockDiagnosisRepo implements domain.ClinicalDiagnosisRepository.
type mockDiagnosisRepo struct {
	byRecordID map[uint][]*domain.ClinicalDiagnosis
	nextID     uint
}

func newMockDiagnosisRepo() *mockDiagnosisRepo {
	return &mockDiagnosisRepo{
		byRecordID: make(map[uint][]*domain.ClinicalDiagnosis),
		nextID:     1,
	}
}

func (m *mockDiagnosisRepo) Create(d *domain.ClinicalDiagnosis) error {
	m.nextID++
	d.ID = m.nextID
	cp := *d
	m.byRecordID[d.ClinicalRecordID] = append(m.byRecordID[d.ClinicalRecordID], &cp)
	return nil
}

func (m *mockDiagnosisRepo) GetByRecordID(clinicalRecordID uint) ([]*domain.ClinicalDiagnosis, error) {
	list := m.byRecordID[clinicalRecordID]
	result := make([]*domain.ClinicalDiagnosis, len(list))
	for i, d := range list {
		cp := *d
		result[i] = &cp
	}
	return result, nil
}

func (m *mockDiagnosisRepo) Update(d *domain.ClinicalDiagnosis) error {
	list, ok := m.byRecordID[d.ClinicalRecordID]
	if !ok {
		return &domain.ErrNotFound{Resource: "clinical_diagnosis"}
	}
	for i, existing := range list {
		if existing.ID == d.ID {
			cp := *d
			m.byRecordID[d.ClinicalRecordID][i] = &cp
			return nil
		}
	}
	return &domain.ErrNotFound{Resource: "clinical_diagnosis"}
}

func (m *mockDiagnosisRepo) Delete(id uint) error {
	panic("not implemented in mock")
}

// mockPrescriptionRepo implements domain.ClinicalPrescriptionRepository.
type mockPrescriptionRepo struct {
	byRecordID map[uint]*domain.ClinicalPrescription
}

func newMockPrescriptionRepo() *mockPrescriptionRepo {
	return &mockPrescriptionRepo{byRecordID: make(map[uint]*domain.ClinicalPrescription)}
}

func (m *mockPrescriptionRepo) Create(p *domain.ClinicalPrescription) error {
	cp := *p
	m.byRecordID[p.ClinicalRecordID] = &cp
	return nil
}

func (m *mockPrescriptionRepo) GetByRecordID(clinicalRecordID uint) (*domain.ClinicalPrescription, error) {
	p, ok := m.byRecordID[clinicalRecordID]
	if !ok {
		return nil, &domain.ErrNotFound{Resource: "clinical_prescription"}
	}
	cp := *p
	return &cp, nil
}

func (m *mockPrescriptionRepo) Update(p *domain.ClinicalPrescription) error {
	if _, ok := m.byRecordID[p.ClinicalRecordID]; !ok {
		return &domain.ErrNotFound{Resource: "clinical_prescription"}
	}
	cp := *p
	m.byRecordID[p.ClinicalRecordID] = &cp
	return nil
}

// mockAppointmentRepoForCR implements domain.AppointmentRepository (minimal stub).
type mockAppointmentRepoForCR struct{}

func (m *mockAppointmentRepoForCR) GetByID(id uint) (*domain.Appointment, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) GetByPatientID(patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) GetBySpecialistID(specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) Create(a *domain.Appointment) error {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) Update(a *domain.Appointment) error {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) Delete(id uint) error { panic("not implemented in mock") }
func (m *mockAppointmentRepoForCR) List(filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) SaveManagementReport(id uint, consultationType, reportNotes string) error {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*domain.SpecialistReportSummary, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) ExistsByPatientAndDate(patientID uint, specialistID *uint, date time.Time) (bool, error) {
	panic("not implemented in mock")
}
func (m *mockAppointmentRepoForCR) GetActiveBySpecialist(specialistID uint) (*domain.Appointment, error) {
	panic("not implemented in mock")
}

// ---- helper to build a fully-wired service ----

func buildService(
	records *mockClinicalRecordRepo,
	anamneses *mockAnamnesisRepo,
	visualExams *mockVisualExamRepo,
	diagnoses *mockDiagnosisRepo,
	prescriptions *mockPrescriptionRepo,
) *clinicalrecord.Service {
	return clinicalrecord.NewService(
		records,
		anamneses,
		visualExams,
		diagnoses,
		prescriptions,
		&mockAppointmentRepoForCR{},
		zap.NewNop(),
	)
}

// ---- CreateRecord tests ----

func TestCreateRecord_SetsDraftStatus(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	input := clinicalrecord.CreateRecordInput{
		AppointmentID: 1,
		PatientID:     10,
		SpecialistID:  42,
		RecordType:    domain.ClinicalRecordTypeNewConsultation,
	}

	rec, err := svc.CreateRecord(1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if rec.Status != domain.ClinicalRecordStatusDraft {
		t.Errorf("expected status draft, got %s", rec.Status)
	}
	if rec.ID == 0 {
		t.Error("expected non-zero ID after creation")
	}
	if rec.ClinicID != 1 {
		t.Errorf("expected ClinicID=1, got %d", rec.ClinicID)
	}
	if rec.AppointmentID != 1 {
		t.Errorf("expected AppointmentID=1, got %d", rec.AppointmentID)
	}
}

// ---- GetRecord tests ----

func TestGetRecord_Found(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:      1,
		AppointmentID: 5,
		PatientID:     10,
		SpecialistID:  42,
		RecordType:    domain.ClinicalRecordTypeNewConsultation,
		Status:        domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	result, err := svc.GetRecord(1, 5)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.AppointmentID != 5 {
		t.Errorf("expected AppointmentID=5, got %d", result.AppointmentID)
	}
}

func TestGetRecord_WrongClinic(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:      2,
		AppointmentID: 5,
		PatientID:     10,
		SpecialistID:  42,
		RecordType:    domain.ClinicalRecordTypeNewConsultation,
		Status:        domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Clinic 1 requesting a record that belongs to clinic 2 → not found.
	_, err := svc.GetRecord(1, 5)
	if err == nil {
		t.Fatal("expected ErrNotFound for wrong clinic, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

// ---- UpsertAnamnesis tests ----

func TestUpsertAnamnesis_Create(t *testing.T) {
	records := newMockClinicalRecordRepo()
	anamneses := newMockAnamnesisRepo()
	svc := buildService(records, anamneses, newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:     1,
		RecordType:   domain.ClinicalRecordTypeNewConsultation,
		Status:       domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	input := clinicalrecord.AnamnesisInput{
		ChiefComplaint: "blurry vision",
		OcularHistory:  "none",
	}
	result, err := svc.UpsertAnamnesis(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.ChiefComplaint != "blurry vision" {
		t.Errorf("expected chief complaint 'blurry vision', got '%s'", result.ChiefComplaint)
	}
	if result.ClinicalRecordID != r.ID {
		t.Errorf("expected ClinicalRecordID=%d, got %d", r.ID, result.ClinicalRecordID)
	}
}

func TestUpsertAnamnesis_Update(t *testing.T) {
	records := newMockClinicalRecordRepo()
	anamneses := newMockAnamnesisRepo()
	svc := buildService(records, anamneses, newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Create initial anamnesis directly.
	anamneses.byRecordID[r.ID] = &domain.Anamnesis{
		ClinicalRecordID: r.ID,
		ChiefComplaint:   "old complaint",
	}

	// Upsert with new data — should update.
	input := clinicalrecord.AnamnesisInput{
		ChiefComplaint: "new complaint",
	}
	result, err := svc.UpsertAnamnesis(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.ChiefComplaint != "new complaint" {
		t.Errorf("expected updated complaint, got '%s'", result.ChiefComplaint)
	}
}

func TestUpsertAnamnesis_WrongClinic(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:   2,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	_, err := svc.UpsertAnamnesis(r.ID, 1, clinicalrecord.AnamnesisInput{ChiefComplaint: "x"})
	if err == nil {
		t.Fatal("expected error for wrong clinic, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

// ---- UpsertVisualExam tests ----

func TestUpsertVisualExam_Create(t *testing.T) {
	records := newMockClinicalRecordRepo()
	visualExams := newMockVisualExamRepo()
	svc := buildService(records, newMockAnamnesisRepo(), visualExams, newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	input := clinicalrecord.VisualExamInput{
		AVSCDistOD: "20/20",
		AVSCDistOI: "20/25",
	}
	result, err := svc.UpsertVisualExam(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.AVSCDistOD != "20/20" {
		t.Errorf("expected AVSCDistOD=20/20, got '%s'", result.AVSCDistOD)
	}
}

// ---- UpsertDiagnosis tests ----

func TestUpsertDiagnosis_Create(t *testing.T) {
	records := newMockClinicalRecordRepo()
	diagnoses := newMockDiagnosisRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), diagnoses, newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	input := clinicalrecord.DiagnosisInput{
		PrimaryCIE10Code:   "H52.1",
		PrimaryDescription: "Myopia",
		DiagnosisType:      domain.DiagnosisTypeMain,
	}
	result, err := svc.UpsertDiagnosis(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.PrimaryCIE10Code != "H52.1" {
		t.Errorf("expected CIE10 code H52.1, got '%s'", result.PrimaryCIE10Code)
	}
	if result.ClinicalRecordID != r.ID {
		t.Errorf("expected ClinicalRecordID=%d, got %d", r.ID, result.ClinicalRecordID)
	}
}

// ---- UpsertPrescription tests ----

func TestUpsertPrescription_Create(t *testing.T) {
	records := newMockClinicalRecordRepo()
	prescriptions := newMockPrescriptionRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), prescriptions)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	sphere := -1.25
	input := clinicalrecord.PrescriptionInput{
		SphereOD:       &sphere,
		ValidityMonths: 12,
	}
	result, err := svc.UpsertPrescription(r.ID, 1, input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.SphereOD == nil || *result.SphereOD != sphere {
		t.Errorf("expected SphereOD=%v, got %v", sphere, result.SphereOD)
	}
	if result.ValidUntil == nil {
		t.Error("expected ValidUntil to be set when ValidityMonths > 0")
	}
}

// ---- SignAndComplete tests ----

func TestSignAndComplete_Success(t *testing.T) {
	records := newMockClinicalRecordRepo()
	anamneses := newMockAnamnesisRepo()
	visualExams := newMockVisualExamRepo()
	diagnoses := newMockDiagnosisRepo()
	prescriptions := newMockPrescriptionRepo()
	svc := buildService(records, anamneses, visualExams, diagnoses, prescriptions)

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Populate all required steps.
	anamneses.byRecordID[r.ID] = &domain.Anamnesis{ClinicalRecordID: r.ID, ChiefComplaint: "x"}
	visualExams.byRecordID[r.ID] = &domain.VisualExam{ClinicalRecordID: r.ID}
	_ = diagnoses.Create(&domain.ClinicalDiagnosis{
		ClinicalRecordID: r.ID,
		DiagnosisType:    domain.DiagnosisTypeMain,
	})
	prescriptions.byRecordID[r.ID] = &domain.ClinicalPrescription{ClinicalRecordID: r.ID}

	result, err := svc.SignAndComplete(r.ID, 42, "TP-1234")
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
	if result.LegalText != "TP-1234" {
		t.Errorf("expected LegalText=TP-1234, got '%s'", result.LegalText)
	}
}

func TestSignAndComplete_MissingAnamnesis(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// No anamnesis, visual exam, diagnosis, or prescription added.
	_, err := svc.SignAndComplete(r.ID, 42, "TP-1234")
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

func TestSignAndComplete_MissingPrescription(t *testing.T) {
	records := newMockClinicalRecordRepo()
	anamneses := newMockAnamnesisRepo()
	visualExams := newMockVisualExamRepo()
	diagnoses := newMockDiagnosisRepo()
	svc := buildService(records, anamneses, visualExams, diagnoses, newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:   1,
		RecordType: domain.ClinicalRecordTypeNewConsultation,
		Status:     domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	// Populate anamnesis, visual exam, and diagnosis — but NOT prescription.
	anamneses.byRecordID[r.ID] = &domain.Anamnesis{ClinicalRecordID: r.ID, ChiefComplaint: "x"}
	visualExams.byRecordID[r.ID] = &domain.VisualExam{ClinicalRecordID: r.ID}
	_ = diagnoses.Create(&domain.ClinicalDiagnosis{
		ClinicalRecordID: r.ID,
		DiagnosisType:    domain.DiagnosisTypeMain,
	})

	_, err := svc.SignAndComplete(r.ID, 42, "TP-1234")
	if err == nil {
		t.Fatal("expected validation error for missing prescription, got nil")
	}
	var validErr *domain.ErrValidation
	if !errors.As(err, &validErr) {
		t.Errorf("expected *domain.ErrValidation, got %T: %v", err, err)
	}
}

func TestSignAndComplete_RecordNotFound(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	_, err := svc.SignAndComplete(999, 42, "TP-1234")
	if err == nil {
		t.Fatal("expected error for non-existent record, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}

// ---- GetByAppointmentID tests ----

func TestGetByAppointmentID_Found(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	r := &domain.ClinicalRecord{
		ClinicID:      1,
		AppointmentID: 77,
		RecordType:    domain.ClinicalRecordTypeNewConsultation,
		Status:        domain.ClinicalRecordStatusDraft,
	}
	records.add(r)

	result, err := svc.GetByAppointmentID(77)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.AppointmentID != 77 {
		t.Errorf("expected AppointmentID=77, got %d", result.AppointmentID)
	}
}

func TestGetByAppointmentID_NotFound(t *testing.T) {
	records := newMockClinicalRecordRepo()
	svc := buildService(records, newMockAnamnesisRepo(), newMockVisualExamRepo(), newMockDiagnosisRepo(), newMockPrescriptionRepo())

	_, err := svc.GetByAppointmentID(999)
	if err == nil {
		t.Fatal("expected ErrNotFound, got nil")
	}
	var notFound *domain.ErrNotFound
	if !errors.As(err, &notFound) {
		t.Errorf("expected *domain.ErrNotFound, got %T: %v", err, err)
	}
}
