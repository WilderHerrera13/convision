package domain

import "time"

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
	ListIdentificationTypes() ([]*IdentificationType, error)
	ListHealthInsuranceProviders() ([]*HealthInsuranceProvider, error)
	ListAffiliationTypes() ([]*AffiliationType, error)
	ListCoverageTypes() ([]*CoverageType, error)
	ListEducationLevels() ([]*EducationLevel, error)
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
	GetByID(id uint) (*PaymentMethod, error)
	Create(e *PaymentMethod) error
	Update(e *PaymentMethod) error
	Delete(id uint) error
	List(page, perPage int) ([]*PaymentMethod, int64, error)
	ListActive() ([]*PaymentMethod, error)
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

// ProductCategoryRepository defines persistence operations for ProductCategory.
type ProductCategoryRepository interface {
	GetByID(id uint) (*ProductCategory, error)
	Create(c *ProductCategory) error
	Update(c *ProductCategory) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*ProductCategory, int64, error)
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
	GetByID(id uint) (*Brand, error)
	Create(e *Brand) error
	Update(e *Brand) error
	Delete(id uint) error
	List(page, perPage int) ([]*Brand, int64, error)
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
	List(noteableType string, noteableID uint, page, perPage int) ([]*Note, int64, error)
	Create(n *Note) error
}
