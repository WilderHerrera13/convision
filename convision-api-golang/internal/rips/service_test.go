package rips_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap/zaptest"

	"github.com/convision/api/internal/domain"
	platformrips "github.com/convision/api/internal/platform/rips"
	"github.com/convision/api/internal/rips"
	"github.com/convision/api/internal/testutil/mocks"
)

func signedRecordFixture() *domain.ClinicalRecord {
	return &domain.ClinicalRecord{
		ID:            10,
		AppointmentID: 20,
		PatientID:     30,
		SpecialistID:  40,
		Status:        "signed",
		UpdatedAt:     time.Date(2026, 7, 13, 14, 30, 0, 0, time.UTC),
		Diagnosis: &domain.Diagnosis{
			ClinicalRecordID: 10,
			PrimaryCode:      "H520",
			DiagnosisType:    1,
		},
	}
}

func patientFixture() *domain.Patient {
	birth := time.Date(1990, 5, 10, 0, 0, 0, 0, time.UTC)
	return &domain.Patient{
		ID:                   30,
		FirstName:            "Ana",
		LastName:             "Gómez",
		Identification:       "1010101010",
		IdentificationTypeID: uintPtr(1),
		IdentificationType:   &domain.IdentificationType{Code: "CC"},
		BirthDate:            &birth,
		Gender:               "female",
		City:                 &domain.City{Code: "11001"},
	}
}

func uintPtr(v uint) *uint { return &v }

func newTestService(t *testing.T,
	clinicalRecordRepo *mocks.MockClinicalRecordRepository,
	patientRepo *mocks.MockPatientRepository,
	userRepo *mocks.MockUserRepository,
	icd10Repo *mocks.MockIcd10CodeRepository,
	ripsRepo *mocks.MockRipsRecordRepository,
) *rips.Service {
	t.Setenv("RIPS_PROVIDER_CODE", "1234567890")
	t.Setenv("RIPS_PROVIDER_NIT", "900123456")
	t.Setenv("RIPS_TRANSMISSION_MODE", "none")
	logger := zaptest.NewLogger(t)
	transmitter := platformrips.NewFromEnv(logger)
	return rips.NewService(clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo, transmitter, logger)
}

func TestBuildForAppointment_FirstVisit_UsesDiagnosticoAndPrimeraVez(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)
	ripsRepo.On("GetByClinicalRecordID", mock.Anything, uint(10)).Return(nil, &domain.ErrNotFound{Resource: "rips_record"})
	patientRepo.On("GetByID", mock.Anything, uint(30)).Return(patientFixture(), nil)
	icd10Repo.On("GetByCode", mock.Anything, "H520").Return(&domain.Icd10Code{Code: "H520"}, nil)
	clinicalRecordRepo.On("ListSignedByPatientID", mock.Anything, uint(30), 1, 2).
		Return([]*domain.ClinicalRecord{rec}, int64(1), nil)
	userRepo.On("GetByID", mock.Anything, uint(40)).Return(&domain.User{ID: 40, Identification: "5550001"}, nil)

	var created *domain.RipsRecord
	ripsRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.RipsRecord")).
		Run(func(args mock.Arguments) {
			created = args.Get(1).(*domain.RipsRecord)
			created.ID = 99
		}).
		Return(nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	out, err := svc.BuildForAppointment(nil, 20)
	assert.NoError(t, err)
	assert.Equal(t, domain.RipsStatusPendingInvoice, out.Status)

	var txn map[string]any
	assert.NoError(t, json.Unmarshal([]byte(out.Payload), &txn))
	usuarios := txn["usuarios"].([]any)
	assert.Len(t, usuarios, 1)
	usuario := usuarios[0].(map[string]any)
	assert.Equal(t, "CC", usuario["tipoDocumentoIdentificacion"])
	assert.Equal(t, "1010101010", usuario["numDocumentoIdentificacion"])
	assert.Equal(t, "F", usuario["codSexo"])
	assert.Equal(t, "11001", usuario["codMunicipioResidencia"])

	servicios := usuario["servicios"].(map[string]any)
	consultas := servicios["consultas"].([]any)
	assert.Len(t, consultas, 1)
	consulta := consultas[0].(map[string]any)
	assert.Equal(t, "890207", consulta["codConsulta"], "first visit must use CUPS 'primera vez'")
	assert.Equal(t, "15", consulta["finalidadTecnologiaSalud"], "first visit must map to DIAGNOSTICO")
	assert.Equal(t, "38", consulta["causaMotivoAtencion"])
	assert.Equal(t, "H520", consulta["codDiagnosticoPrincipal"])
	assert.Equal(t, "01", consulta["tipoDiagnosticoPrincipal"])
}

