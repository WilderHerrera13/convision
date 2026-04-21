package domain

import (
	"encoding/json"
	"time"
)

// CashRegisterCloseStatus enumerates valid statuses for a cash register close.
type CashRegisterCloseStatus string

const (
	CashRegisterCloseStatusDraft     CashRegisterCloseStatus = "draft"
	CashRegisterCloseStatusSubmitted CashRegisterCloseStatus = "submitted"
	CashRegisterCloseStatusApproved  CashRegisterCloseStatus = "approved"
)

// CashRegisterClose represents a daily cash close performed by a receptionist/advisor.
type CashRegisterClose struct {
	ID                     uint                    `json:"id"                          gorm:"primaryKey;autoIncrement"`
	UserID                 uint                    `json:"user_id"                     gorm:"not null;index"`
	CloseDate              *time.Time              `json:"close_date"`
	Status                 CashRegisterCloseStatus `json:"status"                      gorm:"type:varchar(20);not null;default:'draft'"`
	TotalCounted           float64                 `json:"total_counted"               gorm:"type:decimal(12,2)"`
	TotalActualAmount      float64                 `json:"total_actual_amount"         gorm:"type:decimal(12,2)"`
	AdminActualsRecordedAt *time.Time              `json:"admin_actuals_recorded_at"`
	AdminNotes             string                  `json:"admin_notes"                 gorm:"type:text"`
	AdvisorNotes           string                  `json:"advisor_notes"               gorm:"type:text"`
	ApprovedBy             *uint                   `json:"approved_by"                 gorm:"column:approved_by"`
	ApprovedAt             *time.Time              `json:"approved_at"`
	CreatedAt              time.Time               `json:"created_at"`
	UpdatedAt              time.Time               `json:"updated_at"`

	// Associations
	User           *User                            `json:"user,omitempty"            gorm:"foreignKey:UserID"`
	ApprovedByUser *User                            `json:"approved_by_user,omitempty" gorm:"foreignKey:ApprovedBy"`
	Payments       []CashRegisterClosePayment       `json:"payments,omitempty"        gorm:"foreignKey:CashRegisterCloseID"`
	ActualPayments []CashRegisterCloseActualPayment `json:"actual_payments,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
	Denominations  []CashCountDenomination          `json:"denominations,omitempty"   gorm:"foreignKey:CashRegisterCloseID"`
}

// CashRegisterClosePayment represents the counted amount per payment method in a close.
type CashRegisterClosePayment struct {
	ID                  uint      `json:"id"                     gorm:"primaryKey;autoIncrement"`
	CashRegisterCloseID uint      `json:"cash_register_close_id" gorm:"not null;index"`
	PaymentMethodName   string    `json:"payment_method_name"    gorm:"not null"`
	CountedAmount       float64   `json:"counted_amount"         gorm:"type:decimal(12,2)"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`

	CashRegisterClose *CashRegisterClose `json:"cash_register_close,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
}

// CashRegisterCloseActualPayment represents the actual (admin-verified) amount per payment method.
type CashRegisterCloseActualPayment struct {
	ID                  uint      `json:"id"                     gorm:"primaryKey;autoIncrement"`
	CashRegisterCloseID uint      `json:"cash_register_close_id" gorm:"not null;index"`
	PaymentMethodName   string    `json:"payment_method_name"    gorm:"not null"`
	ActualAmount        float64   `json:"actual_amount"          gorm:"type:decimal(12,2)"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`

	CashRegisterClose *CashRegisterClose `json:"cash_register_close,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
}

// CashCountDenomination records the quantity of each bill/coin denomination counted.
type CashCountDenomination struct {
	ID                  uint      `json:"id"                     gorm:"primaryKey;autoIncrement"`
	CashRegisterCloseID uint      `json:"cash_register_close_id" gorm:"not null;index"`
	Denomination        int       `json:"denomination"           gorm:"not null"`
	Quantity            int       `json:"quantity"               gorm:"not null;default:0"`
	Subtotal            float64   `json:"subtotal"               gorm:"type:decimal(12,2)"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`

	CashRegisterClose *CashRegisterClose `json:"cash_register_close,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
}

