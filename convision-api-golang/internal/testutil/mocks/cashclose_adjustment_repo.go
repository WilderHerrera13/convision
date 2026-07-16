package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.CashRegisterCloseAdjustmentRepository = (*MockCashRegisterCloseAdjustmentRepository)(nil)

type MockCashRegisterCloseAdjustmentRepository struct {
	mock.Mock
}

func (m *MockCashRegisterCloseAdjustmentRepository) GetByID(db *gorm.DB, id uint) (*domain.CashRegisterCloseAdjustment, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashRegisterCloseAdjustment), args.Error(1)
}

func (m *MockCashRegisterCloseAdjustmentRepository) ListByCloseID(db *gorm.DB, closeID uint) ([]*domain.CashRegisterCloseAdjustment, error) {
	args := m.Called(db, closeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashRegisterCloseAdjustment), args.Error(1)
}

func (m *MockCashRegisterCloseAdjustmentRepository) List(db *gorm.DB, f domain.CashRegisterCloseAdjustmentFilter) ([]*domain.CashRegisterCloseAdjustment, int64, error) {
	args := m.Called(db, f)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.CashRegisterCloseAdjustment), args.Get(1).(int64), args.Error(2)
}

func (m *MockCashRegisterCloseAdjustmentRepository) CountByAdvisor(db *gorm.DB, advisorUserID uint) (int64, error) {
	args := m.Called(db, advisorUserID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCashRegisterCloseAdjustmentRepository) Acknowledge(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}
