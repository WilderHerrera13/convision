package domain

import "time"

// Warehouse represents a physical storage location.
type Warehouse struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	ClinicID  uint      `json:"clinic_id"  gorm:"not null;index"`
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
	ClinicID    uint      `json:"clinic_id"    gorm:"not null;index"`
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

// InventoryItem represents stock of a product or lens at a specific warehouse location.
// Exactly one of ProductID or LensID must be set.
type InventoryItem struct {
	ID                  uint                `json:"id"                    gorm:"primaryKey;autoIncrement"`
	ClinicID            uint                `json:"clinic_id"             gorm:"not null;index"`
	ProductID           *uint               `json:"product_id"            gorm:"index"`
	LensID              *uint               `json:"lens_id"               gorm:"column:lens_id;index"`
	WarehouseID         uint                `json:"warehouse_id"          gorm:"not null;index"`
	WarehouseLocationID *uint               `json:"warehouse_location_id" gorm:"column:warehouse_location_id"`
	Quantity            int                 `json:"quantity"              gorm:"not null;default:0"`
	Status              InventoryItemStatus `json:"status"                gorm:"type:varchar(20);not null;default:'available'"`
	Notes               string              `json:"notes"                 gorm:"type:text"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`

	// Associations
	Product           *Product           `json:"product,omitempty"            gorm:"foreignKey:ProductID"`
	Lens              *Lens              `json:"lens,omitempty"               gorm:"foreignKey:LensID"`
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
	ClinicID              uint                    `json:"clinic_id"               gorm:"not null;index"`
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

// LensStockEntry holds aggregated stock for a lens, returned by the total-stock endpoint.
type LensStockEntry struct {
	ID            uint   `json:"id"`
	InternalCode  string `json:"internal_code"`
	Identifier    string `json:"identifier"`
	BrandName     string `json:"brand_name"`
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
	// TotalStockPerLens returns all lenses with their aggregated available stock.
	// Uses a LEFT JOIN so lenses with zero inventory are included.
	// Supported filter keys: warehouse_id, warehouse_location_id.
	TotalStockPerLens(filters map[string]any, page, perPage int) ([]*LensStockEntry, int64, error)
	// GetLensInventory returns all inventory items for a given lens.
	GetLensInventory(lensID uint) ([]*InventoryItem, int64, error)
	// ExistsByProductAndLocation returns true when an InventoryItem already
	// exists for the given (productID, locationID) pair, optionally excluding
	// the item with excludeID (use 0 to skip the exclusion).
	ExistsByProductAndLocation(productID, locationID, excludeID uint) (bool, error)
	// ExistsByLensAndLocation returns true when an InventoryItem already
	// exists for the given (lensID, locationID) pair, optionally excluding excludeID.
	ExistsByLensAndLocation(lensID, locationID, excludeID uint) (bool, error)
}

// InventoryTransferRepository defines persistence operations for InventoryTransfer.
type InventoryTransferRepository interface {
	GetByID(id uint) (*InventoryTransfer, error)
	Create(t *InventoryTransfer) error
	Update(t *InventoryTransfer) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*InventoryTransfer, int64, error)
}
