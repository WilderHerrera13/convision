package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.LaboratoryRepository = (*MockLaboratoryRepository)(nil)
var _ domain.LaboratoryOrderRepository = (*MockLaboratoryOrderRepository)(nil)

type MockLaboratoryRepository struct {
	mock.Mock
}

func (m *MockLaboratoryRepository) GetByID(id uint) (*domain.Laboratory, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Laboratory), args.Error(1)
}

func (m *MockLaboratoryRepository) Create(l *domain.Laboratory) error {
	return m.Called(l).Error(0)
}

func (m *MockLaboratoryRepository) Update(l *domain.Laboratory) error {
	return m.Called(l).Error(0)
}

func (m *MockLaboratoryRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockLaboratoryRepository) List(filters map[string]any, page, perPage int) ([]*domain.Laboratory, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Laboratory), args.Get(1).(int64), args.Error(2)
}

func (m *MockLaboratoryRepository) GetFirstActive() (*domain.Laboratory, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Laboratory), args.Error(1)
}

type MockLaboratoryOrderRepository struct {
	mock.Mock
}

func (m *MockLaboratoryOrderRepository) GetByID(id uint) (*domain.LaboratoryOrder, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.LaboratoryOrder), args.Error(1)
}

func (m *MockLaboratoryOrderRepository) GetByOrderNumber(number string) (*domain.LaboratoryOrder, error) {
	args := m.Called(number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.LaboratoryOrder), args.Error(1)
}

func (m *MockLaboratoryOrderRepository) GetBySaleID(saleID uint) (*domain.LaboratoryOrder, error) {
	args := m.Called(saleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.LaboratoryOrder), args.Error(1)
}

func (m *MockLaboratoryOrderRepository) Create(o *domain.LaboratoryOrder) error {
	return m.Called(o).Error(0)
}

func (m *MockLaboratoryOrderRepository) Update(o *domain.LaboratoryOrder) error {
	return m.Called(o).Error(0)
}

func (m *MockLaboratoryOrderRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockLaboratoryOrderRepository) List(filters map[string]any, page, perPage int) ([]*domain.LaboratoryOrder, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.LaboratoryOrder), args.Get(1).(int64), args.Error(2)
}

func (m *MockLaboratoryOrderRepository) AddStatusEntry(entry *domain.LaboratoryOrderStatusEntry) error {
	return m.Called(entry).Error(0)
}

func (m *MockLaboratoryOrderRepository) Stats() (map[string]int64, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int64), args.Error(1)
}
