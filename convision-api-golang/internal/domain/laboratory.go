package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// RxEye holds optical prescription values for one eye.
type RxEye struct {
	Sphere    string `json:"sphere"`
	Cylinder  string `json:"cylinder"`
	Axis      string `json:"axis"`
	Addition  string `json:"addition"`
	DP        string `json:"dp"`
	AF        string `json:"af"`
	Diameter  string `json:"diameter"`
	BaseCurve string `json:"base_curve"`
	Power     string `json:"power"`
	PrismH    string `json:"prism_h"`
	PrismV    string `json:"prism_v"`
}

func (r RxEye) Value() (driver.Value, error) {
	b, err := json.Marshal(r)
	return string(b), err
}

func (r *RxEye) Scan(src any) error {
	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	case nil:
		return nil
	default:
		return errors.New("unsupported type for RxEye")
	}
	return json.Unmarshal([]byte(s), r)
}

// FrameSpecs holds frame (mounting) specification values.
type FrameSpecs struct {
	Name               string `json:"name"`
	Type               string `json:"type"`
	Gender             string `json:"gender"`
	Color              string `json:"color"`
	Horizontal         string `json:"horizontal"`
	Bridge             string `json:"bridge"`
	Vertical           string `json:"vertical"`
	PantoscopicAngle   string `json:"pantoscopic_angle"`
	MechanicalDistance string `json:"mechanical_distance"`
	PanoramicAngle     string `json:"panoramic_angle"`
	EffectiveDiameter  string `json:"effective_diameter"`
}

func (f FrameSpecs) Value() (driver.Value, error) {
	b, err := json.Marshal(f)
	return string(b), err
}

func (f *FrameSpecs) Scan(src any) error {
	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	case nil:
		return nil
	default:
		return errors.New("unsupported type for FrameSpecs")
	}
	return json.Unmarshal([]byte(s), f)
}

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
	LaboratoryOrderStatusInTransit        LaboratoryOrderStatusValue = "in_transit"
	LaboratoryOrderStatusReceivedFromLab  LaboratoryOrderStatusValue = "received_from_lab"
	LaboratoryOrderStatusReturnedToLab    LaboratoryOrderStatusValue = "returned_to_lab"
	LaboratoryOrderStatusInQuality        LaboratoryOrderStatusValue = "in_quality"
	LaboratoryOrderStatusQualityApproved  LaboratoryOrderStatusValue = "quality_approved"
	LaboratoryOrderStatusReadyForDelivery LaboratoryOrderStatusValue = "ready_for_delivery"
	LaboratoryOrderStatusDelivered        LaboratoryOrderStatusValue = "delivered"
	LaboratoryOrderStatusCancelled        LaboratoryOrderStatusValue = "cancelled"
	LaboratoryOrderStatusPortfolio        LaboratoryOrderStatusValue = "portfolio"
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
	DrawerNumber            *string                    `json:"drawer_number"             gorm:"type:varchar(20)"`
	CreatedBy               *uint                      `json:"created_by"                gorm:"column:created_by"`
	CreatedAt               time.Time                  `json:"created_at"`
	UpdatedAt               time.Time                  `json:"updated_at"`

	// Optical prescription
	RxOD       *RxEye      `json:"rx_od"       gorm:"type:text;serializer:json"`
	RxOI       *RxEye      `json:"rx_oi"       gorm:"type:text;serializer:json"`
	LensOD     string      `json:"lens_od"     gorm:"type:text"`
	LensOI     string      `json:"lens_oi"     gorm:"type:text"`
	FrameSpecs *FrameSpecs `json:"frame_specs" gorm:"type:text;serializer:json"`

	// Commercial info
	SellerName          string     `json:"seller_name"          gorm:"type:varchar(255)"`
	SaleDate            *time.Time `json:"sale_date"`
	Branch              string     `json:"branch"               gorm:"type:varchar(100)"`
	SpecialInstructions string     `json:"special_instructions" gorm:"type:text"`

	// PDF
	PdfToken string `json:"pdf_token" gorm:"type:varchar(255)"`

	// Associations
	Laboratory    *Laboratory                  `json:"laboratory,omitempty"      gorm:"foreignKey:LaboratoryID"`
	Patient       *Patient                     `json:"patient,omitempty"         gorm:"foreignKey:PatientID"`
	CreatedByUser *User                        `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	StatusHistory []LaboratoryOrderStatusEntry `json:"status_history,omitempty"  gorm:"foreignKey:LaboratoryOrderID"`
	Sale          *Sale                        `json:"sale,omitempty"            gorm:"foreignKey:SaleID"`
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

const (
	PortfolioCallResultContacted      = "contacted"
	PortfolioCallResultPaymentPromise = "payment_promise"
	PortfolioCallResultNoAnswer       = "no_answer"
	PortfolioCallResultWrongNumber    = "wrong_number"
)

const (
	PortfolioCallChannelCall     = "call"
	PortfolioCallChannelWhatsApp = "whatsapp"
	PortfolioCallChannelSMS      = "sms"
	PortfolioCallChannelEmail    = "email"
)

// LaboratoryOrderCall represents a follow-up call log for a portfolio order.
type LaboratoryOrderCall struct {
	ID                uint       `json:"id"                   gorm:"primaryKey;autoIncrement"`
	LaboratoryOrderID uint       `json:"laboratory_order_id"  gorm:"not null;index"`
	Result            string     `json:"result"               gorm:"type:varchar(30);not null"`
	Channel           string     `json:"channel"              gorm:"type:varchar(20);not null;default:'call'"`
	NextContactDate   *time.Time `json:"next_contact_date"`
	Notes             string     `json:"notes"                gorm:"type:text"`
	UserID            *uint      `json:"user_id"              gorm:"column:user_id"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	LaboratoryOrder *LaboratoryOrder `json:"laboratory_order,omitempty" gorm:"foreignKey:LaboratoryOrderID"`
	User            *User            `json:"user,omitempty"             gorm:"foreignKey:UserID"`
}

