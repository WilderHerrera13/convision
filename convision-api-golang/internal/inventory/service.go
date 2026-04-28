package inventory

import (
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/convision/api/internal/domain"
)

var validItemStatuses = map[domain.InventoryItemStatus]bool{
	domain.InventoryItemStatusAvailable: true,
	domain.InventoryItemStatusReserved:  true,
	domain.InventoryItemStatusDamaged:   true,
	domain.InventoryItemStatusSold:      true,
	domain.InventoryItemStatusReturned:  true,
	domain.InventoryItemStatusLost:      true,
}

func validateItemStatus(s string) (domain.InventoryItemStatus, error) {
	if s == "" {
		return domain.InventoryItemStatusAvailable, nil
	}
	st := domain.InventoryItemStatus(s)
	if !validItemStatuses[st] {
		return "", &domain.ErrValidation{Field: "status", Message: "valor de estado inválido"}
	}
	return st, nil
}

var validTransferStatuses = map[domain.InventoryTransferStatus]bool{
	domain.InventoryTransferStatusPending:   true,
	domain.InventoryTransferStatusCompleted: true,
	domain.InventoryTransferStatusCancelled: true,
}

func validateTransferStatus(s string) (domain.InventoryTransferStatus, error) {
	if s == "" {
		return "", nil
	}
	st := domain.InventoryTransferStatus(s)
	if !validTransferStatuses[st] {
		return "", &domain.ErrValidation{Field: "status", Message: "valor de estado de transferencia inválido"}
	}
	return st, nil
}

// Service handles inventory use-cases.
type Service struct {
	db             *gorm.DB
	warehouseRepo  domain.WarehouseRepository
	locationRepo   domain.WarehouseLocationRepository
	itemRepo       domain.InventoryItemRepository
	transferRepo   domain.InventoryTransferRepository
	movementRepo   domain.StockMovementRepository
	adjustmentRepo domain.InventoryAdjustmentRepository
	logger         *zap.Logger
}

// NewService creates a new inventory Service.
func NewService(
	db *gorm.DB,
	warehouseRepo domain.WarehouseRepository,
	locationRepo domain.WarehouseLocationRepository,
	itemRepo domain.InventoryItemRepository,
	transferRepo domain.InventoryTransferRepository,
	movementRepo domain.StockMovementRepository,
	adjustmentRepo domain.InventoryAdjustmentRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		db:             db,
		warehouseRepo:  warehouseRepo,
		locationRepo:   locationRepo,
		itemRepo:       itemRepo,
		transferRepo:   transferRepo,
		movementRepo:   movementRepo,
		adjustmentRepo: adjustmentRepo,
		logger:         logger,
	}
}

// refType returns a pointer to a ReferenceType value.
func refType(rt domain.ReferenceType) *domain.ReferenceType { return &rt }

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
	BranchID uint   `json:"branch_id"`
	Name     string `json:"name"    binding:"required"`
	Code     string `json:"code"`
	Address  string `json:"address"`
	City     string `json:"city"`
	Status   string `json:"status"`
	Notes    string `json:"notes"`
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
	CurrentPage int                 `json:"current_page"`
	Data        []*domain.Warehouse `json:"data"`
	LastPage    int                 `json:"last_page"`
	PerPage     int                 `json:"per_page"`
	Total       int64               `json:"total"`
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
		BranchID: input.BranchID,
		Name:     input.Name,
		Code:     input.Code,
		Address:  input.Address,
		City:     input.City,
		Status:   status,
		Notes:    input.Notes,
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
	CurrentPage int                         `json:"current_page"`
	Data        []*domain.WarehouseLocation `json:"data"`
	LastPage    int                         `json:"last_page"`
	PerPage     int                         `json:"per_page"`
	Total       int64                       `json:"total"`
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
	items, _, err := s.itemRepo.List(map[string]any{"warehouse_location_id": id}, 1, 1)
	if err != nil {
		return err
	}
	if len(items) > 0 {
		return &domain.ErrValidation{
			Field:   "warehouse_location_id",
			Message: "no se puede eliminar una ubicación que tiene inventario activo",
		}
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
	BranchID            uint   `json:"branch_id"`
	ProductID           uint   `json:"product_id"            binding:"required"`
	WarehouseID         uint   `json:"warehouse_id"          binding:"required"`
	WarehouseLocationID *uint  `json:"warehouse_location_id"`
	Quantity            int    `json:"quantity"`
	Status              string `json:"status"`
	Notes               string `json:"notes"`
}

