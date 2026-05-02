package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.ClinicalHistoryRepository = (*MockClinicalHistoryRepository)(nil)
var _ domain.ClinicalEvolutionRepository = (*MockClinicalEvolutionRepository)(nil)

type MockClinicalHistoryRepository struct {
	mock.Mock
}

func (m *MockClinicalHistoryRepository) GetByID(db *gorm.DB, id uint) (*domain.ClinicalHistory, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalHistory), args.Error(1)
}

func (m *MockClinicalHistoryRepository) GetByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	args := m.Called(db, patientID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ClinicalHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockClinicalHistoryRepository) GetSingleByPatientID(db *gorm.DB, patientID uint) (*domain.ClinicalHistory, error) {
	args := m.Called(db, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalHistory), args.Error(1)
}

func (m *MockClinicalHistoryRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ClinicalHistory), args.Get(1).(int64), args.Error(2)
}

func (m *MockClinicalHistoryRepository) Create(db *gorm.DB, h *domain.ClinicalHistory) error {
	return m.Called(db, h).Error(0)
}

func (m *MockClinicalHistoryRepository) Update(db *gorm.DB, h *domain.ClinicalHistory) error {
	return m.Called(db, h).Error(0)
}

func (m *MockClinicalHistoryRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

type MockClinicalEvolutionRepository struct {
	mock.Mock
}

func (m *MockClinicalEvolutionRepository) GetByID(db *gorm.DB, id uint) (*domain.ClinicalEvolution, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ClinicalEvolution), args.Error(1)
}

func (m *MockClinicalEvolutionRepository) GetByClinicalHistoryID(db *gorm.DB, historyID uint, page, perPage int) ([]*domain.ClinicalEvolution, int64, error) {
	args := m.Called(db, historyID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ClinicalEvolution), args.Get(1).(int64), args.Error(2)
}

func (m *MockClinicalEvolutionRepository) Create(db *gorm.DB, e *domain.ClinicalEvolution) error {
	return m.Called(db, e).Error(0)
}

func (m *MockClinicalEvolutionRepository) Update(db *gorm.DB, e *domain.ClinicalEvolution) error {
	return m.Called(db, e).Error(0)
}

func (m *MockClinicalEvolutionRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}