// LaboratoryOrderEvidence stores a photo uploaded as evidence for a status transition.
type LaboratoryOrderEvidence struct {
	ID                uint      `json:"id"                  gorm:"primaryKey;autoIncrement"`
	LaboratoryOrderID uint      `json:"laboratory_order_id" gorm:"not null;index"`
	TransitionType    string    `json:"transition_type"     gorm:"type:varchar(30);not null"`
	ImageURL          string    `json:"image_url"           gorm:"type:text;not null"`
	Filename          string    `json:"filename"            gorm:"type:text"`
	CreatedBy         *uint     `json:"created_by"          gorm:"column:uploaded_by"`
	CreatedAt         time.Time `json:"created_at"`

	User *User `json:"user,omitempty" gorm:"foreignKey:CreatedBy;references:ID"`
}

func (LaboratoryOrderEvidence) TableName() string {
	return "laboratory_order_evidence"
}

// LaboratoryOrderEvidenceRepository defines persistence operations for LaboratoryOrderEvidence.
type LaboratoryOrderEvidenceRepository interface {
	Create(db *gorm.DB, e *LaboratoryOrderEvidence) error
	ListByOrderID(db *gorm.DB, orderID uint, transitionType string) ([]*LaboratoryOrderEvidence, error)
}

// LaboratoryRepository defines persistence operations for Laboratory.
type LaboratoryRepository interface {
	GetByID(db *gorm.DB, id uint) (*Laboratory, error)
	GetFirstActive(db *gorm.DB) (*Laboratory, error)
	Create(db *gorm.DB, l *Laboratory) error
	Update(db *gorm.DB, l *Laboratory) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*Laboratory, int64, error)
}

// LaboratoryOrderRepository defines persistence operations for LaboratoryOrder.
type LaboratoryOrderRepository interface {
	GetByID(db *gorm.DB, id uint) (*LaboratoryOrder, error)
	GetByOrderNumber(db *gorm.DB, number string) (*LaboratoryOrder, error)
	GetBySaleID(db *gorm.DB, saleID uint) (*LaboratoryOrder, error)
	Create(db *gorm.DB, o *LaboratoryOrder) error
	Update(db *gorm.DB, o *LaboratoryOrder) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*LaboratoryOrder, int64, error)
	AddStatusEntry(db *gorm.DB, entry *LaboratoryOrderStatusEntry) error
	Stats(db *gorm.DB) (map[string]int64, error)
}

// LaboratoryOrderCallRepository defines persistence operations for LaboratoryOrderCall.
type LaboratoryOrderCallRepository interface {
	Create(db *gorm.DB, call *LaboratoryOrderCall) error
	GetByOrderID(db *gorm.DB, orderID uint) ([]*LaboratoryOrderCall, error)
	GetByOrderIDs(db *gorm.DB, orderIDs []uint) ([]*LaboratoryOrderCall, error)
	PortfolioStats(db *gorm.DB) (map[string]int64, error)
}
