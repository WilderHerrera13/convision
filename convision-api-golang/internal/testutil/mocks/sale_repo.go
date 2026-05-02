package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.SaleRepository = (*MockSaleRepository)(nil)
var _ domain.SaleLensPriceAdjustmentRepository = (*MockSaleLensPriceAdjustmentRepository)(nil)

type MockSaleRepository struct {
	mock.Mock
}

func (m *MockSaleRepository) GetByID(db *gorm.DB, id uint) (*domain.Sale, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Sale), args.Error(1)
}

func (m *MockSaleRepository) GetBySaleNumber(db *gorm.DB, number string) (*domain.Sale, error) {
	args := m.Called(db, number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Sale), args.Error(1)
}

func (m *MockSaleRepository) Create(db *gorm.DB, s *domain.Sale) error {
	return m.Called(db, s).Error(0)
}

func (m *MockSaleRepository) Update(db *gorm.DB, s *domain.Sale) error {
	return m.Called(db, s).Error(0)
}

func (m *MockSaleRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockSaleRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Sale, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Sale), args.Get(1).(int64), args.Error(2)
}

func (m *MockSaleRepository) AddPayment(db *gorm.DB, payment *domain.SalePayment) error {
	return m.Called(db, payment).Error(0)
}

func (m *MockSaleRepository) RemovePayment(db *gorm.DB, saleID, paymentID uint) error {
	return m.Called(db, saleID, paymentID).Error(0)
}

func (m *MockSaleRepository) GetStats(db *gorm.DB) (map[string]any, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]any), args.Error(1)
}

func (m *MockSaleRepository) GetTodayStats(db *gorm.DB) (map[string]any, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]any), args.Error(1)
}

type MockSaleLensPriceAdjustmentRepository struct {
	mock.Mock
}

func (m *MockSaleLensPriceAdjustmentRepository) GetBySaleID(db *gorm.DB, saleID uint) ([]*domain.SaleLensPriceAdjustment, error) {
	args := m.Called(db, saleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.SaleLensPriceAdjustment), args.Error(1)
}

func (m *MockSaleLensPriceAdjustmentRepository) GetByID(db *gorm.DB, id uint) (*domain.SaleLensPriceAdjustment, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SaleLensPriceAdjustment), args.Error(1)
}

func (m *MockSaleLensPriceAdjustmentRepository) Create(db *gorm.DB, adj *domain.SaleLensPriceAdjustment) error {
	return m.Called(db, adj).Error(0)
}

func (m *MockSaleLensPriceAdjustmentRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockSaleLensPriceAdjustmentRepository) GetBySaleLens(db *gorm.DB, saleID, lensID uint) (*domain.SaleLensPriceAdjustment, error) {
	args := m.Called(db, saleID, lensID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SaleLensPriceAdjustment), args.Error(1)
}
