package domain

import "time"

// Warehouse represents a physical storage location.
type Warehouse struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	BranchID  uint      `json:"branch_id"  gorm:"column:branch_id;not null;index"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	Address   string    `json:"address"`
	City      string    `json:"city"`
	Status    string    `json:"status"     gorm:"type:varchar(20);not null;default:'active'"`
	Notes     string    `json:"notes"      gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Locations []WarehouseLocation `json:"locations,omitempty" gorm:"foreignKey:WarehouseID"`
}

// WarehouseLocation represents a specific shelf/zone within a warehouse.
type WarehouseLocation struct {
	ID          uint      `json:"id"           gorm:"primaryKey;autoIncrement"`
	BranchID    uint      `json:"branch_id"    gorm:"column:branch_id;not null;index"`
	WarehouseID uint      `json:"warehouse_id" gorm:"not null;index"`
	Name        string    `json:"name"         gorm:"not null;uniqueIndex:uq_location_name_warehouse"`
	Code        string    `json:"code"         gorm:"index"`
	Type        string    `json:"type"         gorm:"type:varchar(50)"`
	Status      string    `json:"status"       gorm:"type:varchar(20);not null;default:'active'"`
	Description string    `json:"description"  gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Warehouse *Warehouse `json:"warehouse,omitempty" gorm:"foreignKey:WarehouseID"`
}

// InventoryItemStatus enumerates valid inventory item statuses.
type InventoryItemStatus string

const (
	InventoryItemStatusAvailable InventoryItemStatus = "available"
	InventoryItemStatusReserved  InventoryItemStatus = "reserved"
	InventoryItemStatusDamaged   InventoryItemStatus = "damaged"
	InventoryItemStatusSold      InventoryItemStatus = "sold"
	InventoryItemStatusReturned  InventoryItemStatus = "returned"
	InventoryItemStatusLost      InventoryItemStatus = "lost"
)

// InventoryItem represents stock of a product at a specific warehouse location.
type InventoryItem struct {
	ID                  uint                `json:"id"                    gorm:"primaryKey;autoIncrement"`
	BranchID            uint                `json:"branch_id"             gorm:"column:branch_id;not null;index"`
	ProductID           uint                `json:"product_id"            gorm:"not null;index"`
	WarehouseID         uint                `json:"warehouse_id"          gorm:"not null;index"`
	WarehouseLocationID *uint               `json:"warehouse_location_id" gorm:"column:warehouse_location_id"`
	Quantity            int                 `json:"quantity"              gorm:"not null;default:0"`
	Status              InventoryItemStatus `json:"status"                gorm:"type:varchar(20);not null;default:'available'"`
	Notes               string              `json:"notes"                 gorm:"type:text"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`

	// Associations
	Product           *Product           `json:"product,omitempty"            gorm:"foreignKey:ProductID"`
	Warehouse         *Warehouse         `json:"warehouse,omitempty"          gorm:"foreignKey:WarehouseID"`
	WarehouseLocation *WarehouseLocation `json:"warehouse_location,omitempty" gorm:"foreignKey:WarehouseLocationID"`
}

// InventoryTransferStatus enumerates valid transfer statuses.
type InventoryTransferStatus string

const (
	InventoryTransferStatusPending   InventoryTransferStatus = "pending"
	InventoryTransferStatusCompleted InventoryTransferStatus = "completed"
	InventoryTransferStatusCancelled InventoryTransferStatus = "cancelled"
)

// InventoryTransfer represents a movement of stock between locations.
type InventoryTransfer struct {
	ID                    uint                    `json:"id"                      gorm:"primaryKey;autoIncrement"`
	BranchID              uint                    `json:"branch_id"               gorm:"column:branch_id;not null;index"`
	ProductID             uint                    `json:"product_id"              gorm:"column:product_id;not null"`
	SourceLocationID      uint                    `json:"source_location_id"      gorm:"not null;index"`
	DestinationLocationID uint                    `json:"destination_location_id" gorm:"not null;index"`
	Quantity              int                     `json:"quantity"                gorm:"not null"`
	TransferredBy         *uint                   `json:"transferred_by"          gorm:"column:transferred_by"`
	Notes                 string                  `json:"notes"                   gorm:"type:text"`
	Status                InventoryTransferStatus `json:"status"                  gorm:"type:varchar(20);not null;default:'pending'"`
	CompletedAt           *time.Time              `json:"completed_at"`
	CreatedAt             time.Time               `json:"created_at"`
	UpdatedAt             time.Time               `json:"updated_at"`

	// Associations
	Product             *Product           `json:"product,omitempty"              gorm:"foreignKey:ProductID"`
	SourceLocation      *WarehouseLocation `json:"source_location,omitempty"      gorm:"foreignKey:SourceLocationID"`
	DestinationLocation *WarehouseLocation `json:"destination_location,omitempty" gorm:"foreignKey:DestinationLocationID"`
	TransferredByUser   *User              `json:"transferred_by_user,omitempty"  gorm:"foreignKey:TransferredBy"`
}

// WarehouseRepository defines persistence operations for Warehouse.
type WarehouseRepository interface {
	GetByID(id uint) (*Warehouse, error)
	Create(w *Warehouse) error
	Update(w *Warehouse) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Warehouse, int64, error)
	ListLocations(warehouseID uint) ([]*WarehouseLocation, error)
}

// WarehouseLocationRepository defines persistence operations for WarehouseLocation.
type WarehouseLocationRepository interface {
	GetByID(id uint) (*WarehouseLocation, error)
	Create(l *WarehouseLocation) error
	Update(l *WarehouseLocation) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*WarehouseLocation, int64, error)
}

// ProductStockEntry holds the aggregated stock quantity for a single product.
type ProductStockEntry struct {
	ProductID     uint   `json:"product_id"`
	ProductName   string `json:"product_name"`
	TotalQuantity int64  `json:"total_quantity"`
}

// InventoryItemRepository defines persistence operations for InventoryItem.
type InventoryItemRepository interface {
	GetByID(id uint) (*InventoryItem, error)
	Create(i *InventoryItem) error
	Update(i *InventoryItem) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*InventoryItem, int64, error)
	TotalStock() (int64, error)
	// TotalStockPerProduct returns aggregated stock grouped by product.
	// Supported filter keys: warehouse_id, warehouse_location_id.
	TotalStockPerProduct(filters map[string]any) ([]*ProductStockEntry, error)
	// ExistsByProductAndLocation returns true when an InventoryItem already
	// exists for the given (productID, locationID) pair, optionally excluding
	// the item with excludeID (use 0 to skip the exclusion).
	ExistsByProductAndLocation(productID, locationID, excludeID uint) (bool, error)
}

// InventoryTransferRepository defines persistence operations for InventoryTransfer.
type InventoryTransferRepository interface {
	GetByID(id uint) (*InventoryTransfer, error)
	Create(t *InventoryTransfer) error
	Update(t *InventoryTransfer) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*InventoryTransfer, int64, error)
}

// MovementType enumerates valid stock movement types for the Kardex.
type MovementType string

const (
	MovementTypeEntry         MovementType = "entry"
	MovementTypeExit          MovementType = "exit"
	MovementTypeTransferOut   MovementType = "transfer_out"
	MovementTypeTransferIn    MovementType = "transfer_in"
	MovementTypeAdjustmentAdd MovementType = "adjustment_add"
	MovementTypeAdjustmentSub MovementType = "adjustment_sub"
	MovementTypeReserve       MovementType = "reserve"
	MovementTypeRelease       MovementType = "release"
)

// ReferenceType enumerates the origin document types for stock movements.
type ReferenceType string

const (
	ReferenceTypeManual     ReferenceType = "manual"
	ReferenceTypeTransfer   ReferenceType = "transfer"
	ReferenceTypeSale       ReferenceType = "sale"
	ReferenceTypePurchase   ReferenceType = "purchase"
	ReferenceTypeAdjustment ReferenceType = "adjustment"
)

// StockMovement is an immutable Kardex entry recording every quantity change on an InventoryItem.
type StockMovement struct {
	ID                  uint           `json:"id"                    gorm:"primaryKey;autoIncrement"`
	ProductID           uint           `json:"product_id"            gorm:"not null;index"`
	WarehouseID         uint           `json:"warehouse_id"          gorm:"not null;index"`
	WarehouseLocationID *uint          `json:"warehouse_location_id"`
	MovementType        MovementType   `json:"movement_type"         gorm:"type:varchar(30);not null;index"`
	ReferenceType       *ReferenceType `json:"reference_type"        gorm:"type:varchar(30)"`
	ReferenceID         *uint          `json:"reference_id"`
	QuantityBefore      int            `json:"quantity_before"       gorm:"not null"`
	QuantityDelta       int            `json:"quantity_delta"        gorm:"not null"`
	QuantityAfter       int            `json:"quantity_after"        gorm:"not null"`
	UnitCost            float64        `json:"unit_cost"             gorm:"type:decimal(12,2);not null;default:0"`
	PerformedBy         *uint          `json:"performed_by"          gorm:"index"`
	Notes               string         `json:"notes"                 gorm:"type:text"`
	CreatedAt           time.Time      `json:"created_at"`

	// Associations
	Product           *Product           `json:"product,omitempty"            gorm:"foreignKey:ProductID"`
	Warehouse         *Warehouse         `json:"warehouse,omitempty"          gorm:"foreignKey:WarehouseID"`
	WarehouseLocation *WarehouseLocation `json:"warehouse_location,omitempty" gorm:"foreignKey:WarehouseLocationID"`
}

// StockMovementRepository defines persistence for StockMovement (Kardex).
type StockMovementRepository interface {
	Create(m *StockMovement) error
	List(filters map[string]any, page, perPage int) ([]*StockMovement, int64, error)
	ListByProduct(productID uint, page, perPage int) ([]*StockMovement, int64, error)
}

// AdjustmentStatus enumerates valid statuses for inventory adjustments.
type AdjustmentStatus string

const (
	AdjustmentStatusPendingApproval AdjustmentStatus = "pending_approval"
	AdjustmentStatusApproved        AdjustmentStatus = "approved"
	AdjustmentStatusRejected        AdjustmentStatus = "rejected"
)

// AdjustmentReason enumerates valid reason codes for manual inventory adjustments.
type AdjustmentReason string

const (
	AdjustmentReasonDamage          AdjustmentReason = "damage"
	AdjustmentReasonExpiry          AdjustmentReason = "expiry"
	AdjustmentReasonTheft           AdjustmentReason = "theft"
	AdjustmentReasonCountCorrection AdjustmentReason = "count_correction"
	AdjustmentReasonReturn          AdjustmentReason = "return"
	AdjustmentReasonWarranty        AdjustmentReason = "warranty"
	AdjustmentReasonSupplierDefect  AdjustmentReason = "supplier_defect"
)

// InventoryAdjustment represents a manual stock adjustment pending admin approval.
type InventoryAdjustment struct {
	ID               uint             `json:"id"                gorm:"primaryKey;autoIncrement"`
	InventoryItemID  uint             `json:"inventory_item_id" gorm:"not null;index"`
	AdjustmentReason AdjustmentReason `json:"adjustment_reason" gorm:"type:varchar(50);not null"`
	QuantityDelta    int              `json:"quantity_delta"    gorm:"not null"`
	QuantityBefore   int              `json:"quantity_before"   gorm:"not null"`
	QuantityAfter    int              `json:"quantity_after"    gorm:"not null"`
	Status           AdjustmentStatus `json:"status"            gorm:"type:varchar(20);not null;default:'pending_approval'"`
	RequestedBy      uint             `json:"requested_by"      gorm:"not null;index"`
	ApprovedBy       *uint            `json:"approved_by"`
	Notes            string           `json:"notes"             gorm:"type:text"`
	EvidenceURL      string           `json:"evidence_url"`
	ReviewedAt       *time.Time       `json:"reviewed_at"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`

	// Associations
	InventoryItem *InventoryItem `json:"inventory_item,omitempty" gorm:"foreignKey:InventoryItemID"`
}

// InventoryAdjustmentRepository defines persistence for InventoryAdjustment.
type InventoryAdjustmentRepository interface {
	GetByID(id uint) (*InventoryAdjustment, error)
	Create(a *InventoryAdjustment) error
	Update(a *InventoryAdjustment) error
	List(filters map[string]any, page, perPage int) ([]*InventoryAdjustment, int64, error)
}
