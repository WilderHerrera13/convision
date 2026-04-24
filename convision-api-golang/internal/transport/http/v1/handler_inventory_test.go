package v1_test

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/inventory"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestListWarehouses_Success(t *testing.T) {
	whRepo := &mocks.MockWarehouseRepository{}
	locRepo := &mocks.MockWarehouseLocationRepository{}
	itemRepo := &mocks.MockInventoryItemRepository{}
	transferRepo := &mocks.MockInventoryTransferRepository{}

	whRepo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.Warehouse{{ID: 1, Name: "Main"}},
		int64(1),
		nil,
	)

	invSvc := inventory.NewService(nil, whRepo, locRepo, itemRepo, transferRepo, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, nil, nil, invSvc, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/warehouses", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}

func TestCreateTransfer_AdminOnly_Forbidden(t *testing.T) {
	// POST /inventory-transfers requires RoleAdmin — receptionist should get 403
	invSvc := inventory.NewService(
		nil,
		&mocks.MockWarehouseRepository{},
		&mocks.MockWarehouseLocationRepository{},
		&mocks.MockInventoryItemRepository{},
		&mocks.MockInventoryTransferRepository{},
		zap.NewNop(),
	)
	h := buildHandler(nil, nil, nil, nil, nil, nil, invSvc, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/inventory-transfers", map[string]any{
		"product_id":              1,
		"source_location_id":      1,
		"destination_location_id": 2,
		"quantity":                5,
	}, 3, domain.RoleReceptionist)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusForbidden)
}

func TestDeleteLocation_HasItems_ValidationError(t *testing.T) {
	// DeleteWarehouseLocation returns ErrValidation when the location has active items
	whRepo := &mocks.MockWarehouseRepository{}
	locRepo := &mocks.MockWarehouseLocationRepository{}
	itemRepo := &mocks.MockInventoryItemRepository{}
	transferRepo := &mocks.MockInventoryTransferRepository{}

	locRepo.On("GetByID", uint(1)).Return(&domain.WarehouseLocation{ID: 1}, nil)
	itemRepo.On("List", map[string]any{"warehouse_location_id": uint(1)}, 1, 1).Return(
		[]*domain.InventoryItem{{ID: 1}},
		int64(1),
		nil,
	)

	invSvc := inventory.NewService(nil, whRepo, locRepo, itemRepo, transferRepo, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, nil, nil, invSvc, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodDelete, "/api/v1/warehouse-locations/1", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusUnprocessableEntity)
}
