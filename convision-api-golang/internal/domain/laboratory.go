package domain

import "time"

// Laboratory represents an external optics laboratory.
type Laboratory struct {
	ID            uint      `json:"id"             gorm:"primaryKey;autoIncrement"`
	Name          string    `json:"name"           gorm:"not null"`
	Address       string    `json:"address"`
	Phone         string    `json:"phone"`
	Email         string    `json:"email"`
	ContactPerson string    `json:"contact_person"`
	Status        string    `json:"status"         gorm:"type:varchar(20);not null;default:'active'"`
	Notes         string    `json:"notes"          gorm:"type:text"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// LaboratoryOrderStatus_t enumerates valid laboratory order statuses.
type LaboratoryOrderStatusValue string

const (
	LaboratoryOrderStatusPending          LaboratoryOrderStatusValue = "pending"
	LaboratoryOrderStatusInProcess        LaboratoryOrderStatusValue = "in_process"
	LaboratoryOrderStatusSentToLab        LaboratoryOrderStatusValue = "sent_to_lab"
	LaboratoryOrderStatusReadyForDelivery LaboratoryOrderStatusValue = "ready_for_delivery"
	LaboratoryOrderStatusDelivered        LaboratoryOrderStatusValue = "delivered"
	LaboratoryOrderStatusCancelled        LaboratoryOrderStatusValue = "cancelled"
)

// LaboratoryOrder represents an order sent to an external laboratory.
type LaboratoryOrder struct {
	ID                      uint                       `json:"id"                        gorm:"primaryKey;autoIncrement"`
	OrderNumber             string                     `json:"order_number"              gorm:"uniqueIndex;not null"`
	OrderID                 *uint                      `json:"order_id"                  gorm:"column:order_id"`
	SaleID                  *uint                      `json:"sale_id"                   gorm:"column:sale_id"`
	LaboratoryID            *uint                      `json:"laboratory_id"             gorm:"column:laboratory_id;index"`
	PatientID               *uint                      `json:"patient_id"                gorm:"column:patient_id;index"`
	Status                  LaboratoryOrderStatusValue `json:"status"                    gorm:"type:varchar(30);not null;default:'pending'"`
	Priority                string                     `json:"priority"                  gorm:"type:varchar(20);default:'normal'"`
	EstimatedCompletionDate *time.Time                 `json:"estimated_completion_date"`
	CompletionDate          *time.Time                 `json:"completion_date"`
	Notes                   string                     `json:"notes"                     gorm:"type:text"`
	CreatedBy               *uint                      `json:"created_by"                gorm:"column:created_by"`
	CreatedAt               time.Time                  `json:"created_at"`
	UpdatedAt               time.Time                  `json:"updated_at"`

	// Associations
	Laboratory    *Laboratory                  `json:"laboratory,omitempty"     gorm:"foreignKey:LaboratoryID"`
	Patient       *Patient                     `json:"patient,omitempty"        gorm:"foreignKey:PatientID"`
	CreatedByUser *User                        `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	StatusHistory []LaboratoryOrderStatusEntry `json:"status_history,omitempty" gorm:"foreignKey:LaboratoryOrderID"`
	Sale          *Sale                        `json:"sale,omitempty"           gorm:"foreignKey:SaleID"`
}

// LaboratoryOrderStatusEntry represents a status change event in a laboratory order.
type LaboratoryOrderStatusEntry struct {
	ID                uint       `json:"id"                   gorm:"primaryKey;autoIncrement"`
	LaboratoryOrderID uint       `json:"laboratory_order_id"  gorm:"not null;index"`
	Status            string     `json:"status"               gorm:"type:varchar(30);not null"`
	Notes             string     `json:"notes"                gorm:"type:text"`
	UserID            *uint      `json:"user_id"              gorm:"column:user_id"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	LaboratoryOrder *LaboratoryOrder `json:"laboratory_order,omitempty" gorm:"foreignKey:LaboratoryOrderID"`
	User            *User            `json:"user,omitempty"             gorm:"foreignKey:UserID"`
}

// TableName overrides the table name for LaboratoryOrderStatusEntry.
func (LaboratoryOrderStatusEntry) TableName() string {
	return "laboratory_order_statuses"
}

// LaboratoryRepository defines persistence operations for Laboratory.
type LaboratoryRepository interface {
	GetByID(id uint) (*Laboratory, error)
	Create(l *Laboratory) error
	Update(l *Laboratory) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Laboratory, int64, error)
	GetFirstActive() (*Laboratory, error)
}

// LaboratoryOrderRepository defines persistence operations for LaboratoryOrder.
type LaboratoryOrderRepository interface {
	GetByID(id uint) (*LaboratoryOrder, error)
	GetByOrderNumber(number string) (*LaboratoryOrder, error)
	GetBySaleID(saleID uint) (*LaboratoryOrder, error)
	Create(o *LaboratoryOrder) error
	Update(o *LaboratoryOrder) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*LaboratoryOrder, int64, error)
	AddStatusEntry(entry *LaboratoryOrderStatusEntry) error
	Stats() (map[string]int64, error)
}
