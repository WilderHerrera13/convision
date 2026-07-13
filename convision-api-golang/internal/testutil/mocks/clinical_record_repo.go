package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.ClinicalRecordRepository = (*MockClinicalRecordRepository)(nil)

type MockClinicalRecordRepository struct {
	mock.Mock
}

func (m *MockClinicalRecordRepository) GetByAppointmentID(db *gorm.DB, appointmentID uint) (*domain.ClinicalRecord, error) {
	args := m.Called(db, appointmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalRecord), args.Error(1)
}

func (m *MockClinicalRecordRepository) GetLatestSignedByPatientID(db *gorm.DB, patientID uint) (*domain.ClinicalRecord, error) {
	args := m.Called(db, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalRecord), args.Error(1)
}

func (m *MockClinicalRecordRepository) Create(db *gorm.DB, r *domain.ClinicalRecord) error {
	return m.Called(db, r).Error(0)
}

func (m *MockClinicalRecordRepository) UpsertAnamnesis(db *gorm.DB, clinicalRecordID uint, branchID uint, a *domain.Anamnesis) error {
	return m.Called(db, clinicalRecordID, branchID, a).Error(0)
}

func (m *MockClinicalRecordRepository) UpsertVisualExam(db *gorm.DB, clinicalRecordID uint, branchID uint, v *domain.VisualExam) error {
	return m.Called(db, clinicalRecordID, branchID, v).Error(0)
}

func (m *MockClinicalRecordRepository) UpsertDiagnosis(db *gorm.DB, clinicalRecordID uint, branchID uint, d *domain.Diagnosis) error {
	return m.Called(db, clinicalRecordID, branchID, d).Error(0)
}

func (m *MockClinicalRecordRepository) UpsertPrescription(db *gorm.DB, clinicalRecordID uint, branchID uint, p *domain.ClinicalPrescription) error {
	return m.Called(db, clinicalRecordID, branchID, p).Error(0)
}

func (m *MockClinicalRecordRepository) SignClinicalRecord(db *gorm.DB, clinicalRecordID uint, professionalTp string) error {
	return m.Called(db, clinicalRecordID, professionalTp).Error(0)
}
