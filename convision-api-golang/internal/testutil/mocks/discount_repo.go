package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.DiscountRepository = (*MockDiscountRepository)(nil)

type MockDiscountRepository struct {
	mock.Mock
}

func (m *MockDiscountRepository) GetByID(db *gorm.DB, id uint) (*domain.DiscountRequest, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) GetActiveForProduct(db *gorm.DB, productID uint) ([]*domain.DiscountRequest, error) {
	args := m.Called(db, productID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) GetActiveForProductWithPatient(db *gorm.DB, productID uint, patientID *uint) ([]*domain.DiscountRequest, error) {
	args := m.Called(db, productID, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) GetBestForProduct(db *gorm.DB, productID uint, patientID *uint) (*domain.DiscountRequest, error) {
	args := m.Called(db, productID, patientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DiscountRequest), args.Error(1)
}

func (m *MockDiscountRepository) Create(db *gorm.DB, d *domain.DiscountRequest) error {
	return m.Called(db, d).Error(0)
}

func (m *MockDiscountRepository) Update(db *gorm.DB, d *domain.DiscountRequest) error {
	return m.Called(db, d).Error(0)
}

func (m *MockDiscountRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockDiscountRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.DiscountRequest, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.DiscountRequest), args.Get(1).(int64), args.Error(2)
}
