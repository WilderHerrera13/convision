package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.PatientRepository = (*MockPatientRepository)(nil)

type MockPatientRepository struct {
	mock.Mock
}

func (m *MockPatientRepository) GetByID(db *gorm.DB, id uint) (*domain.Patient, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Patient), args.Error(1)
}

func (m *MockPatientRepository) GetByIdentification(db *gorm.DB, doc string) (*domain.Patient, error) {
	args := m.Called(db, doc)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Patient), args.Error(1)
}

func (m *MockPatientRepository) Create(db *gorm.DB, p *domain.Patient) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPatientRepository) Update(db *gorm.DB, p *domain.Patient) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPatientRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockPatientRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Patient, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Patient), args.Get(1).(int64), args.Error(2)
}
