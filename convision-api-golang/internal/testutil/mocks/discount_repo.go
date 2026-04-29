package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.DiscountRepository = (*MockDiscountRepository)(nil)

type MockDiscountRepository struct {
	mock.Mock
}

func (m *MockDiscountRepository) GetByID(id uint) (*domain.DiscountRequest, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) GetActiveForProduct(productID uint) ([]*domain.DiscountRequest, error) {
	args := m.Called(productID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) GetActiveForProductWithPatient(productID uint, patientID *uint) ([]*domain.DiscountRequest, error) {
	args := m.Called(productID, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) GetBestForProduct(productID uint, patientID *uint) (*domain.DiscountRequest, error) {
	args := m.Called(productID, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) Create(d *domain.DiscountRequest) error {
	return m.Called(d).Error(0)
}

func (m *MockDiscountRepository) Update(d *domain.DiscountRequest) error {
	return m.Called(d).Error(0)
}

func (m *MockDiscountRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockDiscountRepository) List(filters map[string]any, page, perPage int) ([]*domain.DiscountRequest, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.DiscountRequest), args.Get(1).(int64), args.Error(2)
}