// CashRegisterCloseRepository defines persistence operations for cash register closes.
type CashRegisterCloseRepository interface {
	GetByID(id uint) (*CashRegisterClose, error)
	// GetByUserAndDate returns the single close for (userID, date). Returns ErrNotFound if none exist.
	// Prioritizes submitted/approved over draft when multiple exist (historical duplicates).
	GetByUserAndDate(userID uint, date string) (*CashRegisterClose, error)
	List(filters map[string]any, page, perPage int) ([]*CashRegisterClose, int64, error)
	// ListByStatuses returns all closes whose status is in the given list, ordered by close_date DESC.
	// Intended for the advisors-pending aggregation (no pagination needed — result is grouped per user).
	ListByStatuses(statuses []CashRegisterCloseStatus) ([]*CashRegisterClose, error)
	// ListByUserAndDateRange returns all closes for a user within a date range ordered by close_date ASC.
	// Used by the calendar endpoint.
	ListByUserAndDateRange(userID uint, from, to string) ([]*CashRegisterClose, error)
	Create(c *CashRegisterClose, payments []CashRegisterClosePayment, denoms []CashCountDenomination) error
	Update(c *CashRegisterClose, payments *[]CashRegisterClosePayment, denoms *[]CashCountDenomination) error
	Delete(id uint) error
	// SyncActualPayments replaces all actual_payments and recalculates total_actual_amount.
	SyncActualPayments(closeID uint, payments []CashRegisterCloseActualPayment) error
}

// CashTransferType enumerates types of cash transfer movements.
type CashTransferType string

const (
	CashTransferTypeInternal       CashTransferType = "internal"
	CashTransferTypeBankDeposit    CashTransferType = "bank_deposit"
	CashTransferTypeBankWithdrawal CashTransferType = "bank_withdrawal"
	CashTransferTypePettyCash      CashTransferType = "petty_cash"
)

// CashTransfer represents a cash movement between accounts or to/from a bank.
type CashTransfer struct {
	ID                     uint             `json:"id"                       gorm:"primaryKey;autoIncrement"`
	TransferNumber         string           `json:"transfer_number"          gorm:"uniqueIndex;not null"`
	OriginType             string           `json:"origin_type"              gorm:"type:varchar(50)"`
	OriginDescription      string           `json:"origin_description"       gorm:"type:varchar(255)"`
	DestinationType        string           `json:"destination_type"         gorm:"type:varchar(50)"`
	DestinationDescription string           `json:"destination_description"  gorm:"type:varchar(255)"`
	Type                   CashTransferType `json:"type"                     gorm:"type:varchar(30);not null"`
	FromAccount            string           `json:"from_account"             gorm:"type:varchar(255)"`
	ToAccount              string           `json:"to_account"               gorm:"type:varchar(255)"`
	Amount                 float64          `json:"amount"                   gorm:"type:decimal(12,2);not null"`
	Currency               string           `json:"currency"                 gorm:"type:varchar(10);default:'COP'"`
	TransferDate           *time.Time       `json:"transfer_date"`
	Concept                string           `json:"reason"                   gorm:"type:varchar(255)"`
	Description            string           `json:"description"              gorm:"type:text"`
	ReferenceNumber        string           `json:"reference_number"`
	Status                 string           `json:"status"                   gorm:"type:varchar(20);not null;default:'pending'"`
	Notes                  string           `json:"notes"                    gorm:"type:text"`
	CreatedByUserID        *uint            `json:"created_by_user_id"       gorm:"column:created_by_user_id"`
	RequestedBy            string           `json:"requested_by"             gorm:"type:varchar(255)"`
	ApprovedByUserID       *uint            `json:"approved_by_user_id"      gorm:"column:approved_by_user_id"`
	ApprovedBy             string           `json:"approved_by"              gorm:"type:varchar(255)"`
	ApprovedAt             *time.Time       `json:"approved_at"`
	CreatedAt              time.Time        `json:"created_at"`
	UpdatedAt              time.Time        `json:"updated_at"`

	CreatedByUser  *User `json:"created_by_user,omitempty"  gorm:"foreignKey:CreatedByUserID"`
	ApprovedByUser *User `json:"approved_by_user,omitempty" gorm:"foreignKey:ApprovedByUserID"`
}

// CashTransferRepository defines persistence operations for CashTransfer.
type CashTransferRepository interface {
	GetByID(id uint) (*CashTransfer, error)
	Create(t *CashTransfer) error
	Update(t *CashTransfer) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*CashTransfer, int64, error)
}

// DailyShift enumerates the shift options for daily reports.
type DailyShift string

const (
	DailyShiftMorning   DailyShift = "morning"
	DailyShiftAfternoon DailyShift = "afternoon"
	DailyShiftFull      DailyShift = "full"
)