// ItemUpdateInput holds validated fields for updating an inventory item.
type ItemUpdateInput struct {
	ProductID           uint    `json:"product_id"`
	WarehouseID         uint    `json:"warehouse_id"`
	WarehouseLocationID *uint   `json:"warehouse_location_id"`
	Quantity            *int    `json:"quantity"`
	Status              string  `json:"status"`
	Notes               *string `json:"notes"`
}

// ItemListOutput is the paginated inventory item response.
type ItemListOutput struct {
	CurrentPage int                     `json:"current_page"`
	Data        []*domain.InventoryItem `json:"data"`
	LastPage    int                     `json:"last_page"`
	PerPage     int                     `json:"per_page"`
	Total       int64                   `json:"total"`
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
	status, err := validateItemStatus(input.Status)
	if err != nil {
		return nil, err
	}
	i := &domain.InventoryItem{
		BranchID:            input.BranchID,
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
	movement := &domain.StockMovement{
		ProductID:           i.ProductID,
		WarehouseID:         i.WarehouseID,
		WarehouseLocationID: i.WarehouseLocationID,
		MovementType:        domain.MovementTypeEntry,
		ReferenceType:       refType(domain.ReferenceTypeManual),
		QuantityBefore:      0,
		QuantityDelta:       i.Quantity,
		QuantityAfter:       i.Quantity,
		Notes:               "stock entry via CreateItem",
	}
	if err := s.movementRepo.Create(movement); err != nil {
		s.logger.Warn("failed to write stock movement for CreateItem", zap.Error(err))
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
	if input.Quantity != nil {
		i.Quantity = *input.Quantity
	}
	if input.Status != "" {
		st, err := validateItemStatus(input.Status)
		if err != nil {
			return nil, err
		}
		i.Status = st
	}
	if input.Notes != nil {
		i.Notes = *input.Notes
	}

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
	ProductID             uint   `json:"product_id"              binding:"required"`
	SourceLocationID      uint   `json:"source_location_id"      binding:"required"`
	DestinationLocationID uint   `json:"destination_location_id" binding:"required"`
	Quantity              int    `json:"quantity"                binding:"required,min=1"`
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
	CurrentPage int                         `json:"current_page"`
	Data        []*domain.InventoryTransfer `json:"data"`
	LastPage    int                         `json:"last_page"`
	PerPage     int                         `json:"per_page"`
	Total       int64                       `json:"total"`
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
	if input.SourceLocationID == input.DestinationLocationID {
		return nil, &domain.ErrValidation{
			Field:   "destination_location_id",
			Message: "la ubicación de origen y destino no pueden ser la misma",
		}
	}

	var created *domain.InventoryTransfer
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Lock the source item row to prevent concurrent transfers from over-committing stock.
		var srcItem domain.InventoryItem
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("product_id = ? AND warehouse_location_id = ?", input.ProductID, input.SourceLocationID).
			First(&srcItem).Error; err != nil {
			return &domain.ErrValidation{
				Field:   "source_location_id",
				Message: "no se encontró inventario en la ubicación de origen para este producto",
			}
		}
		if srcItem.Quantity < input.Quantity {
			return &domain.ErrValidation{
				Field:   "quantity",
				Message: "stock insuficiente en la ubicación de origen",
			}
		}

		t := &domain.InventoryTransfer{
			ProductID:             input.ProductID,
			SourceLocationID:      input.SourceLocationID,
			DestinationLocationID: input.DestinationLocationID,
			Quantity:              input.Quantity,
			Notes:                 input.Notes,
			TransferredBy:         input.TransferredBy,
			Status:                domain.InventoryTransferStatusPending,
		}
		if err := tx.Create(t).Error; err != nil {
			return err
		}
		created = t
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.transferRepo.GetByID(created.ID)
}

// CompleteTransfer atomically moves stock from source to destination and marks the transfer completed.
func (s *Service) CompleteTransfer(id uint) (*domain.InventoryTransfer, error) {
	var result *domain.InventoryTransfer
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var t domain.InventoryTransfer
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&t, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &domain.ErrNotFound{Resource: "inventory_transfer"}
			}
			return err
		}
		if t.Status != domain.InventoryTransferStatusPending {
			return &domain.ErrValidation{
				Field:   "status",
				Message: "solo se pueden completar transferencias en estado pendiente",
			}
		}

		// Move stock from source to destination location.
		var src domain.InventoryItem
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("product_id = ? AND warehouse_location_id = ?", t.ProductID, t.SourceLocationID).
			First(&src).Error; err != nil {
			return &domain.ErrValidation{
				Field:   "source_location_id",
				Message: "no se encontró inventario en la ubicación de origen para este producto",
			}
		}
		if src.Quantity < t.Quantity {
			return &domain.ErrValidation{
				Field:   "quantity",
				Message: "stock insuficiente en la ubicación de origen",
			}
		}

		if err := tx.Model(&src).Update("quantity", src.Quantity-t.Quantity).Error; err != nil {
			return err
		}

		var dst domain.InventoryItem
		dstErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("product_id = ? AND warehouse_location_id = ?", t.ProductID, t.DestinationLocationID).
			First(&dst).Error
		if dstErr != nil && !errors.Is(dstErr, gorm.ErrRecordNotFound) {
			return dstErr
		}
		if errors.Is(dstErr, gorm.ErrRecordNotFound) {
			var dstLoc domain.WarehouseLocation
			if err := tx.First(&dstLoc, t.DestinationLocationID).Error; err != nil {
				return &domain.ErrNotFound{Resource: "destination_warehouse_location"}
			}
			dst = domain.InventoryItem{
				ProductID:           t.ProductID,
				WarehouseID:         dstLoc.WarehouseID,
				WarehouseLocationID: &t.DestinationLocationID,
				Quantity:            t.Quantity,
				Status:              domain.InventoryItemStatusAvailable,
			}
			if err := tx.Create(&dst).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(&dst).Update("quantity", dst.Quantity+t.Quantity).Error; err != nil {
				return err
			}
		}

		// Double-entry Kardex: transfer_out on source, transfer_in on destination.
		srcQtyBefore := src.Quantity // captured before the deduction
		srcMovement := &domain.StockMovement{
			ProductID:           t.ProductID,
			WarehouseID:         src.WarehouseID,
			WarehouseLocationID: &t.SourceLocationID,
			MovementType:        domain.MovementTypeTransferOut,
			ReferenceType:       refType(domain.ReferenceTypeTransfer),
			ReferenceID:         &t.ID,
			QuantityBefore:      srcQtyBefore,
			QuantityDelta:       -t.Quantity,
			QuantityAfter:       srcQtyBefore - t.Quantity,
		}
		if err := tx.Create(srcMovement).Error; err != nil {
			return err
		}
		dstQtyBefore := 0
		if !errors.Is(dstErr, gorm.ErrRecordNotFound) {
			dstQtyBefore = dst.Quantity - t.Quantity // quantity before addition
		}
		dstMovement := &domain.StockMovement{
			ProductID:           t.ProductID,
			WarehouseID:         dst.WarehouseID,
			WarehouseLocationID: &t.DestinationLocationID,
			MovementType:        domain.MovementTypeTransferIn,
			ReferenceType:       refType(domain.ReferenceTypeTransfer),
			ReferenceID:         &t.ID,
			QuantityBefore:      dstQtyBefore,
			QuantityDelta:       t.Quantity,
			QuantityAfter:       dstQtyBefore + t.Quantity,
		}
		if err := tx.Create(dstMovement).Error; err != nil {
			return err
		}

		now := time.Now()
		if err := tx.Model(&t).Updates(map[string]any{
			"status":       string(domain.InventoryTransferStatusCompleted),
			"completed_at": &now,
		}).Error; err != nil {
			return err
		}
		t.Status = domain.InventoryTransferStatusCompleted
		t.CompletedAt = &now
		result = &t
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.transferRepo.GetByID(result.ID)
}

