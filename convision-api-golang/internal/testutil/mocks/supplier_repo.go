package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.SupplierRepository = (*MockSupplierRepository)(nil)
var _ domain.PurchaseRepository = (*MockPurchaseRepository)(nil)

type MockSupplierRepository struct {
	mock.Mock
}

func (m *MockSupplierRepository) GetByID(id uint) (*domain.Supplier, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Supplier), args.Error(1)
}

func (m *MockSupplierRepository) Create(s *domain.Supplier) error {
	return m.Called(s).Error(0)
}

func (m *MockSupplierRepository) Update(s *domain.Supplier) error {
	return m.Called(s).Error(0)
}

func (m *MockSupplierRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockSupplierRepository) List(filters map[string]any, page, perPage int) ([]*domain.Supplier, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Supplier), args.Get(1).(int64), args.Error(2)
}

type MockPurchaseRepository struct {
	mock.Mock
}

func (m *MockPurchaseRepository) GetByID(id uint) (*domain.Purchase, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Purchase), args.Error(1)
}

func (m *MockPurchaseRepository) Create(p *domain.Purchase) error {
	return m.Called(p).Error(0)
}

func (m *MockPurchaseRepository) Update(p *domain.Purchase) error {
	return m.Called(p).Error(0)
}

func (m *MockPurchaseRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockPurchaseRepository) List(filters map[string]any, page, perPage int) ([]*domain.Purchase, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Purchase), args.Get(1).(int64), args.Error(2)
}
