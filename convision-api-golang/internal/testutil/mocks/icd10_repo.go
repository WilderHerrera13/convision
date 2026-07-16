package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.Icd10CodeRepository = (*MockIcd10CodeRepository)(nil)

type MockIcd10CodeRepository struct {
	mock.Mock
}

func (m *MockIcd10CodeRepository) List(db *gorm.DB, f domain.Icd10CodeFilter) ([]*domain.Icd10Code, int64, error) {
	args := m.Called(db, f)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Icd10Code), args.Get(1).(int64), args.Error(2)
}

func (m *MockIcd10CodeRepository) GetByCode(db *gorm.DB, code string) (*domain.Icd10Code, error) {
	args := m.Called(db, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Icd10Code), args.Error(1)
}
