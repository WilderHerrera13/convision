package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.LaboratoryRepository = (*MockLaboratoryRepository)(nil)
var _ domain.LaboratoryOrderRepository = (*MockLaboratoryOrderRepository)(nil)
var _ domain.LaboratoryOrderCallRepository = (*MockLaboratoryOrderCallRepository)(nil)
var _ domain.LaboratoryOrderEvidenceRepository = (*MockLaboratoryOrderEvidenceRepository)(nil)

type MockLaboratoryRepository struct {
	mock.Mock
}

func (m *MockLaboratoryRepository) GetByID(db *gorm.DB, id uint) (*domain.Laboratory, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Laboratory), args.Error(1)
}

func (m *MockLaboratoryRepository) Create(db *gorm.DB, l *domain.Laboratory) error {
	return m.Called(db, l).Error(0)
}

func (m *MockLaboratoryRepository) Update(db *gorm.DB, l *domain.Laboratory) error {
	return m.Called(db, l).Error(0)
}

func (m *MockLaboratoryRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockLaboratoryRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Laboratory, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Laboratory), args.Get(1).(int64), args.Error(2)
}

func (m *MockLaboratoryRepository) GetFirstActive(db *gorm.DB) (*domain.Laboratory, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Laboratory), args.Error(1)
}

type MockLaboratoryOrderRepository struct {
	mock.Mock
}

func (m *MockLaboratoryOrderRepository) GetByID(db *gorm.DB, id uint) (*domain.LaboratoryOrder, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.LaboratoryOrder), args.Error(1)
}

func (m *MockLaboratoryOrderRepository) GetByOrderNumber(db *gorm.DB, number string) (*domain.LaboratoryOrder, error) {
	args := m.Called(db, number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.LaboratoryOrder), args.Error(1)
}

func (m *MockLaboratoryOrderRepository) GetBySaleID(db *gorm.DB, saleID uint) (*domain.LaboratoryOrder, error) {
	args := m.Called(db, saleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.LaboratoryOrder), args.Error(1)
}

func (m *MockLaboratoryOrderRepository) Create(db *gorm.DB, o *domain.LaboratoryOrder) error {
	return m.Called(db, o).Error(0)
}

func (m *MockLaboratoryOrderRepository) Update(db *gorm.DB, o *domain.LaboratoryOrder) error {
	return m.Called(db, o).Error(0)
}

func (m *MockLaboratoryOrderRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockLaboratoryOrderRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.LaboratoryOrder, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.LaboratoryOrder), args.Get(1).(int64), args.Error(2)
}

func (m *MockLaboratoryOrderRepository) AddStatusEntry(db *gorm.DB, entry *domain.LaboratoryOrderStatusEntry) error {
	return m.Called(db, entry).Error(0)
}

func (m *MockLaboratoryOrderRepository) Stats(db *gorm.DB) (map[string]int64, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int64), args.Error(1)
}

type MockLaboratoryOrderCallRepository struct {
	mock.Mock
}

func (m *MockLaboratoryOrderCallRepository) Create(db *gorm.DB, call *domain.LaboratoryOrderCall) error {
	return m.Called(db, call).Error(0)
}

func (m *MockLaboratoryOrderCallRepository) GetByOrderID(db *gorm.DB, orderID uint) ([]*domain.LaboratoryOrderCall, error) {
	args := m.Called(db, orderID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LaboratoryOrderCall), args.Error(1)
}

func (m *MockLaboratoryOrderCallRepository) GetByOrderIDs(db *gorm.DB, orderIDs []uint) ([]*domain.LaboratoryOrderCall, error) {
	args := m.Called(db, orderIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LaboratoryOrderCall), args.Error(1)
}

func (m *MockLaboratoryOrderCallRepository) PortfolioStats(db *gorm.DB) (map[string]int64, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]int64), args.Error(1)
}

type MockLaboratoryOrderEvidenceRepository struct {
	mock.Mock
}

func (m *MockLaboratoryOrderEvidenceRepository) Create(db *gorm.DB, e *domain.LaboratoryOrderEvidence) error {
	return m.Called(db, e).Error(0)
}

func (m *MockLaboratoryOrderEvidenceRepository) ListByOrderID(db *gorm.DB, orderID uint, transitionType string) ([]*domain.LaboratoryOrderEvidence, error) {
	args := m.Called(db, orderID, transitionType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.LaboratoryOrderEvidence), args.Error(1)
}
