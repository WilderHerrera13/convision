package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.CashRegisterCloseRepository = (*MockCashRegisterCloseRepository)(nil)

type MockCashRegisterCloseRepository struct {
	mock.Mock
}

func (m *MockCashRegisterCloseRepository) GetByID(db *gorm.DB, id uint) (*domain.CashRegisterClose, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) GetByUserAndDate(db *gorm.DB, userID uint, date string) (*domain.CashRegisterClose, error) {
	args := m.Called(db, userID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.CashRegisterClose, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.CashRegisterClose), args.Get(1).(int64), args.Error(2)
}

func (m *MockCashRegisterCloseRepository) ListByStatuses(db *gorm.DB, statuses []domain.CashRegisterCloseStatus, branchID uint) ([]*domain.CashRegisterClose, error) {
	args := m.Called(db, statuses, branchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) ListByUserAndDateRange(db *gorm.DB, userID uint, branchID uint, from, to string) ([]*domain.CashRegisterClose, error) {
	args := m.Called(db, userID, branchID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) Create(db *gorm.DB, c *domain.CashRegisterClose, payments []domain.CashRegisterClosePayment, denoms []domain.CashCountDenomination) error {
	return m.Called(db, c, payments, denoms).Error(0)
}

func (m *MockCashRegisterCloseRepository) Update(db *gorm.DB, c *domain.CashRegisterClose, payments *[]domain.CashRegisterClosePayment, denoms *[]domain.CashCountDenomination) error {
	return m.Called(db, c, payments, denoms).Error(0)
}

func (m *MockCashRegisterCloseRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockCashRegisterCloseRepository) SyncActualPayments(db *gorm.DB, closeID uint, payments []domain.CashRegisterCloseActualPayment) error {
	return m.Called(db, closeID, payments).Error(0)
}
