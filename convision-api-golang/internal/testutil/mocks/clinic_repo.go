package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.ClinicalHistoryRepository = (*MockClinicalHistoryRepository)(nil)
var _ domain.ClinicalEvolutionRepository = (*MockClinicalEvolutionRepository)(nil)

type MockClinicalHistoryRepository struct {
	mock.Mock
}

func (m *MockClinicalHistoryRepository) GetByID(id uint) (*domain.ClinicalHistory, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalHistory), args.Error(1)
}

func (m *MockClinicalHistoryRepository) GetByPatientID(patientID uint, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	args := m.Called(patientID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ClinicalHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockClinicalHistoryRepository) GetSingleByPatientID(patientID uint) (*domain.ClinicalHistory, error) {
	args := m.Called(patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalHistory), args.Error(1)
}

func (m *MockClinicalHistoryRepository) List(filters map[string]any, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ClinicalHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockClinicalHistoryRepository) Create(h *domain.ClinicalHistory) error {
	return m.Called(h).Error(0)
}

func (m *MockClinicalHistoryRepository) Update(h *domain.ClinicalHistory) error {
	return m.Called(h).Error(0)
}

func (m *MockClinicalHistoryRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

type MockClinicalEvolutionRepository struct {
	mock.Mock
}

func (m *MockClinicalEvolutionRepository) GetByID(id uint) (*domain.ClinicalEvolution, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalEvolution), args.Error(1)
}

func (m *MockClinicalEvolutionRepository) GetByClinicalHistoryID(historyID uint, page, perPage int) ([]*domain.ClinicalEvolution, int64, error) {
	args := m.Called(historyID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ClinicalEvolution), args.Get(1).(int64), args.Error(2)
}

func (m *MockClinicalEvolutionRepository) Create(e *domain.ClinicalEvolution) error {
	return m.Called(e).Error(0)
}

func (m *MockClinicalEvolutionRepository) Update(e *domain.ClinicalEvolution) error {
	return m.Called(e).Error(0)
}

func (m *MockClinicalEvolutionRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}
