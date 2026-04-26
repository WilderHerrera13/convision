package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.LaboratoryRepository = (*MockLaboratoryRepository)(nil)
var _ domain.LaboratoryOrderRepository = (*MockLaboratoryOrderRepository)(nil)
var _ domain.LaboratoryOrderCallRepository = (*MockLaboratoryOrderCallRepository)(nil)
var _ domain.LaboratoryOrderEvidenceRepository = (*MockLaboratoryOrderEvidenceRepository)(nil)

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

type MockLaboratoryOrderCallRepository struct {
	mock.Mock
}

func (m *MockLaboratoryOrderCallRepository) Create(call *domain.LaboratoryOrderCall) error {
	return m.Called(call).Error(0)
}

func (m *MockLaboratoryOrderCallRepository) GetByOrderID(orderID uint) ([]*domain.LaboratoryOrderCall, error) {
	args := m.Called(orderID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LaboratoryOrderCall), args.Error(1)
}

func (m *MockLaboratoryOrderCallRepository) GetByOrderIDs(orderIDs []uint) ([]*domain.LaboratoryOrderCall, error) {
	args := m.Called(orderIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LaboratoryOrderCall), args.Error(1)
}

func (m *MockLaboratoryOrderCallRepository) PortfolioStats() (map[string]int64, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int64), args.Error(1)
}

type MockLaboratoryOrderEvidenceRepository struct {
	mock.Mock
}

func (m *MockLaboratoryOrderEvidenceRepository) Create(e *domain.LaboratoryOrderEvidence) error {
	return m.Called(e).Error(0)
}

func (m *MockLaboratoryOrderEvidenceRepository) ListByOrderID(orderID uint, transitionType string) ([]*domain.LaboratoryOrderEvidence, error) {
	args := m.Called(orderID, transitionType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LaboratoryOrderEvidence), args.Error(1)
}
