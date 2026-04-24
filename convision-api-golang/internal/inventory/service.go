package inventory

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles inventory use-cases.
type Service struct {
	warehouseRepo  domain.WarehouseRepository
	locationRepo   domain.WarehouseLocationRepository
	itemRepo       domain.InventoryItemRepository
	transferRepo   domain.InventoryTransferRepository
	logger         *zap.Logger
}

// NewService creates a new inventory Service.
func NewService(
	warehouseRepo domain.WarehouseRepository,
	locationRepo domain.WarehouseLocationRepository,
	itemRepo domain.InventoryItemRepository,
	transferRepo domain.InventoryTransferRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		warehouseRepo: warehouseRepo,
		locationRepo:  locationRepo,
		itemRepo:      itemRepo,
		transferRepo:  transferRepo,
		logger:        logger,
	}
}

// --- Pagination helpers ---

func calcLastPage(total int64, perPage int) int {
	if total == 0 {
		return 1
	}
	lp := int(total) / perPage
	if int(total)%perPage != 0 {
		lp++
	}
	return lp
}

func clampPage(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	return page, perPage
}

// ======== Warehouse ========

// WarehouseCreateInput holds validated fields for creating a warehouse.
type WarehouseCreateInput struct {
	Name    string `json:"name"    binding:"required"`
	Code    string `json:"code"`
	Address string `json:"address"`
	City    string `json:"city"`
	Status  string `json:"status"`
	Notes   string `json:"notes"`
}

// WarehouseUpdateInput holds validated fields for updating a warehouse.
type WarehouseUpdateInput struct {
	Name    string `json:"name"`
	Code    string `json:"code"`
	Address string `json:"address"`
	City    string `json:"city"`
	Status  string `json:"status"`
	Notes   string `json:"notes"`
}

// WarehouseListOutput is the paginated warehouse response.
type WarehouseListOutput struct {
	CurrentPage int                  `json:"current_page"`
	Data        []*domain.Warehouse  `json:"data"`
	LastPage    int                  `json:"last_page"`
	PerPage     int                  `json:"per_page"`
	Total       int64                `json:"total"`
}

func (s *Service) ListWarehouses(filters map[string]any, page, perPage int) (*WarehouseListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.warehouseRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &WarehouseListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetWarehouse(id uint) (*domain.Warehouse, error) {
	return s.warehouseRepo.GetByID(id)
}

func (s *Service) CreateWarehouse(input WarehouseCreateInput) (*domain.Warehouse, error) {
	status := input.Status
	if status == "" {
		status = "active"
	}
	w := &domain.Warehouse{
		Name:    input.Name,
		Code:    input.Code,
		Address: input.Address,
		City:    input.City,
		Status:  status,
		Notes:   input.Notes,
	}
	if err := s.warehouseRepo.Create(w); err != nil {
		return nil, err
	}
	return s.warehouseRepo.GetByID(w.ID)
}

func (s *Service) UpdateWarehouse(id uint, input WarehouseUpdateInput) (*domain.Warehouse, error) {
	w, err := s.warehouseRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		w.Name = input.Name
	}
	if input.Code != "" {
		w.Code = input.Code
	}
	w.Address = input.Address
	w.City = input.City
	if input.Status != "" {
		w.Status = input.Status
	}
	w.Notes = input.Notes

	if err := s.warehouseRepo.Update(w); err != nil {
		return nil, err
	}
	return s.warehouseRepo.GetByID(id)
}

func (s *Service) DeleteWarehouse(id uint) error {
	if _, err := s.warehouseRepo.GetByID(id); err != nil {
		return err
	}
	items, _, err := s.itemRepo.List(map[string]any{"warehouse_id": id}, 1, 1)
	if err != nil {
		return err
	}
	if len(items) > 0 {
		return &domain.ErrValidation{
			Field:   "warehouse_id",
			Message: "no se puede eliminar una bodega que tiene inventario activo",
		}
	}
	return s.warehouseRepo.Delete(id)
}

func (s *Service) ListWarehouseLocations(warehouseID uint) ([]*domain.WarehouseLocation, error) {
	return s.warehouseRepo.ListLocations(warehouseID)
}

