package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.CashRegisterCloseRepository = (*MockCashRegisterCloseRepository)(nil)

type MockCashRegisterCloseRepository struct {
	mock.Mock
}

func (m *MockCashRegisterCloseRepository) GetByID(id uint) (*domain.CashRegisterClose, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) GetByUserAndDate(userID uint, date string) (*domain.CashRegisterClose, error) {
	args := m.Called(userID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) List(filters map[string]any, page, perPage int) ([]*domain.CashRegisterClose, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.CashRegisterClose), args.Get(1).(int64), args.Error(2)
}

func (m *MockCashRegisterCloseRepository) ListByStatuses(statuses []domain.CashRegisterCloseStatus) ([]*domain.CashRegisterClose, error) {
	args := m.Called(statuses)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) ListByUserAndDateRange(userID uint, from, to string) ([]*domain.CashRegisterClose, error) {
	args := m.Called(userID, from, to)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CashRegisterClose), args.Error(1)
}

func (m *MockCashRegisterCloseRepository) Create(c *domain.CashRegisterClose, payments []domain.CashRegisterClosePayment, denoms []domain.CashCountDenomination) error {
	return m.Called(c, payments, denoms).Error(0)
}

func (m *MockCashRegisterCloseRepository) Update(c *domain.CashRegisterClose, payments *[]domain.CashRegisterClosePayment, denoms *[]domain.CashCountDenomination) error {
	return m.Called(c, payments, denoms).Error(0)
}

func (m *MockCashRegisterCloseRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockCashRegisterCloseRepository) SyncActualPayments(closeID uint, payments []domain.CashRegisterCloseActualPayment) error {
	return m.Called(closeID, payments).Error(0)
}
