package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

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

func (m *MockWarehouseRepository) GetByID(db *gorm.DB, id uint) (*domain.Warehouse, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Warehouse), args.Error(1)
}

func (m *MockWarehouseRepository) Create(db *gorm.DB, w *domain.Warehouse) error {
	return m.Called(db, w).Error(0)
}

func (m *MockWarehouseRepository) Update(db *gorm.DB, w *domain.Warehouse) error {
	return m.Called(db, w).Error(0)
}

func (m *MockWarehouseRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockWarehouseRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Warehouse, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Warehouse), args.Get(1).(int64), args.Error(2)
}

func (m *MockWarehouseRepository) ListLocations(db *gorm.DB, warehouseID uint) ([]*domain.WarehouseLocation, error) {
	args := m.Called(db, warehouseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.WarehouseLocation), args.Error(1)
}

type MockWarehouseLocationRepository struct {
	mock.Mock
}

func (m *MockWarehouseLocationRepository) GetByID(db *gorm.DB, id uint) (*domain.WarehouseLocation, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.WarehouseLocation), args.Error(1)
}

func (m *MockWarehouseLocationRepository) Create(db *gorm.DB, l *domain.WarehouseLocation) error {
	return m.Called(db, l).Error(0)
}

func (m *MockWarehouseLocationRepository) Update(db *gorm.DB, l *domain.WarehouseLocation) error {
	return m.Called(db, l).Error(0)
}

func (m *MockWarehouseLocationRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockWarehouseLocationRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.WarehouseLocation, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.WarehouseLocation), args.Get(1).(int64), args.Error(2)
}

type MockInventoryItemRepository struct {
	mock.Mock
}

func (m *MockInventoryItemRepository) GetByID(db *gorm.DB, id uint) (*domain.InventoryItem, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.InventoryItem), args.Error(1)
}

func (m *MockInventoryItemRepository) Create(db *gorm.DB, i *domain.InventoryItem) error {
	return m.Called(db, i).Error(0)
}

func (m *MockInventoryItemRepository) Update(db *gorm.DB, i *domain.InventoryItem) error {
	return m.Called(db, i).Error(0)
}

func (m *MockInventoryItemRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockInventoryItemRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.InventoryItem, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.InventoryItem), args.Get(1).(int64), args.Error(2)
}

func (m *MockInventoryItemRepository) TotalStock(db *gorm.DB) (int64, error) {
	args := m.Called(db)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockInventoryItemRepository) TotalStockPerProduct(db *gorm.DB, filters map[string]any) ([]*domain.ProductStockEntry, error) {
	args := m.Called(db, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ProductStockEntry), args.Error(1)
}

func (m *MockInventoryItemRepository) ExistsByProductAndLocation(db *gorm.DB, productID, locationID, excludeID uint) (bool, error) {
	args := m.Called(db, productID, locationID, excludeID)
	return args.Bool(0), args.Error(1)
}

type MockInventoryTransferRepository struct {
	mock.Mock
}

func (m *MockInventoryTransferRepository) GetByID(db *gorm.DB, id uint) (*domain.InventoryTransfer, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.InventoryTransfer), args.Error(1)
}

func (m *MockInventoryTransferRepository) Create(db *gorm.DB, t *domain.InventoryTransfer) error {
	return m.Called(db, t).Error(0)
}

func (m *MockInventoryTransferRepository) Update(db *gorm.DB, t *domain.InventoryTransfer) error {
	return m.Called(db, t).Error(0)
}

func (m *MockInventoryTransferRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockInventoryTransferRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.InventoryTransfer, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.InventoryTransfer), args.Get(1).(int64), args.Error(2)
}

type MockStockMovementRepository struct {
	mock.Mock
}

func (m *MockStockMovementRepository) Create(db *gorm.DB, mv *domain.StockMovement) error {
	return m.Called(db, mv).Error(0)
}

func (m *MockStockMovementRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.StockMovement, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.StockMovement), args.Get(1).(int64), args.Error(2)
}

func (m *MockStockMovementRepository) ListByProduct(db *gorm.DB, productID uint, page, perPage int) ([]*domain.StockMovement, int64, error) {
	args := m.Called(db, productID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.StockMovement), args.Get(1).(int64), args.Error(2)
}

type MockInventoryAdjustmentRepository struct {
	mock.Mock
}

func (m *MockInventoryAdjustmentRepository) GetByID(db *gorm.DB, id uint) (*domain.InventoryAdjustment, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.InventoryAdjustment), args.Error(1)
}

func (m *MockInventoryAdjustmentRepository) Create(db *gorm.DB, a *domain.InventoryAdjustment) error {
	return m.Called(db, a).Error(0)
}

func (m *MockInventoryAdjustmentRepository) Update(db *gorm.DB, a *domain.InventoryAdjustment) error {
	return m.Called(db, a).Error(0)
}

func (m *MockInventoryAdjustmentRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.InventoryAdjustment, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.InventoryAdjustment), args.Get(1).(int64), args.Error(2)
}
