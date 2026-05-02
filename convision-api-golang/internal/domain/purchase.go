package domain

import (
	"time"

	"gorm.io/gorm"
)

// Purchase represents a purchase invoice from a supplier.
type Purchase struct {
	ID               uint       `json:"id"                gorm:"primaryKey;autoIncrement"`
	SupplierID       uint       `json:"supplier_id"       gorm:"not null;index"`
	PurchaseDate     *time.Time `json:"purchase_date"`
	InvoiceNumber    string     `json:"invoice_number"    gorm:"index"`
	Concept          string     `json:"concept"`
	Subtotal         float64    `json:"subtotal"          gorm:"type:decimal(12,2)"`
	TaxAmount        float64    `json:"tax_amount"        gorm:"type:decimal(12,2)"`
	RetentionAmount  float64    `json:"retention_amount"  gorm:"type:decimal(12,2)"`
	TotalAmount      float64    `json:"total_amount"      gorm:"type:decimal(12,2)"`
	PaymentAmount    float64    `json:"payment_amount"    gorm:"type:decimal(12,2)"`
	Balance          float64    `json:"balance"           gorm:"type:decimal(12,2)"`
	PaymentStatus    string     `json:"payment_status"    gorm:"type:varchar(20);not null;default:'pending'"`
	Status           string     `json:"status"            gorm:"type:varchar(20);not null;default:'pending'"`
	TaxExcluded      bool       `json:"tax_excluded"      gorm:"not null;default:false"`
	InvoiceFile      string     `json:"invoice_file"`
	Notes            string     `json:"notes"             gorm:"type:text"`
	PaymentDueDate   *time.Time `json:"payment_due_date"`
	CreatedByUserID  *uint      `json:"created_by_user_id" gorm:"column:created_by_user_id"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Associations
	Supplier      *Supplier       `json:"supplier,omitempty"       gorm:"foreignKey:SupplierID"`
	CreatedByUser *User           `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedByUserID"`
	Items         []PurchaseItem  `json:"items,omitempty"          gorm:"foreignKey:PurchaseID"`
	Payments      []PurchasePayment `json:"payments,omitempty"     gorm:"foreignKey:PurchaseID"`
}

// PurchaseItem represents a line item within a purchase invoice.
type PurchaseItem struct {
	ID                 uint      `json:"id"                  gorm:"primaryKey;autoIncrement"`
	PurchaseID         uint      `json:"purchase_id"         gorm:"not null;index"`
	ProductID          *uint     `json:"product_id"          gorm:"column:product_id"`
	ProductCode        string    `json:"product_code"`
	ProductDescription string    `json:"product_description" gorm:"type:text"`
	Quantity           float64   `json:"quantity"            gorm:"type:decimal(10,2)"`
	UnitPrice          float64   `json:"unit_price"          gorm:"type:decimal(12,2)"`
	Subtotal           float64   `json:"subtotal"            gorm:"type:decimal(12,2)"`
	TaxRate            float64   `json:"tax_rate"            gorm:"type:decimal(5,2)"`
	TaxAmount          float64   `json:"tax_amount"          gorm:"type:decimal(12,2)"`
	Total              float64   `json:"total"               gorm:"type:decimal(12,2)"`
	Notes              string    `json:"notes"               gorm:"type:text"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	Purchase *Purchase `json:"purchase,omitempty" gorm:"foreignKey:PurchaseID"`
	Product  *Product  `json:"product,omitempty"  gorm:"foreignKey:ProductID"`
}

// PurchasePayment represents a payment made against a purchase invoice.
type PurchasePayment struct {
	ID              uint       `json:"id"                gorm:"primaryKey;autoIncrement"`
	PurchaseID      uint       `json:"purchase_id"       gorm:"not null;index"`
	PaymentMethodID *uint      `json:"payment_method_id" gorm:"column:payment_method_id"`
	Amount          float64    `json:"amount"            gorm:"type:decimal(12,2);not null"`
	PaymentDate     *time.Time `json:"payment_date"`
	Reference       string     `json:"reference"`
	Notes           string     `json:"notes"             gorm:"type:text"`
	CreatedByUserID *uint      `json:"created_by_user_id" gorm:"column:created_by_user_id"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Purchase      *Purchase      `json:"purchase,omitempty"       gorm:"foreignKey:PurchaseID"`
	PaymentMethod *PaymentMethod `json:"payment_method,omitempty" gorm:"foreignKey:PaymentMethodID"`
	CreatedByUser *User          `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedByUserID"`
}

// PurchaseRepository defines persistence operations for Purchase.
type PurchaseRepository interface {
	GetByID(db *gorm.DB, id uint) (*Purchase, error)
	Create(db *gorm.DB, p *Purchase) error
	Update(db *gorm.DB, p *Purchase) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*Purchase, int64, error)
}
