package domain

import (
	"time"

	"gorm.io/gorm"
)

// LensType represents a lens type classification (e.g. monofocal, bifocal, progressive).
type LensType struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name"        gorm:"not null"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// LensTypeRepository defines persistence operations for LensType.
type LensTypeRepository interface {
	GetByID(db *gorm.DB, id uint) (*LensType, error)
	GetByName(db *gorm.DB, name string) (*LensType, error)
	Create(db *gorm.DB, e *LensType) error
	Update(db *gorm.DB, e *LensType) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*LensType, int64, error)
}

// LensClass represents the optical class of a lens (e.g. single vision, progressive).
type LensClass struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name"        gorm:"not null"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// LensClassRepository defines persistence operations for LensClass.
type LensClassRepository interface {
	GetByID(db *gorm.DB, id uint) (*LensClass, error)
	GetByName(db *gorm.DB, name string) (*LensClass, error)
	Create(db *gorm.DB, e *LensClass) error
	Update(db *gorm.DB, e *LensClass) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*LensClass, int64, error)
}

// Material represents the material of a lens (e.g. CR-39, polycarbonate, trivex).
type Material struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name"        gorm:"not null"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// MaterialRepository defines persistence operations for Material.
type MaterialRepository interface {
	GetByID(db *gorm.DB, id uint) (*Material, error)
	GetByName(db *gorm.DB, name string) (*Material, error)
	Create(db *gorm.DB, e *Material) error
	Update(db *gorm.DB, e *Material) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*Material, int64, error)
}

// Treatment represents a lens treatment (e.g. anti-reflex, hardening, UV).
type Treatment struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name"        gorm:"not null"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TreatmentRepository defines persistence operations for Treatment.
type TreatmentRepository interface {
	GetByID(db *gorm.DB, id uint) (*Treatment, error)
	GetByName(db *gorm.DB, name string) (*Treatment, error)
	Create(db *gorm.DB, e *Treatment) error
	Update(db *gorm.DB, e *Treatment) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*Treatment, int64, error)
}

// Photochromic represents a photochromic option for lenses.
type Photochromic struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name"        gorm:"not null"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PhotochromicRepository defines persistence operations for Photochromic.
type PhotochromicRepository interface {
	GetByID(db *gorm.DB, id uint) (*Photochromic, error)
	GetByName(db *gorm.DB, name string) (*Photochromic, error)
	Create(db *gorm.DB, e *Photochromic) error
	Update(db *gorm.DB, e *Photochromic) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*Photochromic, int64, error)
}

// LensStatus enumerates valid lens statuses.
type LensStatus string

const (
	LensStatusEnabled  LensStatus = "enabled"
	LensStatusDisabled LensStatus = "disabled"
)

// Lens represents an ophthalmic lens product in the catalogue.
type Lens struct {
	ID            uint       `json:"id"             gorm:"primaryKey;autoIncrement"`
	InternalCode  string     `json:"internal_code"  gorm:"index"`
	Identifier    string     `json:"identifier"     gorm:"index"`
	TypeID        *uint      `json:"type_id"        gorm:"column:type_id"`
	BrandID       *uint      `json:"brand_id"       gorm:"column:brand_id"`
	MaterialID    *uint      `json:"material_id"    gorm:"column:material_id"`
	LensClassID   *uint      `json:"lens_class_id"  gorm:"column:lens_class_id"`
	TreatmentID   *uint      `json:"treatment_id"   gorm:"column:treatment_id"`
	PhotochromicID *uint     `json:"photochromic_id" gorm:"column:photochromic_id"`
	Description   string     `json:"description"    gorm:"type:text"`
	SupplierID    *uint      `json:"supplier_id"    gorm:"column:supplier_id"`
	Price         float64    `json:"price"          gorm:"type:decimal(12,2);not null"`
	Cost          float64    `json:"cost"           gorm:"type:decimal(12,2)"`
	SphereMin     float64    `json:"sphere_min"     gorm:"type:decimal(5,2)"`
	SphereMax     float64    `json:"sphere_max"     gorm:"type:decimal(5,2)"`
	CylinderMin   float64    `json:"cylinder_min"   gorm:"type:decimal(5,2)"`
	CylinderMax   float64    `json:"cylinder_max"   gorm:"type:decimal(5,2)"`
	AdditionMin   float64    `json:"addition_min"   gorm:"type:decimal(5,2)"`
	AdditionMax   float64    `json:"addition_max"   gorm:"type:decimal(5,2)"`
	Status        LensStatus `json:"status"         gorm:"type:varchar(20);not null;default:'enabled'"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// Associations
	LensType     *LensType     `json:"lens_type,omitempty"    gorm:"foreignKey:TypeID"`
	Brand        *Brand        `json:"brand,omitempty"        gorm:"foreignKey:BrandID"`
	Material     *Material     `json:"material,omitempty"     gorm:"foreignKey:MaterialID"`
	LensClass    *LensClass    `json:"lens_class,omitempty"   gorm:"foreignKey:LensClassID"`
	Treatment    *Treatment    `json:"treatment,omitempty"    gorm:"foreignKey:TreatmentID"`
	Photochromic *Photochromic `json:"photochromic,omitempty" gorm:"foreignKey:PhotochromicID"`
}

// LensRepository defines persistence operations for Lens.
type LensRepository interface {
	GetByID(db *gorm.DB, id uint) (*Lens, error)
	GetByInternalCode(db *gorm.DB, code string) (*Lens, error)
	Create(db *gorm.DB, l *Lens) error
	Update(db *gorm.DB, l *Lens) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*Lens, int64, error)
}
