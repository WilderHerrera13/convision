package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.RipsRecordRepository = (*MockRipsRecordRepository)(nil)

type MockRipsRecordRepository struct {
	mock.Mock
}

func (m *MockRipsRecordRepository) GetByID(db *gorm.DB, id uint) (*domain.RipsRecord, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.RipsRecord), args.Error(1)
}

func (m *MockRipsRecordRepository) GetByClinicalRecordID(db *gorm.DB, clinicalRecordID uint) (*domain.RipsRecord, error) {
	args := m.Called(db, clinicalRecordID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.RipsRecord), args.Error(1)
}

func (m *MockRipsRecordRepository) Create(db *gorm.DB, r *domain.RipsRecord) error {
	return m.Called(db, r).Error(0)
}

func (m *MockRipsRecordRepository) Update(db *gorm.DB, r *domain.RipsRecord) error {
	return m.Called(db, r).Error(0)
}

func (m *MockRipsRecordRepository) List(db *gorm.DB, f domain.RipsRecordFilter) ([]*domain.RipsRecord, int64, error) {
	args := m.Called(db, f)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.RipsRecord), args.Get(1).(int64), args.Error(2)
}