// CancelTransfer sets the transfer status to cancelled, preventing any further state changes.
func (s *Service) CancelTransfer(id uint) (*domain.InventoryTransfer, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var t domain.InventoryTransfer
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&t, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &domain.ErrNotFound{Resource: "inventory_transfer"}
			}
			return err
		}
		if t.Status != domain.InventoryTransferStatusPending {
			return &domain.ErrValidation{
				Field:   "status",
				Message: "solo se pueden cancelar transferencias en estado pendiente",
			}
		}
		t.Status = domain.InventoryTransferStatusCancelled
		if err := tx.Model(&t).Updates(map[string]any{"status": t.Status}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.transferRepo.GetByID(id)
}

// ======== Inventory Adjustments ========

// AdjustmentCreateInput holds validated fields for creating an inventory adjustment request.
type AdjustmentCreateInput struct {
	InventoryItemID  uint                     `json:"inventory_item_id" binding:"required"`
	AdjustmentReason domain.AdjustmentReason  `json:"adjustment_reason" binding:"required"`
	QuantityDelta    int                      `json:"quantity_delta"`
	Notes            string                   `json:"notes"`
	EvidenceURL      string                   `json:"evidence_url"`
	RequestedBy      uint                     `json:"-"` // set from JWT
}

// AdjustmentListOutput is the paginated adjustment response.
type AdjustmentListOutput struct {
	CurrentPage int                           `json:"current_page"`
	Data        []*domain.InventoryAdjustment `json:"data"`
	LastPage    int                           `json:"last_page"`
	PerPage     int                           `json:"per_page"`
	Total       int64                         `json:"total"`
}

