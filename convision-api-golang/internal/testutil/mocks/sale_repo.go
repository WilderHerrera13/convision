package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.SaleRepository = (*MockSaleRepository)(nil)
var _ domain.SaleLensPriceAdjustmentRepository = (*MockSaleLensPriceAdjustmentRepository)(nil)

type MockSaleRepository struct {
	mock.Mock
}

func (m *MockSaleRepository) GetByID(id uint) (*domain.Sale, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Sale), args.Error(1)
}

func (m *MockSaleRepository) GetBySaleNumber(number string) (*domain.Sale, error) {
	args := m.Called(number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Sale), args.Error(1)
}

func (m *MockSaleRepository) Create(s *domain.Sale) error {
	return m.Called(s).Error(0)
}

func (m *MockSaleRepository) Update(s *domain.Sale) error {
	return m.Called(s).Error(0)
}

func (m *MockSaleRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockSaleRepository) List(filters map[string]any, page, perPage int) ([]*domain.Sale, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Sale), args.Get(1).(int64), args.Error(2)
}

func (m *MockSaleRepository) AddPayment(payment *domain.SalePayment) error {
	return m.Called(payment).Error(0)
}

func (m *MockSaleRepository) RemovePayment(saleID, paymentID uint) error {
	return m.Called(saleID, paymentID).Error(0)
}

func (m *MockSaleRepository) GetStats() (map[string]any, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]any), args.Error(1)
}

func (m *MockSaleRepository) GetTodayStats() (map[string]any, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]any), args.Error(1)
}

type MockSaleLensPriceAdjustmentRepository struct {
	mock.Mock
}

func (m *MockSaleLensPriceAdjustmentRepository) GetBySaleID(saleID uint) ([]*domain.SaleLensPriceAdjustment, error) {
	args := m.Called(saleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.SaleLensPriceAdjustment), args.Error(1)
}

func (m *MockSaleLensPriceAdjustmentRepository) GetByID(id uint) (*domain.SaleLensPriceAdjustment, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SaleLensPriceAdjustment), args.Error(1)
}

func (m *MockSaleLensPriceAdjustmentRepository) Create(adj *domain.SaleLensPriceAdjustment) error {
	return m.Called(adj).Error(0)
}

func (m *MockSaleLensPriceAdjustmentRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockSaleLensPriceAdjustmentRepository) GetBySaleLens(saleID, lensID uint) (*domain.SaleLensPriceAdjustment, error) {
	args := m.Called(saleID, lensID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SaleLensPriceAdjustment), args.Error(1)
}