// DailyActivityReport represents a daily commercial activity report submitted by an advisor.
type DailyActivityReport struct {
	ID                         uint            `json:"id"                           gorm:"primaryKey;autoIncrement"`
	UserID                     uint            `json:"user_id"                      gorm:"not null;index"`
	ReportDate                 *time.Time      `json:"report_date"`
	Shift                      DailyShift      `json:"shift"                        gorm:"type:varchar(20)"`
	InquiriesMale            int             `json:"preguntas_hombre"             gorm:"not null;default:0"`
	InquiriesFemale           int             `json:"preguntas_mujeres"            gorm:"not null;default:0"`
	InquiriesChildren             int             `json:"preguntas_ninos"              gorm:"not null;default:0"`
	QuotesMale         int             `json:"cotizaciones_hombre"          gorm:"not null;default:0"`
	QuotesFemale        int             `json:"cotizaciones_mujeres"         gorm:"not null;default:0"`
	QuotesChildren          int             `json:"cotizaciones_ninos"           gorm:"not null;default:0"`
	EffectiveConsultationsMale   int             `json:"consultas_efectivas_hombre"   gorm:"not null;default:0"`
	EffectiveConsultationsFemale  int             `json:"consultas_efectivas_mujeres"  gorm:"not null;default:0"`
	EffectiveConsultationsChildren    int             `json:"consultas_efectivas_ninos"    gorm:"not null;default:0"`
	FormulaConsultations       int             `json:"consulta_venta_formula"       gorm:"not null;default:0"`
	NonEffectiveConsultations       int             `json:"consultas_no_efectivas"       gorm:"not null;default:0"`
	BonusesDelivered            int             `json:"bonos_entregados"             gorm:"not null;default:0"`
	BonusesRedeemed             int             `json:"bonos_redimidos"              gorm:"not null;default:0"`
	SistecreditsDone    int             `json:"sistecreditos_realizados"     gorm:"not null;default:0"`
	AddiDone             int             `json:"addi_realizados"              gorm:"not null;default:0"`
	FollowUpControl         int             `json:"control_seguimiento"          gorm:"not null;default:0"`
	WarrantyFollowUp       int             `json:"seguimiento_garantias"        gorm:"not null;default:0"`
	Orders                    int             `json:"ordenes"                      gorm:"not null;default:0"`
	LayawayPlan                 int             `json:"plan_separe"                  gorm:"not null;default:0"`
	OtherSales                int             `json:"otras_ventas"                 gorm:"not null;default:0"`
	Deliveries                   int             `json:"entregas"                     gorm:"not null;default:0"`
	SistecreditsPayments        int             `json:"sistecreditos_abonos"         gorm:"not null;default:0"`
	OrdersValue               float64         `json:"valor_ordenes"                gorm:"type:decimal(12,2)"`
	FacebookPosts      int             `json:"publicaciones_facebook"       gorm:"not null;default:0"`
	InstagramPosts     int             `json:"publicaciones_instagram"      gorm:"not null;default:0"`
	WhatsappPosts      int             `json:"publicaciones_whatsapp"       gorm:"not null;default:0"`
	FacebookSharedPosts int             `json:"publicaciones_compartidas_fb" gorm:"not null;default:0"`
	TiktokVideos           int             `json:"tiktok_realizados"            gorm:"not null;default:0"`
	GiftBonusesSent        int             `json:"bonos_regalo_enviados"        gorm:"not null;default:0"`
	LoyaltyBonusesSent  int             `json:"bonos_fidelizacion_enviados"  gorm:"not null;default:0"`
	FacebookMessages           int             `json:"mensajes_facebook"            gorm:"not null;default:0"`
	InstagramMessages          int             `json:"mensajes_instagram"           gorm:"not null;default:0"`
	WhatsappMessages           int             `json:"mensajes_whatsapp"            gorm:"not null;default:0"`
	DeliveriesCompleted         int             `json:"entregas_realizadas"          gorm:"not null;default:0"`
	CustomerTags          int             `json:"etiquetas_clientes"           gorm:"not null;default:0"`
	WorkQuotes        int             `json:"cotizaciones_trabajo"         gorm:"not null;default:0"`
	WorkOrders             int             `json:"ordenes_trabajo"              gorm:"not null;default:0"`
	Observations               string          `json:"observations"                 gorm:"type:text"`
	MoneyReceipts          json.RawMessage `json:"recepciones_dinero"           gorm:"type:json"`
	CreatedAt                  time.Time       `json:"created_at"`
	UpdatedAt                  time.Time       `json:"updated_at"`

	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// DailyActivityRepository defines persistence operations for DailyActivityReport.
type DailyActivityRepository interface {
	GetByID(id uint) (*DailyActivityReport, error)
	FindByUserDateShift(userID uint, reportDate time.Time, shift DailyShift) (*DailyActivityReport, error)
	Create(r *DailyActivityReport) error
	Update(r *DailyActivityReport) error
	List(filters map[string]any, page, perPage int) ([]*DailyActivityReport, int64, error)
}