// MovementListOutput is the paginated stock movement response.
type MovementListOutput struct {
	CurrentPage int                     `json:"current_page"`
	Data        []*domain.StockMovement `json:"data"`
	LastPage    int                     `json:"last_page"`
	PerPage     int                     `json:"per_page"`
	Total       int64                   `json:"total"`
}

var validAdjustmentReasons = map[domain.AdjustmentReason]bool{
	domain.AdjustmentReasonDamage:          true,
	domain.AdjustmentReasonExpiry:          true,
	domain.AdjustmentReasonTheft:           true,
	domain.AdjustmentReasonCountCorrection: true,
	domain.AdjustmentReasonReturn:          true,
	domain.AdjustmentReasonWarranty:        true,
	domain.AdjustmentReasonSupplierDefect:  true,
}

func (s *Service) CreateAdjustment(input AdjustmentCreateInput) (*domain.InventoryAdjustment, error) {
	if !validAdjustmentReasons[input.AdjustmentReason] {
		return nil, &domain.ErrValidation{Field: "adjustment_reason", Message: "motivo de ajuste inválido"}
	}
	item, err := s.itemRepo.GetByID(input.InventoryItemID)
	if err != nil {
		return nil, err
	}
	qtyAfter := item.Quantity + input.QuantityDelta
	if qtyAfter < 0 {
		return nil, &domain.ErrValidation{Field: "quantity_delta", Message: "el ajuste resultaría en stock negativo"}
	}
	adj := &domain.InventoryAdjustment{
		InventoryItemID:  input.InventoryItemID,
		AdjustmentReason: input.AdjustmentReason,
		QuantityDelta:    input.QuantityDelta,
		QuantityBefore:   item.Quantity,
		QuantityAfter:    qtyAfter,
		Status:           domain.AdjustmentStatusPendingApproval,
		RequestedBy:      input.RequestedBy,
		Notes:            input.Notes,
		EvidenceURL:      input.EvidenceURL,
	}
	if err := s.adjustmentRepo.Create(adj); err != nil {
		return nil, err
	}
	return s.adjustmentRepo.GetByID(adj.ID)
}

