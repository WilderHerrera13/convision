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
	ID                       uint                    `json:"id"                          gorm:"primaryKey;autoIncrement"`
	UserID                   uint                    `json:"user_id"                     gorm:"not null;index"`
	CloseDate                *time.Time              `json:"close_date"`
	Status                   CashRegisterCloseStatus `json:"status"                      gorm:"type:varchar(20);not null;default:'draft'"`
	TotalCounted             float64                 `json:"total_counted"               gorm:"type:decimal(12,2)"`
	TotalActualAmount        float64                 `json:"total_actual_amount"         gorm:"type:decimal(12,2)"`
	AdminActualsRecordedAt   *time.Time              `json:"admin_actuals_recorded_at"`
	AdminNotes               string                  `json:"admin_notes"                 gorm:"type:text"`
	AdvisorNotes             string                  `json:"advisor_notes"               gorm:"type:text"`
	ApprovedBy               *uint                   `json:"approved_by"                 gorm:"column:approved_by"`
	ApprovedAt               *time.Time              `json:"approved_at"`
	CreatedAt                time.Time               `json:"created_at"`
	UpdatedAt                time.Time               `json:"updated_at"`

	// Associations
	User           *User                          `json:"user,omitempty"            gorm:"foreignKey:UserID"`
	ApprovedByUser *User                          `json:"approved_by_user,omitempty" gorm:"foreignKey:ApprovedBy"`
	Payments       []CashRegisterClosePayment     `json:"payments,omitempty"        gorm:"foreignKey:CashRegisterCloseID"`
	ActualPayments []CashRegisterCloseActualPayment `json:"actual_payments,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
	Denominations  []CashCountDenomination        `json:"denominations,omitempty"   gorm:"foreignKey:CashRegisterCloseID"`
}

// CashRegisterClosePayment represents the counted amount per payment method in a close.
type CashRegisterClosePayment struct {
	ID                   uint      `json:"id"                     gorm:"primaryKey;autoIncrement"`
	CashRegisterCloseID  uint      `json:"cash_register_close_id" gorm:"not null;index"`
	PaymentMethodName    string    `json:"payment_method_name"    gorm:"not null"`
	CountedAmount        float64   `json:"counted_amount"         gorm:"type:decimal(12,2)"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`

	CashRegisterClose *CashRegisterClose `json:"cash_register_close,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
}

