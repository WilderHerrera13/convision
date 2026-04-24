package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.OrderRepository = (*MockOrderRepository)(nil)

type MockOrderRepository struct {
	mock.Mock
}

func (m *MockOrderRepository) GetByID(id uint) (*domain.Order, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) GetByOrderNumber(number string) (*domain.Order, error) {
	args := m.Called(number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderRepository) Create(o *domain.Order) error {
	return m.Called(o).Error(0)
}

func (m *MockOrderRepository) Update(o *domain.Order) error {
	return m.Called(o).Error(0)
}

func (m *MockOrderRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockOrderRepository) List(filters map[string]any, page, perPage int) ([]*domain.Order, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Order), args.Get(1).(int64), args.Error(2)
}