func (s *Service) ApproveAdjustment(id uint, approvedBy uint) (*domain.InventoryAdjustment, error) {
	var result *domain.InventoryAdjustment
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var adj domain.InventoryAdjustment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&adj, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &domain.ErrNotFound{Resource: "inventory_adjustment"}
			}
			return err
		}
		if adj.Status != domain.AdjustmentStatusPendingApproval {
			return &domain.ErrValidation{Field: "status", Message: "solo se pueden aprobar ajustes en estado pendiente"}
		}
		var item domain.InventoryItem
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&item, adj.InventoryItemID).Error; err != nil {
			return err
		}
		newQty := item.Quantity + adj.QuantityDelta
		if newQty < 0 {
			return &domain.ErrValidation{Field: "quantity_delta", Message: "el ajuste resultaría en stock negativo"}
		}
		if err := tx.Model(&item).Update("quantity", newQty).Error; err != nil {
			return err
		}
		movType := domain.MovementTypeAdjustmentAdd
		if adj.QuantityDelta < 0 {
			movType = domain.MovementTypeAdjustmentSub
		}
		adjRefType := domain.ReferenceTypeAdjustment
		movement := &domain.StockMovement{
			ProductID:           item.ProductID,
			WarehouseID:         item.WarehouseID,
			WarehouseLocationID: item.WarehouseLocationID,
			MovementType:        movType,
			ReferenceType:       &adjRefType,
			ReferenceID:         &adj.ID,
			QuantityBefore:      item.Quantity,
			QuantityDelta:       adj.QuantityDelta,
			QuantityAfter:       newQty,
			Notes:               adj.Notes,
			PerformedBy:         &approvedBy,
		}
		if err := tx.Create(movement).Error; err != nil {
			return err
		}
		now := time.Now()
		adj.Status = domain.AdjustmentStatusApproved
		adj.ApprovedBy = &approvedBy
		adj.ReviewedAt = &now
		if err := tx.Save(&adj).Error; err != nil {
			return err
		}
		result = &adj
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.adjustmentRepo.GetByID(result.ID)
}

func (s *Service) RejectAdjustment(id uint, approvedBy uint, notes string) (*domain.InventoryAdjustment, error) {
	adj, err := s.adjustmentRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if adj.Status != domain.AdjustmentStatusPendingApproval {
		return nil, &domain.ErrValidation{Field: "status", Message: "solo se pueden rechazar ajustes en estado pendiente"}
	}
	now := time.Now()
	adj.Status = domain.AdjustmentStatusRejected
	adj.ApprovedBy = &approvedBy
	adj.ReviewedAt = &now
	if notes != "" {
		adj.Notes = notes
	}
	if err := s.adjustmentRepo.Update(adj); err != nil {
		return nil, err
	}
	return s.adjustmentRepo.GetByID(adj.ID)
}

