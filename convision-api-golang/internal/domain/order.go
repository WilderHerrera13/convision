package domain

import "time"

// OrderStatus enumerates valid order statuses.
type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusCompleted  OrderStatus = "completed"
	OrderStatusCancelled  OrderStatus = "cancelled"
	OrderStatusOnHold     OrderStatus = "on-hold"
)

// Order represents a customer order (may generate a sale and/or laboratory order).
type Order struct {
	ID                  uint        `json:"id"                    gorm:"primaryKey;autoIncrement"`
	OrderNumber         string      `json:"order_number"          gorm:"uniqueIndex;not null"`
	PatientID           uint        `json:"patient_id"            gorm:"not null;index"`
	AppointmentID       *uint       `json:"appointment_id"        gorm:"column:appointment_id"`
	LaboratoryID        *uint       `json:"laboratory_id"         gorm:"column:laboratory_id"`
	Total               float64     `json:"total"                 gorm:"type:decimal(12,2)"`
	Tax                 float64     `json:"tax"                   gorm:"type:decimal(12,2)"`
	Subtotal            float64     `json:"subtotal"              gorm:"type:decimal(12,2)"`
	Status              OrderStatus `json:"status"                gorm:"type:varchar(20);not null;default:'pending'"`
	PaymentStatus       string      `json:"payment_status"        gorm:"type:varchar(20)"`
	Notes               string      `json:"notes"                 gorm:"type:text"`
	CreatedBy           *uint       `json:"created_by"            gorm:"column:created_by"`
	PdfToken            string      `json:"pdf_token"             gorm:"type:varchar(255)"`
	LaboratoryPdfToken  string      `json:"laboratory_pdf_token"  gorm:"type:varchar(255)"`
	CreatedAt           time.Time   `json:"created_at"`
	UpdatedAt           time.Time   `json:"updated_at"`

	// Associations
	Patient       *Patient    `json:"patient,omitempty"        gorm:"foreignKey:PatientID"`
	Laboratory    *Laboratory `json:"laboratory,omitempty"     gorm:"foreignKey:LaboratoryID"`
	CreatedByUser *User       `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	Items         []OrderItem `json:"items,omitempty"          gorm:"foreignKey:OrderID"`
}

// OrderItem represents a line item within an order.
type OrderItem struct {
	ID          uint      `json:"id"           gorm:"primaryKey;autoIncrement"`
	OrderID     uint      `json:"order_id"     gorm:"not null;index"`
	ProductID   *uint     `json:"product_id"   gorm:"column:product_id"`
	ProductType string    `json:"product_type" gorm:"type:varchar(50)"`
	Name        string    `json:"name"`
	Description string    `json:"description"  gorm:"type:text"`
	Quantity    int       `json:"quantity"     gorm:"not null;default:1"`
	Price       float64   `json:"price"        gorm:"type:decimal(12,2)"`
	Discount    float64   `json:"discount"     gorm:"type:decimal(12,2)"`
	Total       float64   `json:"total"        gorm:"type:decimal(12,2)"`
	Notes       string    `json:"notes"        gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Order   *Order   `json:"order,omitempty"   gorm:"foreignKey:OrderID"`
	Product *Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
}

// OrderRepository defines persistence operations for Order.
type OrderRepository interface {
	GetByID(id uint) (*Order, error)
	GetByOrderNumber(number string) (*Order, error)
	Create(o *Order) error
	Update(o *Order) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Order, int64, error)
}
