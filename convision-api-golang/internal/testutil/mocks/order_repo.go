package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.OrderRepository = (*MockOrderRepository)(nil)

type MockOrderRepository struct {
	mock.Mock
}

func (m *MockOrderRepository) GetByID(db *gorm.DB, id uint) (*domain.Order, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) GetByOrderNumber(db *gorm.DB, number string) (*domain.Order, error) {
	args := m.Called(db, number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) Create(db *gorm.DB, o *domain.Order) error {
	return m.Called(db, o).Error(0)
}

func (m *MockOrderRepository) Update(db *gorm.DB, o *domain.Order) error {
	return m.Called(db, o).Error(0)
}

func (m *MockOrderRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockOrderRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Order, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Order), args.Get(1).(int64), args.Error(2)
}
