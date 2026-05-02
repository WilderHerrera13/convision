package domain

import (
	"time"

	"gorm.io/gorm"
)

// IdentificationType represents a document type for patient identification.
type IdentificationType struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// AffiliationType represents the patient's health system affiliation type.
type AffiliationType struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CoverageType represents the type of health coverage a patient has.
type CoverageType struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// HealthInsuranceProvider represents a health insurance / EPS entity.
type HealthInsuranceProvider struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EducationLevel represents a patient's education level.
type EducationLevel struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PatientLookupRepository defines read-only catalog queries for patient form dropdowns.
type PatientLookupRepository interface {
	ListIdentificationTypes(db *gorm.DB) ([]*IdentificationType, error)
	ListHealthInsuranceProviders(db *gorm.DB) ([]*HealthInsuranceProvider, error)
	ListAffiliationTypes(db *gorm.DB) ([]*AffiliationType, error)
	ListCoverageTypes(db *gorm.DB) ([]*CoverageType, error)
	ListEducationLevels(db *gorm.DB) ([]*EducationLevel, error)
}

// PaymentMethod represents a payment method accepted in transactions.
type PaymentMethod struct {
	ID                uint      `json:"id"                gorm:"primaryKey;autoIncrement"`
	Name              string    `json:"name"              gorm:"not null"`
	Code              string    `json:"code"              gorm:"uniqueIndex"`
	Description       *string   `json:"description"`
	Icon              *string   `json:"icon"`
	IsActive          bool      `json:"is_active"         gorm:"not null;default:true"`
	RequiresReference bool      `json:"requires_reference" gorm:"not null;default:false"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// PaymentMethodRepository defines persistence operations for PaymentMethod.
type PaymentMethodRepository interface {
	GetByID(db *gorm.DB, id uint) (*PaymentMethod, error)
	Create(db *gorm.DB, e *PaymentMethod) error
	Update(db *gorm.DB, e *PaymentMethod) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*PaymentMethod, int64, error)
	ListActive(db *gorm.DB) ([]*PaymentMethod, error)
}

// ProductCategory represents a category for products (lens, frame, contact_lens, etc.).
type ProductCategory struct {
	ID                 uint      `json:"id"                  gorm:"primaryKey;autoIncrement"`
	Name               string    `json:"name"                gorm:"not null"`
	Slug               string    `json:"slug"                gorm:"uniqueIndex;not null"`
	Description        string    `json:"description"`
	Icon               string    `json:"icon"`
	RequiredAttributes []string  `json:"required_attributes" gorm:"serializer:json"`
	IsActive           bool      `json:"is_active"           gorm:"not null;default:true"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// CategoryWithCount pairs a category with how many products belong to it.
type CategoryWithCount struct {
	*ProductCategory
	ProductCount int64 `json:"product_count"`
}

// ProductCategoryRepository defines persistence operations for ProductCategory.
type ProductCategoryRepository interface {
	GetByID(db *gorm.DB, id uint) (*ProductCategory, error)
	Create(db *gorm.DB, c *ProductCategory) error
	Update(db *gorm.DB, c *ProductCategory) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*ProductCategory, int64, error)
	// All returns every active category without pagination.
	All(db *gorm.DB) ([]*ProductCategory, error)
	// ListWithProductCount returns all categories annotated with the count of associated products.
	ListWithProductCount(db *gorm.DB) ([]*CategoryWithCount, error)
	// GetBySlug returns a single category by its slug.
	GetBySlug(db *gorm.DB, slug string) (*ProductCategory, error)
}

// Brand represents a product brand.
type Brand struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name"        gorm:"not null"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// BrandRepository defines persistence operations for Brand.
type BrandRepository interface {
	GetByID(db *gorm.DB, id uint) (*Brand, error)
	GetByName(db *gorm.DB, name string) (*Brand, error)
	Create(db *gorm.DB, e *Brand) error
	Update(db *gorm.DB, e *Brand) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, page, perPage int) ([]*Brand, int64, error)
}

// Note represents a polymorphic note attachable to products, lenses, etc.
type Note struct {
	ID         uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Content    string    `json:"content"     gorm:"type:text;not null"`
	UserID     uint      `json:"user_id"     gorm:"not null;index"`
	NoteableType string  `json:"notable_type" gorm:"column:notable_type;index"`
	NoteableID   uint    `json:"notable_id"   gorm:"column:notable_id;index"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// LensNote represents a note specifically attached to a lens record.
type LensNote struct {
	ID        uint      `json:"id"        gorm:"primaryKey;autoIncrement"`
	LensID    uint      `json:"lens_id"   gorm:"not null;index"`
	UserID    uint      `json:"user_id"   gorm:"not null;index"`
	Content   string    `json:"content"   gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// NoteRepository defines persistence for polymorphic Note records.
type NoteRepository interface {
	List(db *gorm.DB, noteableType string, noteableID uint, page, perPage int) ([]*Note, int64, error)
	Create(db *gorm.DB, n *Note) error
}
