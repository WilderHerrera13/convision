package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.SupplierRepository = (*MockSupplierRepository)(nil)
var _ domain.PurchaseRepository = (*MockPurchaseRepository)(nil)

type MockSupplierRepository struct {
	mock.Mock
}

func (m *MockSupplierRepository) GetByID(db *gorm.DB, id uint) (*domain.Supplier, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepository) Create(db *gorm.DB, s *domain.Supplier) error {
	return m.Called(db, s).Error(0)
}

func (m *MockSupplierRepository) Update(db *gorm.DB, s *domain.Supplier) error {
	return m.Called(db, s).Error(0)
}

func (m *MockSupplierRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockSupplierRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Supplier, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Supplier), args.Get(1).(int64), args.Error(2)
}

type MockPurchaseRepository struct {
	mock.Mock
}

func (m *MockPurchaseRepository) GetByID(db *gorm.DB, id uint) (*domain.Purchase, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Purchase), args.Error(1)
}

func (m *MockPurchaseRepository) Create(db *gorm.DB, p *domain.Purchase) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPurchaseRepository) Update(db *gorm.DB, p *domain.Purchase) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPurchaseRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockPurchaseRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Purchase, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Purchase), args.Get(1).(int64), args.Error(2)
}
