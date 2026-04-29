package domain

import "time"

// DiscountRequestStatus enumerates valid discount request statuses.
type DiscountRequestStatus string

const (
	DiscountRequestStatusPending  DiscountRequestStatus = "pending"
	DiscountRequestStatusApproved DiscountRequestStatus = "approved"
	DiscountRequestStatusRejected DiscountRequestStatus = "rejected"
)

// DiscountRequest represents a request by a receptionist for a discount on a product/lens.
type DiscountRequest struct {
	ID                 uint                  `json:"id"                  gorm:"primaryKey;autoIncrement"`
	UserID             uint                  `json:"user_id"             gorm:"not null;index"`
	ProductID          *uint                 `json:"product_id"          gorm:"column:product_id;index"`
	PatientID          *uint                 `json:"patient_id"          gorm:"column:patient_id;index"`
	Status             DiscountRequestStatus `json:"status"              gorm:"type:varchar(20);not null;default:'pending'"`
	DiscountPercentage float64               `json:"discount_percentage" gorm:"type:decimal(5,2)"`
	OriginalPrice      float64               `json:"original_price"      gorm:"type:decimal(12,2)"`
	DiscountedPrice    float64               `json:"discounted_price"    gorm:"type:decimal(12,2)"`
	Reason             string                `json:"reason"              gorm:"type:text"`
	RejectionReason    string                `json:"rejection_reason"    gorm:"type:text"`
	ApprovalNotes      string                `json:"approval_notes"      gorm:"type:text"`
	ApprovedBy         *uint                 `json:"approved_by"         gorm:"column:approved_by"`
	ApprovedAt         *time.Time            `json:"approved_at"`
	ExpiryDate         *time.Time            `json:"expiry_date"`
	IsGlobal           bool                  `json:"is_global"           gorm:"not null;default:false"`
	DeletedAt          *time.Time            `json:"deleted_at,omitempty" gorm:"index"`
	CreatedAt          time.Time             `json:"created_at"`
	UpdatedAt          time.Time             `json:"updated_at"`

	// Associations
	User     *User    `json:"user,omitempty"     gorm:"foreignKey:UserID"`
	Approver *User    `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy"`
	Product  *Product `json:"product,omitempty"  gorm:"foreignKey:ProductID"`
	Patient  *Patient `json:"patient,omitempty"  gorm:"foreignKey:PatientID"`
}

// DiscountRepository defines persistence operations for DiscountRequest.
type DiscountRepository interface {
	GetByID(id uint) (*DiscountRequest, error)
	GetActiveForProduct(productID uint) ([]*DiscountRequest, error)
	GetActiveForProductWithPatient(productID uint, patientID *uint) ([]*DiscountRequest, error)
	GetBestForProduct(productID uint, patientID *uint) (*DiscountRequest, error)
	Create(d *DiscountRequest) error
	Update(d *DiscountRequest) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*DiscountRequest, int64, error)
}
