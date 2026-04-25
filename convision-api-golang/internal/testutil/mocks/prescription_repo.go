package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.PrescriptionRepository = (*MockPrescriptionRepository)(nil)

type MockPrescriptionRepository struct {
	mock.Mock
}

func (m *MockPrescriptionRepository) GetByID(id uint) (*domain.Prescription, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Prescription), args.Error(1)
}

func (m *MockPrescriptionRepository) GetByAppointmentID(appointmentID uint) (*domain.Prescription, error) {
	args := m.Called(appointmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Prescription), args.Error(1)
}

func (m *MockPrescriptionRepository) List(filters map[string]any, page, perPage int) ([]*domain.Prescription, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Prescription), args.Get(1).(int64), args.Error(2)
}

func (m *MockPrescriptionRepository) ListByPatientID(patientID uint, page, perPage int) ([]*domain.Prescription, int64, error) {
	args := m.Called(patientID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Prescription), args.Get(1).(int64), args.Error(2)
}

func (m *MockPrescriptionRepository) Create(p *domain.Prescription) error {
	return m.Called(p).Error(0)
}

func (m *MockPrescriptionRepository) Update(p *domain.Prescription) error {
	return m.Called(p).Error(0)
}

func (m *MockPrescriptionRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}
