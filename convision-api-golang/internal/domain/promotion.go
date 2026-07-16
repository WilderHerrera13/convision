package domain

import (
	"time"

	"gorm.io/gorm"
)

// PromotionType enumerates the supported marketing promotion mechanics.
type PromotionType string

const (
	// PromotionTypeCartTotal applies a discount when the cart subtotal reaches MinCartTotal.
	PromotionTypeCartTotal PromotionType = "cart_total"
	// PromotionTypeFixedAmount applies a flat currency discount (optionally gated by MinCartTotal).
	PromotionTypeFixedAmount PromotionType = "fixed_amount"
	// PromotionTypeBirthday applies a discount during the patient's birthday month.
	PromotionTypeBirthday PromotionType = "birthday"
	// PromotionTypeCategory applies a discount only to items matching a category/brand/product type.
	PromotionTypeCategory PromotionType = "category"
	// PromotionTypeSecondPair applies a discount to the cheapest additional qualifying unit.
	PromotionTypeSecondPair PromotionType = "second_pair"
	// PromotionTypeCrossProduct discounts a set of target items when a trigger item is in the cart
	// (e.g. "buy a frame, get 20% off lenses").
	PromotionTypeCrossProduct PromotionType = "cross_product"
)

// ValidPromotionType reports whether t is a supported promotion type.
func ValidPromotionType(t PromotionType) bool {
	switch t {
	case PromotionTypeCartTotal, PromotionTypeFixedAmount, PromotionTypeBirthday,
		PromotionTypeCategory, PromotionTypeSecondPair, PromotionTypeCrossProduct:
		return true
	default:
		return false
	}
}

// PromotionScope enumerates which cart items a category-scoped promotion targets.
type PromotionScope string

const (
	PromotionScopeCart        PromotionScope = "cart"
	PromotionScopeCategory    PromotionScope = "category"
	PromotionScopeBrand       PromotionScope = "brand"
	PromotionScopeProductType PromotionScope = "product_type"
)

// Promotion is an admin-configured marketing rule evaluated automatically at checkout.
// Unlike DiscountRequest (a manual, per-product/patient approval), a Promotion is a
// campaign rule applied to the whole cart when its conditions match.
type Promotion struct {
	ID       uint          `json:"id"       gorm:"primaryKey;autoIncrement"`
	Name     string        `json:"name"     gorm:"type:varchar(150);not null"`
	Type     PromotionType `json:"type"     gorm:"type:varchar(30);not null;index"`
	Active   bool          `json:"active"   gorm:"not null;default:true"`
	Priority int           `json:"priority" gorm:"not null;default:0"`
	// Stackable exempts the promotion from mutual-exclusivity: it may overlap other
	// promotions (share the same lines / stack on top of the cart) instead of competing.
	Stackable bool `json:"stackable" gorm:"not null;default:false"`

	// Mechanic parameters — nullable, interpreted per Type.
	DiscountPercentage *float64 `json:"discount_percentage" gorm:"type:decimal(5,2)"`
	DiscountAmount     *float64 `json:"discount_amount"     gorm:"type:decimal(12,2)"`
	MinCartTotal       *float64 `json:"min_cart_total"      gorm:"type:decimal(12,2)"`
	MinQuantity        *int     `json:"min_quantity"`

	// Target scope — which items the discount applies to (also the category-promotion scope).
	Scope             PromotionScope `json:"scope"               gorm:"type:varchar(20);not null;default:'cart'"`
	ProductCategoryID *uint          `json:"product_category_id" gorm:"column:product_category_id"`
	BrandID           *uint          `json:"brand_id"            gorm:"column:brand_id"`
	ProductType       string         `json:"product_type"        gorm:"type:varchar(30)"`

	// Trigger scope — for cross_product: what must be present in the cart to activate the reward.
	TriggerScope             PromotionScope `json:"trigger_scope"               gorm:"type:varchar(20)"`
	TriggerProductCategoryID *uint          `json:"trigger_product_category_id" gorm:"column:trigger_product_category_id"`
	TriggerBrandID           *uint          `json:"trigger_brand_id"            gorm:"column:trigger_brand_id"`
	TriggerProductType       string         `json:"trigger_product_type"        gorm:"type:varchar(30)"`

	// Validity window — both optional. A nil bound means "no limit" on that side.
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`

	Description string         `json:"description" gorm:"type:text"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Associations
	Category *ProductCategory `json:"category,omitempty" gorm:"foreignKey:ProductCategoryID"`
	Brand    *Brand           `json:"brand,omitempty"    gorm:"foreignKey:BrandID"`
}

// TableName pins the table name.
func (Promotion) TableName() string { return "promotions" }

// PromotionFilter holds query parameters for listing promotions.
type PromotionFilter struct {
	Pagination
	Type   string `form:"type"`
	Active *bool  `form:"active"`
	Search string `form:"search"`
}

// PromotionRepository defines persistence operations for Promotion.
type PromotionRepository interface {
	GetByID(db *gorm.DB, id uint) (*Promotion, error)
	Create(db *gorm.DB, p *Promotion) error
	Update(db *gorm.DB, p *Promotion) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, f PromotionFilter) ([]*Promotion, int64, error)
	// ListActiveAt returns active promotions whose validity window contains `at`,
	// ordered by priority desc — the candidate set for checkout evaluation.
	ListActiveAt(db *gorm.DB, at time.Time) ([]*Promotion, error)
}
