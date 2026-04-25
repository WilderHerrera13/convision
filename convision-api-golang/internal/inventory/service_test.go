package inventory_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/inventory"
	"github.com/convision/api/internal/testutil/mocks"
)

// newInventorySvc creates a service with nil db (safe for methods that don't use transactions).
func newInventorySvc(
	wh *mocks.MockWarehouseRepository,
	loc *mocks.MockWarehouseLocationRepository,
	item *mocks.MockInventoryItemRepository,
	transfer *mocks.MockInventoryTransferRepository,
) *inventory.Service {
	return inventory.NewService(nil, wh, loc, item, transfer, zap.NewNop())
}

// TestCreateTransfer_SourceEqualsDestination verifies the early-return guard before any DB transaction.
func TestCreateTransfer_SourceEqualsDestination(t *testing.T) {
	svc := newInventorySvc(
		&mocks.MockWarehouseRepository{},
		&mocks.MockWarehouseLocationRepository{},
		&mocks.MockInventoryItemRepository{},
		&mocks.MockInventoryTransferRepository{},
	)

	_, err := svc.CreateTransfer(inventory.TransferCreateInput{
		ProductID:             1,
		SourceLocationID:      5,
		DestinationLocationID: 5,
		Quantity:              1,
	})

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "destination_location_id", valErr.Field)
}

// TestCreateTransfer_InsufficientStock documents that this validation lives inside a DB transaction
// and cannot be exercised without a real database connection.
func TestCreateTransfer_InsufficientStock(t *testing.T) {
	t.Skip("insufficient-stock guard is inside a gorm.DB transaction; covered by integration tests")
}

func TestDeleteLocation_HasActiveItems(t *testing.T) {
	loc := &mocks.MockWarehouseLocationRepository{}
	item := &mocks.MockInventoryItemRepository{}
	loc.On("GetByID", uint(1)).Return(&domain.WarehouseLocation{ID: 1}, nil)
	item.On("List", map[string]any{"warehouse_location_id": uint(1)}, 1, 1).Return(
		[]*domain.InventoryItem{{ID: 1}},
		int64(1),
		nil,
	)

	svc := newInventorySvc(&mocks.MockWarehouseRepository{}, loc, item, &mocks.MockInventoryTransferRepository{})
	err := svc.DeleteLocation(1)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "warehouse_location_id", valErr.Field)
	loc.AssertExpectations(t)
	item.AssertExpectations(t)
}

func TestDeleteLocation_EmptySuccess(t *testing.T) {
	loc := &mocks.MockWarehouseLocationRepository{}
	item := &mocks.MockInventoryItemRepository{}
	loc.On("GetByID", uint(2)).Return(&domain.WarehouseLocation{ID: 2}, nil)
	item.On("List", map[string]any{"warehouse_location_id": uint(2)}, 1, 1).Return(
		[]*domain.InventoryItem{},
		int64(0),
		nil,
	)
	loc.On("Delete", uint(2)).Return(nil)

	svc := newInventorySvc(&mocks.MockWarehouseRepository{}, loc, item, &mocks.MockInventoryTransferRepository{})
	err := svc.DeleteLocation(2)

	require.NoError(t, err)
	loc.AssertExpectations(t)
	item.AssertExpectations(t)
}

func TestGetWarehouse_Found(t *testing.T) {
	wh := &mocks.MockWarehouseRepository{}
	wh.On("GetByID", uint(1)).Return(&domain.Warehouse{ID: 1, Name: "Main"}, nil)

	svc := newInventorySvc(wh, &mocks.MockWarehouseLocationRepository{}, &mocks.MockInventoryItemRepository{}, &mocks.MockInventoryTransferRepository{})
	w, err := svc.GetWarehouse(1)

	require.NoError(t, err)
	assert.Equal(t, "Main", w.Name)
	wh.AssertExpectations(t)
}

func TestGetWarehouse_NotFound(t *testing.T) {
	wh := &mocks.MockWarehouseRepository{}
	wh.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "warehouse"})

	_, err := newInventorySvc(wh, &mocks.MockWarehouseLocationRepository{}, &mocks.MockInventoryItemRepository{}, &mocks.MockInventoryTransferRepository{}).GetWarehouse(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	wh.AssertExpectations(t)
}

func TestCreateLocation_Success(t *testing.T) {
	loc := &mocks.MockWarehouseLocationRepository{}
	wh := &mocks.MockWarehouseRepository{}
	loc.On("Create", mock.Anything).Return(nil)
	loc.On("GetByID", uint(0)).Return(&domain.WarehouseLocation{ID: 1, Name: "Shelf A"}, nil)

	svc := newInventorySvc(wh, loc, &mocks.MockInventoryItemRepository{}, &mocks.MockInventoryTransferRepository{})
	_, err := svc.CreateLocation(inventory.LocationCreateInput{
		WarehouseID: 1,
		Name:        "Shelf A",
	})

	require.NoError(t, err)
	loc.AssertExpectations(t)
}
