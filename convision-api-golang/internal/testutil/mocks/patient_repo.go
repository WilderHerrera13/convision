package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.PatientRepository = (*MockPatientRepository)(nil)

type MockPatientRepository struct {
	mock.Mock
}

func (m *MockPatientRepository) GetByID(id uint) (*domain.Patient, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Patient), args.Error(1)
}

func (m *MockPatientRepository) GetByIdentification(doc string) (*domain.Patient, error) {
	args := m.Called(doc)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Patient), args.Error(1)
}

func (m *MockPatientRepository) Create(p *domain.Patient) error {
	return m.Called(p).Error(0)
}

func (m *MockPatientRepository) Update(p *domain.Patient) error {
	return m.Called(p).Error(0)
}

func (m *MockPatientRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockPatientRepository) List(filters map[string]any, page, perPage int) ([]*domain.Patient, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Patient), args.Get(1).(int64), args.Error(2)
}