// CashRegisterCloseActualPayment represents the actual (admin-verified) amount per payment method.
type CashRegisterCloseActualPayment struct {
	ID                   uint      `json:"id"                     gorm:"primaryKey;autoIncrement"`
	CashRegisterCloseID  uint      `json:"cash_register_close_id" gorm:"not null;index"`
	PaymentMethodName    string    `json:"payment_method_name"    gorm:"not null"`
	ActualAmount         float64   `json:"actual_amount"          gorm:"type:decimal(12,2)"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`

	CashRegisterClose *CashRegisterClose `json:"cash_register_close,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
}

// CashCountDenomination records the quantity of each bill/coin denomination counted.
type CashCountDenomination struct {
	ID                   uint      `json:"id"                     gorm:"primaryKey;autoIncrement"`
	CashRegisterCloseID  uint      `json:"cash_register_close_id" gorm:"not null;index"`
	Denomination         int       `json:"denomination"           gorm:"not null"`
	Quantity             int       `json:"quantity"               gorm:"not null;default:0"`
	Subtotal             float64   `json:"subtotal"               gorm:"type:decimal(12,2)"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`

	CashRegisterClose *CashRegisterClose `json:"cash_register_close,omitempty" gorm:"foreignKey:CashRegisterCloseID"`
}

// CashTransferType enumerates types of cash transfer movements.
type CashTransferType string

const (
	CashTransferTypeInternal        CashTransferType = "internal"
	CashTransferTypeBankDeposit     CashTransferType = "bank_deposit"
	CashTransferTypeBankWithdrawal  CashTransferType = "bank_withdrawal"
	CashTransferTypePettyCash       CashTransferType = "petty_cash"
)

// CashTransfer represents a cash movement between accounts or to/from a bank.
type CashTransfer struct {
	ID                uint             `json:"id"                  gorm:"primaryKey;autoIncrement"`
	TransferNumber    string           `json:"transfer_number"     gorm:"uniqueIndex;not null"`
	Type              CashTransferType `json:"type"                gorm:"type:varchar(30);not null"`
	FromAccount       string           `json:"from_account"`
	ToAccount         string           `json:"to_account"`
	Amount            float64          `json:"amount"              gorm:"type:decimal(12,2);not null"`
	Currency          string           `json:"currency"            gorm:"type:varchar(10);default:'COP'"`
	TransferDate      *time.Time       `json:"transfer_date"`
	Concept           string           `json:"concept"`
	Description       string           `json:"description"         gorm:"type:text"`
	ReferenceNumber   string           `json:"reference_number"`
	Status            string           `json:"status"              gorm:"type:varchar(20);not null;default:'pending'"`
	Notes             string           `json:"notes"               gorm:"type:text"`
	CreatedByUserID   *uint            `json:"created_by_user_id"  gorm:"column:created_by_user_id"`
	ApprovedByUserID  *uint            `json:"approved_by_user_id" gorm:"column:approved_by_user_id"`
	ApprovedAt        *time.Time       `json:"approved_at"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`

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
	PreguntasHombre            int             `json:"preguntas_hombre"             gorm:"not null;default:0"`
	PreguntasMujeres           int             `json:"preguntas_mujeres"            gorm:"not null;default:0"`
	PreguntasNinos             int             `json:"preguntas_ninos"              gorm:"not null;default:0"`
	CotizacionesHombre         int             `json:"cotizaciones_hombre"          gorm:"not null;default:0"`
	CotizacionesMujeres        int             `json:"cotizaciones_mujeres"         gorm:"not null;default:0"`
	CotizacionesNinos          int             `json:"cotizaciones_ninos"           gorm:"not null;default:0"`
	ConsultasEfectivasHombre   int             `json:"consultas_efectivas_hombre"   gorm:"not null;default:0"`
	ConsultasEfectivasMujeres  int             `json:"consultas_efectivas_mujeres"  gorm:"not null;default:0"`
	ConsultasEfectivasNinos    int             `json:"consultas_efectivas_ninos"    gorm:"not null;default:0"`
	ConsultaVentaFormula       int             `json:"consulta_venta_formula"       gorm:"not null;default:0"`
	ConsultasNoEfectivas       int             `json:"consultas_no_efectivas"       gorm:"not null;default:0"`
	BonosEntregados            int             `json:"bonos_entregados"             gorm:"not null;default:0"`
	BonosRedimidos             int             `json:"bonos_redimidos"              gorm:"not null;default:0"`
	SistecreditosRealizados    int             `json:"sistecreditos_realizados"     gorm:"not null;default:0"`
	AddiRealizados             int             `json:"addi_realizados"              gorm:"not null;default:0"`
	ControlSeguimiento         int             `json:"control_seguimiento"          gorm:"not null;default:0"`
	SeguimientoGarantias       int             `json:"seguimiento_garantias"        gorm:"not null;default:0"`
	Ordenes                    int             `json:"ordenes"                      gorm:"not null;default:0"`
	PlanSepare                 int             `json:"plan_separe"                  gorm:"not null;default:0"`
	OtrasVentas                int             `json:"otras_ventas"                 gorm:"not null;default:0"`
	Entregas                   int             `json:"entregas"                     gorm:"not null;default:0"`
	SistecreditosAbonos        int             `json:"sistecreditos_abonos"         gorm:"not null;default:0"`
	ValorOrdenes               float64         `json:"valor_ordenes"                gorm:"type:decimal(12,2)"`
	PublicacionesFacebook      int             `json:"publicaciones_facebook"       gorm:"not null;default:0"`
	PublicacionesInstagram     int             `json:"publicaciones_instagram"      gorm:"not null;default:0"`
	PublicacionesWhatsapp      int             `json:"publicaciones_whatsapp"       gorm:"not null;default:0"`
	PublicacionesCompartidasFB int             `json:"publicaciones_compartidas_fb" gorm:"not null;default:0"`
	TiktokRealizados           int             `json:"tiktok_realizados"            gorm:"not null;default:0"`
	BonosRegaloEnviados        int             `json:"bonos_regalo_enviados"        gorm:"not null;default:0"`
	BonosFidelizacionEnviados  int             `json:"bonos_fidelizacion_enviados"  gorm:"not null;default:0"`
	MensajesFacebook           int             `json:"mensajes_facebook"            gorm:"not null;default:0"`
	MensajesInstagram          int             `json:"mensajes_instagram"           gorm:"not null;default:0"`
	MensajesWhatsapp           int             `json:"mensajes_whatsapp"            gorm:"not null;default:0"`
	EntregasRealizadas         int             `json:"entregas_realizadas"          gorm:"not null;default:0"`
	EtiquetasClientes          int             `json:"etiquetas_clientes"           gorm:"not null;default:0"`
	CotizacionesTrabajo        int             `json:"cotizaciones_trabajo"         gorm:"not null;default:0"`
	OrdenesTrabajo             int             `json:"ordenes_trabajo"              gorm:"not null;default:0"`
	Observations               string          `json:"observations"                 gorm:"type:text"`
	RecepcionesDinero          json.RawMessage `json:"recepciones_dinero"           gorm:"type:json"`
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