// ======== WarehouseLocation ========

// LocationCreateInput holds validated fields for creating a location.
type LocationCreateInput struct {
	WarehouseID uint   `json:"warehouse_id" binding:"required"`
	Name        string `json:"name"         binding:"required"`
	Code        string `json:"code"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

// LocationUpdateInput holds validated fields for updating a location.
type LocationUpdateInput struct {
	WarehouseID uint   `json:"warehouse_id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

// LocationListOutput is the paginated location response.
type LocationListOutput struct {
	CurrentPage int                          `json:"current_page"`
	Data        []*domain.WarehouseLocation  `json:"data"`
	LastPage    int                          `json:"last_page"`
	PerPage     int                          `json:"per_page"`
	Total       int64                        `json:"total"`
}

func (s *Service) ListLocations(filters map[string]any, page, perPage int) (*LocationListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.locationRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &LocationListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetLocation(id uint) (*domain.WarehouseLocation, error) {
	return s.locationRepo.GetByID(id)
}

func (s *Service) CreateLocation(input LocationCreateInput) (*domain.WarehouseLocation, error) {
	status := input.Status
	if status == "" {
		status = "active"
	}
	l := &domain.WarehouseLocation{
		WarehouseID: input.WarehouseID,
		Name:        input.Name,
		Code:        input.Code,
		Type:        input.Type,
		Status:      status,
		Description: input.Description,
	}
	if err := s.locationRepo.Create(l); err != nil {
		return nil, err
	}
	return s.locationRepo.GetByID(l.ID)
}

func (s *Service) UpdateLocation(id uint, input LocationUpdateInput) (*domain.WarehouseLocation, error) {
	l, err := s.locationRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		l.Name = input.Name
	}
	if input.Code != "" {
		l.Code = input.Code
	}
	if input.Type != "" {
		l.Type = input.Type
	}
	if input.Status != "" {
		l.Status = input.Status
	}
	l.Description = input.Description

	if err := s.locationRepo.Update(l); err != nil {
		return nil, err
	}
	return s.locationRepo.GetByID(id)
}

func (s *Service) DeleteLocation(id uint) error {
	if _, err := s.locationRepo.GetByID(id); err != nil {
		return err
	}
	return s.locationRepo.Delete(id)
}

// validateLocationBelongsToWarehouse verifies that locationID belongs to warehouseID.
func (s *Service) validateLocationBelongsToWarehouse(locationID, warehouseID uint) error {
	loc, err := s.locationRepo.GetByID(locationID)
	if err != nil {
		return err
	}
	if loc.WarehouseID != warehouseID {
		return &domain.ErrValidation{
			Field:   "warehouse_location_id",
			Message: "la ubicación no pertenece a la bodega indicada",
		}
	}
	return nil
}

// ======== InventoryItem ========

// ItemCreateInput holds validated fields for creating an inventory item.
type ItemCreateInput struct {
	ProductID           uint   `json:"product_id"            binding:"required"`
	WarehouseID         uint   `json:"warehouse_id"          binding:"required"`
	WarehouseLocationID *uint  `json:"warehouse_location_id"`
	Quantity            int    `json:"quantity"`
	Status              string `json:"status"`
	Notes               string `json:"notes"`
}

// ItemUpdateInput holds validated fields for updating an inventory item.
type ItemUpdateInput struct {
	ProductID           uint   `json:"product_id"`
	WarehouseID         uint   `json:"warehouse_id"`
	WarehouseLocationID *uint  `json:"warehouse_location_id"`
	Quantity            int    `json:"quantity"`
	Status              string `json:"status"`
	Notes               string `json:"notes"`
}

// ItemListOutput is the paginated inventory item response.
type ItemListOutput struct {
	CurrentPage int                    `json:"current_page"`
	Data        []*domain.InventoryItem `json:"data"`
	LastPage    int                    `json:"last_page"`
	PerPage     int                    `json:"per_page"`
	Total       int64                  `json:"total"`
}

// TotalStockOutput holds total stock summary.
type TotalStockOutput struct {
	TotalQuantity int64 `json:"total_quantity"`
}

func (s *Service) ListItems(filters map[string]any, page, perPage int) (*ItemListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.itemRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ItemListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetItem(id uint) (*domain.InventoryItem, error) {
	return s.itemRepo.GetByID(id)
}

func (s *Service) CreateItem(input ItemCreateInput) (*domain.InventoryItem, error) {
	if input.WarehouseLocationID != nil && *input.WarehouseLocationID != 0 {
		if err := s.validateLocationBelongsToWarehouse(*input.WarehouseLocationID, input.WarehouseID); err != nil {
			return nil, err
		}
		exists, err := s.itemRepo.ExistsByProductAndLocation(input.ProductID, *input.WarehouseLocationID, 0)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, &domain.ErrConflict{
				Resource: "inventory_item",
				Field:    "product_id + warehouse_location_id",
			}
		}
	}
	status := domain.InventoryItemStatus(input.Status)
	if status == "" {
		status = domain.InventoryItemStatusAvailable
	}
	i := &domain.InventoryItem{
		ProductID:           input.ProductID,
		WarehouseID:         input.WarehouseID,
		WarehouseLocationID: input.WarehouseLocationID,
		Quantity:            input.Quantity,
		Status:              status,
		Notes:               input.Notes,
	}
	if err := s.itemRepo.Create(i); err != nil {
		return nil, err
	}
	return s.itemRepo.GetByID(i.ID)
}

func (s *Service) UpdateItem(id uint, input ItemUpdateInput) (*domain.InventoryItem, error) {
	i, err := s.itemRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.ProductID != 0 {
		i.ProductID = input.ProductID
	}
	if input.WarehouseID != 0 {
		i.WarehouseID = input.WarehouseID
	}

	// Validate location ↔ warehouse consistency and uniqueness when location changes.
	newLocationID := input.WarehouseLocationID
	if newLocationID != nil && *newLocationID != 0 {
		warehouseID := i.WarehouseID
		if input.WarehouseID != 0 {
			warehouseID = input.WarehouseID
		}
		if err := s.validateLocationBelongsToWarehouse(*newLocationID, warehouseID); err != nil {
			return nil, err
		}
		productID := i.ProductID
		if input.ProductID != 0 {
			productID = input.ProductID
		}
		exists, err := s.itemRepo.ExistsByProductAndLocation(productID, *newLocationID, id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, &domain.ErrConflict{
				Resource: "inventory_item",
				Field:    "product_id + warehouse_location_id",
			}
		}
	}

	i.WarehouseLocationID = newLocationID
	i.Quantity = input.Quantity
	if input.Status != "" {
		i.Status = domain.InventoryItemStatus(input.Status)
	}
	i.Notes = input.Notes

	if err := s.itemRepo.Update(i); err != nil {
		return nil, err
	}
	return s.itemRepo.GetByID(id)
}

func (s *Service) DeleteItem(id uint) error {
	item, err := s.itemRepo.GetByID(id)
	if err != nil {
		return err
	}
	if item.Quantity > 0 {
		return &domain.ErrValidation{
			Field:   "quantity",
			Message: "no se puede eliminar un ítem con stock activo",
		}
	}
	return s.itemRepo.Delete(id)
}

func (s *Service) TotalStock() (*TotalStockOutput, error) {
	total, err := s.itemRepo.TotalStock()
	if err != nil {
		return nil, err
	}
	return &TotalStockOutput{TotalQuantity: total}, nil
}

// TotalStockPerProduct returns available stock aggregated by product.
// Supported filters: warehouse_id, warehouse_location_id.
func (s *Service) TotalStockPerProduct(filters map[string]any) ([]*domain.ProductStockEntry, error) {
	return s.itemRepo.TotalStockPerProduct(filters)
}

// ListItemsByLocation returns paginated inventory items for a given location.
func (s *Service) ListItemsByLocation(locationID uint, page, perPage int) (*ItemListOutput, error) {
	if _, err := s.locationRepo.GetByID(locationID); err != nil {
		return nil, err
	}
	page, perPage = clampPage(page, perPage)
	filters := map[string]any{"warehouse_location_id": locationID}
	data, total, err := s.itemRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ItemListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

// ProductInventorySummary holds a product's inventory breakdown by location.
type ProductInventorySummary struct {
	ProductID uint                    `json:"product_id"`
	Items     []*domain.InventoryItem `json:"items"`
	Total     int64                   `json:"total"`
}

// GetProductInventorySummary returns all inventory items for a product.
func (s *Service) GetProductInventorySummary(productID uint) (*ProductInventorySummary, error) {
	data, total, err := s.itemRepo.List(map[string]any{"product_id": productID}, 1, 1000)
	if err != nil {
		return nil, err
	}
	return &ProductInventorySummary{
		ProductID: productID,
		Items:     data,
		Total:     total,
	}, nil
}

// ======== InventoryTransfer ========

// TransferCreateInput holds validated fields for creating a transfer.
type TransferCreateInput struct {
	LensID                *uint  `json:"lens_id"`
	SourceLocationID      uint   `json:"source_location_id"      binding:"required"`
	DestinationLocationID uint   `json:"destination_location_id" binding:"required"`
	Quantity              int    `json:"quantity"                binding:"required"`
	Notes                 string `json:"notes"`
	TransferredBy         *uint  `json:"-"` // set from JWT
}

// TransferUpdateInput holds validated fields for updating a transfer.
type TransferUpdateInput struct {
	Notes  string `json:"notes"`
	Status string `json:"status"`
}

// TransferListOutput is the paginated transfer response.
type TransferListOutput struct {
	CurrentPage int                        `json:"current_page"`
	Data        []*domain.InventoryTransfer `json:"data"`
	LastPage    int                        `json:"last_page"`
	PerPage     int                        `json:"per_page"`
	Total       int64                      `json:"total"`
}

func (s *Service) ListTransfers(filters map[string]any, page, perPage int) (*TransferListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.transferRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &TransferListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetTransfer(id uint) (*domain.InventoryTransfer, error) {
	return s.transferRepo.GetByID(id)
}

func (s *Service) CreateTransfer(input TransferCreateInput) (*domain.InventoryTransfer, error) {
	t := &domain.InventoryTransfer{
		LensID:                input.LensID,
		SourceLocationID:      input.SourceLocationID,
		DestinationLocationID: input.DestinationLocationID,
		Quantity:              input.Quantity,
		Notes:                 input.Notes,
		TransferredBy:         input.TransferredBy,
		Status:                domain.InventoryTransferStatusPending,
	}
	if err := s.transferRepo.Create(t); err != nil {
		return nil, err
	}
	return s.transferRepo.GetByID(t.ID)
}

func (s *Service) UpdateTransfer(id uint, input TransferUpdateInput) (*domain.InventoryTransfer, error) {
	t, err := s.transferRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	t.Notes = input.Notes
	if input.Status != "" {
		t.Status = domain.InventoryTransferStatus(input.Status)
	}
	if err := s.transferRepo.Update(t); err != nil {
		return nil, err
	}
	return s.transferRepo.GetByID(id)
}

func (s *Service) DeleteTransfer(id uint) error {
	if _, err := s.transferRepo.GetByID(id); err != nil {
		return err
	}
	return s.transferRepo.Delete(id)
}

// AdjustStock adjusts inventory stock for a product (GOQA-010)
func (s *Service) AdjustStock(productID uint, quantity int64, reason string) (interface{}, error) {
	// Get all inventory items for the product
	filters := map[string]any{"product_id": productID}
	items, _, err := s.itemRepo.List(filters, 1, 100)
	if err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return nil, &domain.ErrNotFound{Resource: "inventory item for product"}
	}

	// Adjust the first item (usually there's only one per product)
	item := items[0]
	item.Quantity += int(quantity)
	if item.Quantity < 0 {
		return nil, &domain.ErrValidation{Field: "quantity", Message: "cannot have negative stock"}
	}

	if err := s.itemRepo.Update(item); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"product_id": productID,
		"adjustment": quantity,
		"new_quantity": item.Quantity,
		"reason": reason,
	}, nil
}
