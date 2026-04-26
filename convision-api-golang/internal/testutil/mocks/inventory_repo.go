package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.WarehouseRepository = (*MockWarehouseRepository)(nil)
var _ domain.WarehouseLocationRepository = (*MockWarehouseLocationRepository)(nil)
var _ domain.InventoryItemRepository = (*MockInventoryItemRepository)(nil)
var _ domain.InventoryTransferRepository = (*MockInventoryTransferRepository)(nil)
var _ domain.StockMovementRepository = (*MockStockMovementRepository)(nil)
var _ domain.InventoryAdjustmentRepository = (*MockInventoryAdjustmentRepository)(nil)

type MockWarehouseRepository struct {
	mock.Mock
}

func (m *MockWarehouseRepository) GetByID(id uint) (*domain.Warehouse, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Warehouse), args.Error(1)
}

func (m *MockWarehouseRepository) Create(w *domain.Warehouse) error {
	return m.Called(w).Error(0)
}

func (m *MockWarehouseRepository) Update(w *domain.Warehouse) error {
	return m.Called(w).Error(0)
}

func (m *MockWarehouseRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockWarehouseRepository) List(filters map[string]any, page, perPage int) ([]*domain.Warehouse, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Warehouse), args.Get(1).(int64), args.Error(2)
}

func (m *MockWarehouseRepository) ListLocations(warehouseID uint) ([]*domain.WarehouseLocation, error) {
	args := m.Called(warehouseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.WarehouseLocation), args.Error(1)
}

type MockWarehouseLocationRepository struct {
	mock.Mock
}

func (m *MockWarehouseLocationRepository) GetByID(id uint) (*domain.WarehouseLocation, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.WarehouseLocation), args.Error(1)
}

func (m *MockWarehouseLocationRepository) Create(l *domain.WarehouseLocation) error {
	return m.Called(l).Error(0)
}

func (m *MockWarehouseLocationRepository) Update(l *domain.WarehouseLocation) error {
	return m.Called(l).Error(0)
}

func (m *MockWarehouseLocationRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockWarehouseLocationRepository) List(filters map[string]any, page, perPage int) ([]*domain.WarehouseLocation, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.WarehouseLocation), args.Get(1).(int64), args.Error(2)
}

type MockInventoryItemRepository struct {
	mock.Mock
}

func (m *MockInventoryItemRepository) GetByID(id uint) (*domain.InventoryItem, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.InventoryItem), args.Error(1)
}

func (m *MockInventoryItemRepository) Create(i *domain.InventoryItem) error {
	return m.Called(i).Error(0)
}

func (m *MockInventoryItemRepository) Update(i *domain.InventoryItem) error {
	return m.Called(i).Error(0)
}

func (m *MockInventoryItemRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockInventoryItemRepository) List(filters map[string]any, page, perPage int) ([]*domain.InventoryItem, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.InventoryItem), args.Get(1).(int64), args.Error(2)
}

func (m *MockInventoryItemRepository) TotalStock() (int64, error) {
	args := m.Called()
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockInventoryItemRepository) TotalStockPerProduct(filters map[string]any) ([]*domain.ProductStockEntry, error) {
	args := m.Called(filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ProductStockEntry), args.Error(1)
}

func (m *MockInventoryItemRepository) ExistsByProductAndLocation(productID, locationID, excludeID uint) (bool, error) {
	args := m.Called(productID, locationID, excludeID)
	return args.Bool(0), args.Error(1)
}

type MockInventoryTransferRepository struct {
	mock.Mock
}

func (m *MockInventoryTransferRepository) GetByID(id uint) (*domain.InventoryTransfer, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.InventoryTransfer), args.Error(1)
}

func (m *MockInventoryTransferRepository) Create(t *domain.InventoryTransfer) error {
	return m.Called(t).Error(0)
}

func (m *MockInventoryTransferRepository) Update(t *domain.InventoryTransfer) error {
	return m.Called(t).Error(0)
}

func (m *MockInventoryTransferRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockInventoryTransferRepository) List(filters map[string]any, page, perPage int) ([]*domain.InventoryTransfer, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.InventoryTransfer), args.Get(1).(int64), args.Error(2)
}

type MockStockMovementRepository struct {
	mock.Mock
}

func (m *MockStockMovementRepository) Create(mv *domain.StockMovement) error {
	return m.Called(mv).Error(0)
}

func (m *MockStockMovementRepository) List(filters map[string]any, page, perPage int) ([]*domain.StockMovement, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.StockMovement), args.Get(1).(int64), args.Error(2)
}

func (m *MockStockMovementRepository) ListByProduct(productID uint, page, perPage int) ([]*domain.StockMovement, int64, error) {
	args := m.Called(productID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.StockMovement), args.Get(1).(int64), args.Error(2)
}

type MockInventoryAdjustmentRepository struct {
	mock.Mock
}

func (m *MockInventoryAdjustmentRepository) GetByID(id uint) (*domain.InventoryAdjustment, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.InventoryAdjustment), args.Error(1)
}

func (m *MockInventoryAdjustmentRepository) Create(a *domain.InventoryAdjustment) error {
	return m.Called(a).Error(0)
}

func (m *MockInventoryAdjustmentRepository) Update(a *domain.InventoryAdjustment) error {
	return m.Called(a).Error(0)
}

func (m *MockInventoryAdjustmentRepository) List(filters map[string]any, page, perPage int) ([]*domain.InventoryAdjustment, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.InventoryAdjustment), args.Get(1).(int64), args.Error(2)
}
