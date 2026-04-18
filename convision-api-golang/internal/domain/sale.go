package domain

import "time"

// SaleStatus enumerates valid sale statuses.
type SaleStatus string

const (
	SaleStatusPending   SaleStatus = "pending"
	SaleStatusCompleted SaleStatus = "completed"
	SaleStatusCancelled SaleStatus = "cancelled"
	SaleStatusRefunded  SaleStatus = "refunded"
)

// Sale represents a commercial transaction with a patient.
type Sale struct {
	ID            uint       `json:"id"             gorm:"primaryKey;autoIncrement"`
	SaleNumber    string     `json:"sale_number"    gorm:"uniqueIndex;not null"`
	OrderID       *uint      `json:"order_id"       gorm:"column:order_id"`
	PatientID     uint       `json:"patient_id"     gorm:"not null;index"`
	AppointmentID *uint      `json:"appointment_id" gorm:"column:appointment_id"`
	Subtotal      float64    `json:"subtotal"       gorm:"type:decimal(12,2)"`
	Tax           float64    `json:"tax"            gorm:"type:decimal(12,2)"`
	Discount      float64    `json:"discount"       gorm:"type:decimal(12,2)"`
	Total         float64    `json:"total"          gorm:"type:decimal(12,2)"`
	AmountPaid    float64    `json:"amount_paid"    gorm:"type:decimal(12,2)"`
	Balance       float64    `json:"balance"        gorm:"type:decimal(12,2)"`
	Status        SaleStatus `json:"status"         gorm:"type:varchar(20);not null;default:'pending'"`
	PaymentStatus string     `json:"payment_status" gorm:"type:varchar(20);not null;default:'pending'"`
	Notes         string     `json:"notes"          gorm:"type:text"`
	CreatedBy     *uint      `json:"created_by"     gorm:"column:created_by"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// Associations
	Patient             *Patient               `json:"patient,omitempty"              gorm:"foreignKey:PatientID"`
	CreatedByUser       *User                  `json:"created_by_user,omitempty"      gorm:"foreignKey:CreatedBy"`
	Items               []SaleItem             `json:"items,omitempty"                gorm:"foreignKey:SaleID"`
	Payments            []SalePayment          `json:"payments"                     gorm:"foreignKey:SaleID"`
	PartialPayments     []PartialPayment       `json:"partial_payments"              gorm:"foreignKey:SaleID"`
	LensPriceAdjustments []SaleLensPriceAdjustment `json:"lens_price_adjustments,omitempty" gorm:"foreignKey:SaleID"`
	LaboratoryOrders    []LaboratoryOrder      `json:"laboratory_orders"            gorm:"-"`
}

// SaleItem represents a line item within a sale.
type SaleItem struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	SaleID    uint      `json:"sale_id"    gorm:"not null;index"`
	LensID    *uint     `json:"lens_id"    gorm:"column:lens_id"`
	Quantity  int       `json:"quantity"   gorm:"not null;default:1"`
	Price     float64   `json:"price"      gorm:"type:decimal(12,2)"`
	Discount  float64   `json:"discount"   gorm:"type:decimal(12,2)"`
	Total     float64   `json:"total"      gorm:"type:decimal(12,2)"`
	Notes     string    `json:"notes"      gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Sale    *Sale    `json:"sale,omitempty"    gorm:"foreignKey:SaleID"`
	Product *Product `json:"product,omitempty" gorm:"foreignKey:LensID"`
}

// SalePayment represents an initial payment made for a sale.
type SalePayment struct {
	ID              uint       `json:"id"                gorm:"primaryKey;autoIncrement"`
	SaleID          uint       `json:"sale_id"           gorm:"not null;index"`
	PaymentMethodID *uint      `json:"payment_method_id" gorm:"column:payment_method_id"`
	Amount          float64    `json:"amount"            gorm:"type:decimal(12,2);not null"`
	ReferenceNumber string     `json:"reference_number"`
	Notes           string     `json:"notes"             gorm:"type:text"`
	CreatedBy       *uint      `json:"created_by"        gorm:"column:created_by"`
	PaymentDate     *time.Time `json:"payment_date"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Sale          *Sale          `json:"sale,omitempty"           gorm:"foreignKey:SaleID"`
	PaymentMethod *PaymentMethod `json:"payment_method,omitempty" gorm:"foreignKey:PaymentMethodID"`
	CreatedByUser *User          `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
}

// PartialPayment represents an installment (abono) applied to an existing sale balance.
type PartialPayment struct {
	ID              uint       `json:"id"                gorm:"primaryKey;autoIncrement"`
	SaleID          uint       `json:"sale_id"           gorm:"not null;index"`
	PaymentMethodID *uint      `json:"payment_method_id" gorm:"column:payment_method_id"`
	Amount          float64    `json:"amount"            gorm:"type:decimal(12,2);not null"`
	ReferenceNumber string     `json:"reference_number"`
	PaymentDate     *time.Time `json:"payment_date"`
	Notes           string     `json:"notes"             gorm:"type:text"`
	CreatedBy       *uint      `json:"created_by"        gorm:"column:created_by"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Sale          *Sale          `json:"sale,omitempty"           gorm:"foreignKey:SaleID"`
	PaymentMethod *PaymentMethod `json:"payment_method,omitempty" gorm:"foreignKey:PaymentMethodID"`
	CreatedByUser *User          `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
}

// SaleLensPriceAdjustment records manual upward price adjustments applied to a sale lens item.
type SaleLensPriceAdjustment struct {
	ID               uint      `json:"id"                gorm:"primaryKey;autoIncrement"`
	SaleID           uint      `json:"sale_id"           gorm:"not null;index"`
	LensID           *uint     `json:"lens_id"           gorm:"column:lens_id"`
	BasePrice        float64   `json:"base_price"        gorm:"type:decimal(12,2)"`
	AdjustedPrice    float64   `json:"adjusted_price"    gorm:"type:decimal(12,2)"`
	AdjustmentAmount float64   `json:"adjustment_amount" gorm:"type:decimal(12,2)"`
	Reason           string    `json:"reason"            gorm:"type:text"`
	AdjustedBy       *uint     `json:"adjusted_by"       gorm:"column:adjusted_by"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	Sale           *Sale    `json:"sale,omitempty"            gorm:"foreignKey:SaleID"`
	Lens           *Product `json:"lens,omitempty"            gorm:"foreignKey:LensID"`
	AdjustedByUser *User    `json:"adjusted_by_user,omitempty" gorm:"foreignKey:AdjustedBy"`
}

// SaleRepository defines persistence operations for Sale.
type SaleRepository interface {
	GetByID(id uint) (*Sale, error)
	GetBySaleNumber(number string) (*Sale, error)
	Create(s *Sale) error
	Update(s *Sale) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Sale, int64, error)
	AddPayment(payment *SalePayment) error
	RemovePayment(saleID, paymentID uint) error
	GetStats() (map[string]any, error)
	GetTodayStats() (map[string]any, error)
}

// SaleLensPriceAdjustmentRepository defines persistence for lens price adjustments.
type SaleLensPriceAdjustmentRepository interface {
	GetBySaleID(saleID uint) ([]*SaleLensPriceAdjustment, error)
	GetByID(id uint) (*SaleLensPriceAdjustment, error)
	Create(adj *SaleLensPriceAdjustment) error
	Delete(id uint) error
	GetBySaleLens(saleID, lensID uint) (*SaleLensPriceAdjustment, error)
}
