package domain

import "time"

// QuoteStatus enumerates valid quote statuses.
type QuoteStatus string

const (
	QuoteStatusPending   QuoteStatus = "pending"
	QuoteStatusApproved  QuoteStatus = "approved"
	QuoteStatusRejected  QuoteStatus = "rejected"
	QuoteStatusConverted QuoteStatus = "converted"
	QuoteStatusExpired   QuoteStatus = "expired"
)

// Quote represents a price estimate presented to a patient before a sale.
type Quote struct {
	ID             uint        `json:"id"              gorm:"primaryKey;autoIncrement"`
	QuoteNumber    string      `json:"quote_number"    gorm:"uniqueIndex;not null"`
	PatientID      uint        `json:"patient_id"      gorm:"not null;index"`
	Subtotal       float64     `json:"subtotal"        gorm:"type:decimal(12,2)"`
	TaxAmount      float64     `json:"tax"            gorm:"column:tax_amount;type:decimal(12,2)"`
	DiscountAmount float64     `json:"discount"        gorm:"column:discount_amount;type:decimal(12,2)"`
	Total          float64     `json:"total"           gorm:"type:decimal(12,2)"`
	Status         QuoteStatus `json:"status"          gorm:"type:varchar(20);not null;default:'pending'"`
	ExpirationDate *time.Time  `json:"expiration_date"`
	Notes          string      `json:"notes"           gorm:"type:text"`
	CreatedBy      *uint       `json:"created_by"      gorm:"column:created_by"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`

	// Associations
	Patient       *Patient    `json:"patient,omitempty"        gorm:"foreignKey:PatientID"`
	CreatedByUser *User       `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	Items         []QuoteItem `json:"items,omitempty"          gorm:"foreignKey:QuoteID"`
}

// QuoteItem represents a line item within a quote.
type QuoteItem struct {
	ID                 uint      `json:"id"                  gorm:"primaryKey;autoIncrement"`
	QuoteID            uint      `json:"quote_id"            gorm:"not null;index"`
	ProductID          *uint     `json:"product_id"          gorm:"column:product_id"`
	ProductType        string    `json:"product_type"        gorm:"type:varchar(50)"`
	Name               string    `json:"name"`
	Description        string    `json:"description"         gorm:"type:text"`
	Quantity           int       `json:"quantity"            gorm:"not null;default:1"`
	Price              float64   `json:"price"               gorm:"type:decimal(12,2)"`
	OriginalPrice      float64   `json:"original_price"      gorm:"type:decimal(12,2)"`
	DiscountPercentage float64   `json:"discount_percentage" gorm:"type:decimal(5,2)"`
	Total              float64   `json:"total"               gorm:"type:decimal(12,2)"`
	Notes              string    `json:"notes"               gorm:"type:text"`
	DiscountID         *uint     `json:"discount_id"         gorm:"column:discount_id"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	Quote   *Quote   `json:"quote,omitempty"   gorm:"foreignKey:QuoteID"`
	Product *Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
}

// QuoteRepository defines persistence operations for Quote.
type QuoteRepository interface {
	GetByID(id uint) (*Quote, error)
	GetByQuoteNumber(number string) (*Quote, error)
	Create(q *Quote) error
	Update(q *Quote) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Quote, int64, error)
}