func TestBuildForAppointment_FollowUpVisit_UsesTratamientoAndControl(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	priorRec := &domain.ClinicalRecord{ID: 5, PatientID: 30}
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)
	ripsRepo.On("GetByClinicalRecordID", mock.Anything, uint(10)).Return(nil, &domain.ErrNotFound{Resource: "rips_record"})
	patientRepo.On("GetByID", mock.Anything, uint(30)).Return(patientFixture(), nil)
	icd10Repo.On("GetByCode", mock.Anything, "H520").Return(&domain.Icd10Code{Code: "H520"}, nil)
	// Two signed records exist for this patient — this is a follow-up.
	clinicalRecordRepo.On("ListSignedByPatientID", mock.Anything, uint(30), 1, 2).
		Return([]*domain.ClinicalRecord{rec, priorRec}, int64(2), nil)
	userRepo.On("GetByID", mock.Anything, uint(40)).Return(&domain.User{ID: 40, Identification: "5550001"}, nil)
	ripsRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.RipsRecord")).Return(nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	out, err := svc.BuildForAppointment(nil, 20)
	assert.NoError(t, err)

	var txn map[string]any
	assert.NoError(t, json.Unmarshal([]byte(out.Payload), &txn))
	usuario := txn["usuarios"].([]any)[0].(map[string]any)
	consulta := usuario["servicios"].(map[string]any)["consultas"].([]any)[0].(map[string]any)
	assert.Equal(t, "890307", consulta["codConsulta"], "follow-up must use CUPS 'control'")
	assert.Equal(t, "16", consulta["finalidadTecnologiaSalud"], "follow-up must map to TRATAMIENTO")
}

func TestBuildForAppointment_RejectsUnsignedRecord(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	rec.Status = "in_progress"
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	_, err := svc.BuildForAppointment(nil, 20)
	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
	ripsRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestBuildForAppointment_RejectsMissingDiagnosis(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	rec.Diagnosis = nil
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	_, err := svc.BuildForAppointment(nil, 20)
	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
}

func TestBuildForAppointment_RejectsUnknownDiagnosisCode(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)
	ripsRepo.On("GetByClinicalRecordID", mock.Anything, uint(10)).Return(nil, &domain.ErrNotFound{Resource: "rips_record"})
	patientRepo.On("GetByID", mock.Anything, uint(30)).Return(patientFixture(), nil)
	icd10Repo.On("GetByCode", mock.Anything, "H520").Return(nil, &domain.ErrNotFound{Resource: "icd10_code"})

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	_, err := svc.BuildForAppointment(nil, 20)
	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
	ripsRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestBuildForAppointment_Idempotent_ReturnsExistingRecord(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)
	existing := &domain.RipsRecord{ID: 77, ClinicalRecordID: 10, Status: domain.RipsStatusPendingInvoice}
	ripsRepo.On("GetByClinicalRecordID", mock.Anything, uint(10)).Return(existing, nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	out, err := svc.BuildForAppointment(nil, 20)
	assert.NoError(t, err)
	assert.Equal(t, uint(77), out.ID)
	ripsRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	patientRepo.AssertNotCalled(t, "GetByID", mock.Anything, mock.Anything)
}

func TestBuildForAppointment_RejectsPatientMissingDocument(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	rec := signedRecordFixture()
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(20)).Return(rec, nil)
	ripsRepo.On("GetByClinicalRecordID", mock.Anything, uint(10)).Return(nil, &domain.ErrNotFound{Resource: "rips_record"})
	icd10Repo.On("GetByCode", mock.Anything, "H520").Return(&domain.Icd10Code{Code: "H520"}, nil)

	incompletePatient := patientFixture()
	incompletePatient.Identification = "" // never fabricate a document number
	patientRepo.On("GetByID", mock.Anything, uint(30)).Return(incompletePatient, nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	_, err := svc.BuildForAppointment(nil, 20)
	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
	ripsRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestAttachInvoice_UpdatesPayloadAndStatus(t *testing.T) {
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	patientRepo := new(mocks.MockPatientRepository)
	userRepo := new(mocks.MockUserRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	ripsRepo := new(mocks.MockRipsRecordRepository)

	original := Transaction(t)
	rec := &domain.RipsRecord{ID: 1, Payload: original, Status: domain.RipsStatusPendingInvoice, TransmissionMode: "none"}
	ripsRepo.On("GetByID", mock.Anything, uint(1)).Return(rec, nil)
	ripsRepo.On("Update", mock.Anything, mock.AnythingOfType("*domain.RipsRecord")).Return(nil)

	svc := newTestService(t, clinicalRecordRepo, patientRepo, userRepo, icd10Repo, ripsRepo)

	out, err := svc.AttachInvoice(nil, 1, "FEV-000123")
	assert.NoError(t, err)
	assert.Equal(t, "FEV-000123", *out.InvoiceNumber)

	var txn map[string]any
	assert.NoError(t, json.Unmarshal([]byte(out.Payload), &txn))
	assert.Equal(t, "FEV-000123", txn["numFactura"])
}

// Transaction returns a minimal valid stored payload for AttachInvoice tests.
func Transaction(t *testing.T) string {
	t.Helper()
	return `{"numDocumentoIdObligado":"900123456","numFactura":null,"tipoNota":null,"numNota":null,"usuarios":[]}`
}
