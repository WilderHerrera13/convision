package domain

import (
	"time"

	"gorm.io/gorm"
)

// ProductStatus enumerates valid product statuses.
type ProductStatus string

const (
	ProductStatusEnabled  ProductStatus = "enabled"
	ProductStatusDisabled ProductStatus = "disabled"
)

// Product represents a generic product in the catalogue (frames, contact lenses, accessories).
type Product struct {
	ID                uint          `json:"id"                  gorm:"primaryKey;autoIncrement"`
	InternalCode      string        `json:"internal_code"       gorm:"index"`
	Identifier        string        `json:"identifier"          gorm:"index"`
	Description       string        `json:"description"         gorm:"type:text"`
	Cost              float64       `json:"cost"                gorm:"type:decimal(12,2)"`
	Price             float64       `json:"price"               gorm:"type:decimal(12,2);not null"`
	ProductCategoryID *uint         `json:"product_category_id" gorm:"column:product_category_id"`
	BrandID           *uint         `json:"brand_id"            gorm:"column:brand_id"`
	SupplierID        *uint         `json:"supplier_id"         gorm:"column:supplier_id"`
	Status            ProductStatus `json:"status"              gorm:"type:varchar(20);not null;default:'enabled'"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
	DeletedAt         gorm.DeletedAt   `json:"deleted_at,omitempty" gorm:"index"`

	// Associations
	Category            *ProductCategory            `json:"category,omitempty"              gorm:"foreignKey:ProductCategoryID"`
	Brand               *Brand                      `json:"brand,omitempty"                 gorm:"foreignKey:BrandID"`
	LensAttributes      *ProductLensAttributes      `json:"lens_attributes,omitempty"       gorm:"foreignKey:ProductID"`
	FrameAttributes     *ProductFrameAttributes     `json:"frame_attributes,omitempty"      gorm:"foreignKey:ProductID"`
	ContactLensAttributes *ProductContactLensAttributes `json:"contact_lens_attributes,omitempty" gorm:"foreignKey:ProductID"`
}

// ProductLensAttributes holds ophthalmic-specific attributes for lens products.
type ProductLensAttributes struct {
	ID            uint    `json:"id"              gorm:"primaryKey;autoIncrement"`
	ProductID     uint    `json:"product_id"      gorm:"not null;uniqueIndex"`
	LensTypeID    *uint   `json:"lens_type_id"    gorm:"column:lens_type_id"`
	MaterialID    *uint   `json:"material_id"     gorm:"column:material_id"`
	LensClassID   *uint   `json:"lens_class_id"   gorm:"column:lens_class_id"`
	TreatmentID   *uint   `json:"treatment_id"    gorm:"column:treatment_id"`
	PhotochromicID *uint  `json:"photochromic_id" gorm:"column:photochromic_id"`
	SphereMin     float64 `json:"sphere_min"      gorm:"type:decimal(5,2)"`
	SphereMax     float64 `json:"sphere_max"      gorm:"type:decimal(5,2)"`
	CylinderMin   float64 `json:"cylinder_min"    gorm:"type:decimal(5,2)"`
	CylinderMax   float64 `json:"cylinder_max"    gorm:"type:decimal(5,2)"`
	AdditionMin   float64 `json:"addition_min"    gorm:"type:decimal(5,2)"`
	AdditionMax   float64 `json:"addition_max"    gorm:"type:decimal(5,2)"`
	Diameter      float64 `json:"diameter"        gorm:"type:decimal(5,2)"`
	BaseCurve     float64 `json:"base_curve"      gorm:"type:decimal(5,2)"`
	Prism         float64 `json:"prism"           gorm:"type:decimal(5,2)"`
	UVProtection  bool    `json:"uv_protection"`
	Engraving     string  `json:"engraving"`
	Availability  string  `json:"availability"`

	// Associations
	LensType     *LensType     `json:"lens_type,omitempty"    gorm:"foreignKey:LensTypeID"`
	Material     *Material     `json:"material,omitempty"     gorm:"foreignKey:MaterialID"`
	LensClass    *LensClass    `json:"lens_class,omitempty"   gorm:"foreignKey:LensClassID"`
	Treatment    *Treatment    `json:"treatment,omitempty"    gorm:"foreignKey:TreatmentID"`
	Photochromic *Photochromic `json:"photochromic,omitempty" gorm:"foreignKey:PhotochromicID"`
}

// ProductFrameAttributes holds frame-specific attributes for frame products.
type ProductFrameAttributes struct {
	ID            uint    `json:"id"             gorm:"primaryKey;autoIncrement"`
	ProductID     uint    `json:"product_id"     gorm:"not null;uniqueIndex"`
	FrameType     string  `json:"frame_type"     gorm:"type:varchar(50)"`
	MaterialFrame string  `json:"material_frame" gorm:"type:varchar(50)"`
	Gender        string  `json:"gender"         gorm:"type:varchar(20)"`
	LensWidth     float64 `json:"lens_width"     gorm:"type:decimal(5,2)"`
	BridgeWidth   float64 `json:"bridge_width"   gorm:"type:decimal(5,2)"`
	TempleLength  float64 `json:"temple_length"  gorm:"type:decimal(5,2)"`
	Color         string  `json:"color"          gorm:"type:varchar(50)"`
	Shape         string  `json:"shape"          gorm:"type:varchar(50)"`
}

// ProductContactLensAttributes holds contact-lens-specific attributes.
type ProductContactLensAttributes struct {
	ID                  uint    `json:"id"                    gorm:"primaryKey;autoIncrement"`
	ProductID           uint    `json:"product_id"            gorm:"not null;uniqueIndex"`
	ContactType         string  `json:"contact_type"          gorm:"type:varchar(50)"`
	ReplacementSchedule string  `json:"replacement_schedule"  gorm:"type:varchar(50)"`
	BaseCurve           float64 `json:"base_curve"            gorm:"type:decimal(5,2)"`
	Diameter            float64 `json:"diameter"              gorm:"type:decimal(5,2)"`
	MaterialContact     string  `json:"material_contact"      gorm:"type:varchar(50)"`
	WaterContent        float64 `json:"water_content"         gorm:"type:decimal(5,2)"`
	UVProtection        bool    `json:"uv_protection"`
}

// ProductStockByWarehouse holds aggregated stock for a product grouped by warehouse and location.
type ProductStockByWarehouse struct {
	WarehouseID   uint   `json:"warehouse_id"`
	WarehouseName string `json:"warehouse_name"`
	LocationID    *uint  `json:"location_id"`
	LocationName  string `json:"location_name"`
	Quantity      int    `json:"quantity"`
	Status        string `json:"status"`
}

// PrescriptionFilter holds ranges used to filter lens products by prescription compatibility.
type PrescriptionFilter struct {
	SphereOD   *float64 `json:"sphere_od"`
	CylinderOD *float64 `json:"cylinder_od"`
	AdditionOD *float64 `json:"addition_od"`
	SphereOS   *float64 `json:"sphere_os"`
	CylinderOS *float64 `json:"cylinder_os"`
	AdditionOS *float64 `json:"addition_os"`
}

// ProductRepository defines persistence operations for Product.
type ProductRepository interface {
	GetByID(id uint) (*Product, error)
	Create(p *Product) error
	Update(p *Product) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Product, int64, error)
	Search(query string, category string, page, perPage int) ([]*Product, int64, error)
	BulkUpdateStatus(ids []uint, status string) (int64, error)
	// ListByCategory returns products in a category identified by slug, with optional attribute filters.
	// Supported attribute filter keys for lens: lens_type_id, material_id, lens_class_id, treatment_id, photochromic_id.
	// For frame: frame_type, gender, color, shape. For contact_lens: contact_type, replacement_schedule.
	// Common filters: brand_id, supplier_id, search.
	ListByCategory(slug string, filters map[string]any, page, perPage int) ([]*Product, int64, error)
	// ListByPrescription returns lens products whose sphere/cylinder/addition ranges cover the prescription.
	ListByPrescription(f PrescriptionFilter) ([]*Product, error)
	// StockByProduct returns inventory items for a product grouped by warehouse/location.
	StockByProduct(productID uint) ([]*ProductStockByWarehouse, error)
}
