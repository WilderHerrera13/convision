package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.PrescriptionRepository = (*MockPrescriptionRepository)(nil)

type MockPrescriptionRepository struct {
	mock.Mock
}

func (m *MockPrescriptionRepository) GetByID(db *gorm.DB, id uint) (*domain.Prescription, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Prescription), args.Error(1)
}

func (m *MockPrescriptionRepository) GetByAppointmentID(db *gorm.DB, appointmentID uint) (*domain.Prescription, error) {
	args := m.Called(db, appointmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Prescription), args.Error(1)
}

func (m *MockPrescriptionRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Prescription, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Prescription), args.Get(1).(int64), args.Error(2)
}

func (m *MockPrescriptionRepository) ListByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.Prescription, int64, error) {
	args := m.Called(db, patientID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Prescription), args.Get(1).(int64), args.Error(2)
}

func (m *MockPrescriptionRepository) Create(db *gorm.DB, p *domain.Prescription) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPrescriptionRepository) Update(db *gorm.DB, p *domain.Prescription) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPrescriptionRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}