func (s *Service) ListAdjustments(filters map[string]any, page, perPage int) (*AdjustmentListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.adjustmentRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &AdjustmentListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) ListMovements(filters map[string]any, page, perPage int) (*MovementListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.movementRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &MovementListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

// allowedTransitions defines the valid state machine transitions for inventory transfers.
var allowedTransitions = map[domain.InventoryTransferStatus]map[domain.InventoryTransferStatus]bool{
	domain.InventoryTransferStatusPending: {
		domain.InventoryTransferStatusCompleted: true,
		domain.InventoryTransferStatusCancelled: true,
	},
	domain.InventoryTransferStatusCompleted: {},
	domain.InventoryTransferStatusCancelled: {},
}

func (s *Service) UpdateTransfer(id uint, input TransferUpdateInput) (*domain.InventoryTransfer, error) {
	// Status-change paths delegate to CompleteTransfer/CancelTransfer which own their own transactions.
	// The notes-only path wraps GetByID+Update in a transaction with FOR UPDATE to avoid stale updates.
	if input.Status != "" {
		if _, err := validateTransferStatus(input.Status); err != nil {
			return nil, err
		}
		t, err := s.transferRepo.GetByID(id)
		if err != nil {
			return nil, err
		}
		if t.Status == domain.InventoryTransferStatusCompleted || t.Status == domain.InventoryTransferStatusCancelled {
			return nil, &domain.ErrValidation{
				Field:   "status",
				Message: "no se puede modificar una transferencia en estado terminal",
			}
		}
		next := domain.InventoryTransferStatus(input.Status)
		if !allowedTransitions[t.Status][next] {
			return nil, &domain.ErrValidation{
				Field:   "status",
				Message: fmt.Sprintf("transición de estado no permitida: %s → %s", t.Status, next),
			}
		}
		if next == domain.InventoryTransferStatusCompleted {
			return s.CompleteTransfer(id)
		}
		if next == domain.InventoryTransferStatusCancelled {
			return s.CancelTransfer(id)
		}
	}

	var result *domain.InventoryTransfer
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var t domain.InventoryTransfer
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&t, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &domain.ErrNotFound{Resource: "inventory_transfer"}
			}
			return err
		}
		if t.Status == domain.InventoryTransferStatusCompleted || t.Status == domain.InventoryTransferStatusCancelled {
			return &domain.ErrValidation{
				Field:   "status",
				Message: "no se puede modificar una transferencia en estado terminal",
			}
		}
		t.Notes = input.Notes
		if err := tx.Model(&t).Updates(map[string]any{"notes": t.Notes}).Error; err != nil {
			return err
		}
		result = &t
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.transferRepo.GetByID(result.ID)
}

func (s *Service) DeleteTransfer(id uint) error {
	t, err := s.transferRepo.GetByID(id)
	if err != nil {
		return err
	}
	if t.Status != domain.InventoryTransferStatusPending {
		return &domain.ErrValidation{
			Field:   "status",
			Message: "solo se pueden eliminar transferencias en estado pendiente",
		}
	}
	return s.transferRepo.Delete(id)
}

// AdjustStockByItemID adjusts the quantity of a specific InventoryItem using a
// signed delta inside a DB transaction with row-level locking (BUG-5, BUG-6).
// Deprecated: prefer CreateAdjustment / ApproveAdjustment for managed approval flow.
func (s *Service) AdjustStockByItemID(itemID uint, delta int, reason string) (*domain.InventoryItem, error) {
	s.logger.Info("stock adjusted", zap.Uint("item_id", itemID), zap.Int("delta", delta), zap.String("reason", reason))
	var result *domain.InventoryItem
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var item domain.InventoryItem
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&item, itemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &domain.ErrNotFound{Resource: "inventory_item"}
			}
			return err
		}
		qtyBefore := item.Quantity
		newQty := qtyBefore + delta
		if newQty < 0 {
			return &domain.ErrValidation{
				Field:   "delta",
				Message: "el ajuste resultaría en stock negativo",
			}
		}
		if err := tx.Model(&item).Update("quantity", newQty).Error; err != nil {
			return err
		}
		movType := domain.MovementTypeAdjustmentAdd
		if delta < 0 {
			movType = domain.MovementTypeAdjustmentSub
		}
		movement := &domain.StockMovement{
			ProductID:           item.ProductID,
			WarehouseID:         item.WarehouseID,
			WarehouseLocationID: item.WarehouseLocationID,
			MovementType:        movType,
			ReferenceType:       refType(domain.ReferenceTypeManual),
			QuantityBefore:      qtyBefore,
			QuantityDelta:       delta,
			QuantityAfter:       newQty,
			Notes:               reason,
		}
		if err := tx.Create(movement).Error; err != nil {
			s.logger.Warn("failed to write stock movement for AdjustStockByItemID", zap.Error(err))
		}
		item.Quantity = newQty
		result = &item
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.itemRepo.GetByID(result.ID)
}
