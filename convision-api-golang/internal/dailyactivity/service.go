package dailyactivity

import (
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles daily activity report use-cases.
type Service struct {
	repo   domain.DailyActivityRepository
	logger *zap.Logger
}

// NewService creates a new daily activity Service.
func NewService(repo domain.DailyActivityRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a daily activity report.
type CreateInput struct {
	ReportDate  string `json:"report_date"  binding:"required"`
	Shift       string `json:"shift"        binding:"required,oneof=morning afternoon full"`

	InquiriesMale            int     `json:"preguntas_hombre"`
	InquiriesFemale           int     `json:"preguntas_mujeres"`
	InquiriesChildren             int     `json:"preguntas_ninos"`
	QuotesMale         int     `json:"cotizaciones_hombre"`
	QuotesFemale        int     `json:"cotizaciones_mujeres"`
	QuotesChildren          int     `json:"cotizaciones_ninos"`
	EffectiveConsultationsMale   int     `json:"consultas_efectivas_hombre"`
	EffectiveConsultationsFemale  int     `json:"consultas_efectivas_mujeres"`
	EffectiveConsultationsChildren    int     `json:"consultas_efectivas_ninos"`
	FormulaConsultations       int     `json:"consulta_venta_formula"`
	NonEffectiveConsultations       int     `json:"consultas_no_efectivas"`
	BonusesDelivered            int     `json:"bonos_entregados"`
	BonusesRedeemed             int     `json:"bonos_redimidos"`
	SistecreditsDone    int     `json:"sistecreditos_realizados"`
	AddiDone             int     `json:"addi_realizados"`
	FollowUpControl         int     `json:"control_seguimiento"`
	WarrantyFollowUp       int     `json:"seguimiento_garantias"`
	Orders                    int     `json:"ordenes"`
	LayawayPlan                 int     `json:"plan_separe"`
	OtherSales                int     `json:"otras_ventas"`
	Deliveries                   int     `json:"entregas"`
	SistecreditsPayments        int     `json:"sistecreditos_abonos"`
	OrdersValue               float64 `json:"valor_ordenes"`
	FacebookPosts      int     `json:"publicaciones_facebook"`
	InstagramPosts     int     `json:"publicaciones_instagram"`
	WhatsappPosts      int     `json:"publicaciones_whatsapp"`
	FacebookSharedPosts int     `json:"publicaciones_compartidas_fb"`
	TiktokVideos           int     `json:"tiktok_realizados"`
	GiftBonusesSent        int     `json:"bonos_regalo_enviados"`
	LoyaltyBonusesSent  int     `json:"bonos_fidelizacion_enviados"`
	FacebookMessages           int     `json:"mensajes_facebook"`
	InstagramMessages          int     `json:"mensajes_instagram"`
	WhatsappMessages           int     `json:"mensajes_whatsapp"`
	DeliveriesCompleted         int     `json:"entregas_realizadas"`
	CustomerTags          int     `json:"etiquetas_clientes"`
	WorkQuotes        int     `json:"cotizaciones_trabajo"`
	WorkOrders             int     `json:"ordenes_trabajo"`
	Observations               string  `json:"observations"`
}

// UpdateInput holds optional fields for updating a daily activity report.
type UpdateInput = CreateInput

// QuickAttentionInput holds fields for the quick-attention endpoint.
type QuickAttentionInput struct {
	ReportDate string  `json:"report_date" binding:"required"`
	Shift      string  `json:"shift"       binding:"required,oneof=morning afternoon full"`
	Item       string  `json:"item"        binding:"required"`
	Profile    string  `json:"profile"`
	Amount     float64 `json:"amount"`
	Note       string  `json:"note"`
}

// ListOutput is the paginated list response.
type ListOutput struct {
	Data    []*domain.DailyActivityReport `json:"data"`
	Total   int64                         `json:"total"`
	Page    int                           `json:"page"`
	PerPage int                           `json:"per_page"`
}

// List returns paginated daily activity reports.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: page, PerPage: perPage}, nil
}

// GetByID returns a single daily activity report.
func (s *Service) GetByID(id uint) (*domain.DailyActivityReport, error) {
	return s.repo.GetByID(id)
}

// Create creates a new daily activity report.
func (s *Service) Create(input CreateInput, userID uint) (*domain.DailyActivityReport, error) {
	reportDate, err := time.Parse("2006-01-02", input.ReportDate)
	if err != nil {
		return nil, &domain.ErrValidation{Message: "formato de fecha inválido, use YYYY-MM-DD"}
	}
	r := buildReport(input, userID, reportDate)
	if err := s.repo.Create(r); err != nil {
		return nil, err
	}
	return s.repo.GetByID(r.ID)
}

// Update updates a daily activity report.
func (s *Service) Update(id uint, input UpdateInput, requestingUserID uint, isAdmin bool) (*domain.DailyActivityReport, error) {
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	// Non-admin can only edit today's own reports
	if !isAdmin {
		if existing.UserID != requestingUserID {
			return nil, &domain.ErrUnauthorized{Action: "editar informe de otro usuario"}
		}
		today := time.Now().Format("2006-01-02")
		if existing.ReportDate != nil && existing.ReportDate.Format("2006-01-02") != today {
			return nil, &domain.ErrValidation{Message: "solo puede editar informes del día de hoy"}
		}
	}
	reportDate, err := time.Parse("2006-01-02", input.ReportDate)
	if err != nil {
		return nil, &domain.ErrValidation{Message: "formato de fecha inválido, use YYYY-MM-DD"}
	}
	updated := buildReport(input, existing.UserID, reportDate)
	updated.ID = existing.ID
	updated.MoneyReceipts = existing.MoneyReceipts
	if err := s.repo.Update(updated); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// QuickAttention finds or creates a report and increments a counter or accumulates an amount.
func (s *Service) QuickAttention(input QuickAttentionInput, userID uint) (*domain.DailyActivityReport, error) {
	reportDate, err := time.Parse("2006-01-02", input.ReportDate)
	if err != nil {
		return nil, &domain.ErrValidation{Message: "formato de fecha inválido"}
	}
	shift := domain.DailyShift(input.Shift)

	// Find or create
	report, err := s.repo.FindByUserDateShift(userID, reportDate, shift)
	if err != nil {
		// Not found: create new
		t := reportDate
		report = &domain.DailyActivityReport{
			UserID:     userID,
			ReportDate: &t,
			Shift:      shift,
		}
		if err := s.repo.Create(report); err != nil {
			return nil, err
		}
	}

	// Amount items — accumulate in recepciones_dinero JSON
	amountItems := map[string]bool{
		"voucher": true, "bancolombia": true, "daviplata": true,
		"nequi": true, "addi_recibido": true, "sistecredito_recibido": true,
		"compras": true, "anticipos_recibidos": true, "anticipos_por_cru": true,
		"bono_regalo_recibido": true, "pago_sistecredito": true,
	}

	if amountItems[input.Item] {
		if input.Amount <= 0 {
			return nil, &domain.ErrValidation{Message: "amount es requerido para items monetarios"}
		}
		dinero := make(map[string]float64)
		if len(report.MoneyReceipts) > 0 {
			_ = json.Unmarshal(report.MoneyReceipts, &dinero)
		}
		dinero[input.Item] += input.Amount
		raw, _ := json.Marshal(dinero)
		report.MoneyReceipts = raw
	} else {
		// Counter item — increment by 1
		if err := incrementReportField(report, input.Item, input.Profile); err != nil {
			return nil, err
		}
	}

	// Append note if provided
	if input.Note != "" {
		if report.Observations != "" {
			report.Observations += "\n"
		}
		report.Observations += "[Registro rápido] " + input.Note
	}

	if err := s.repo.Update(report); err != nil {
		return nil, err
	}
	return s.repo.GetByID(report.ID)
}

func buildReport(input CreateInput, userID uint, reportDate time.Time) *domain.DailyActivityReport {
	return &domain.DailyActivityReport{
		UserID:                     userID,
		ReportDate:                 &reportDate,
		Shift:                      domain.DailyShift(input.Shift),
		InquiriesMale:            input.InquiriesMale,
		InquiriesFemale:           input.InquiriesFemale,
		InquiriesChildren:             input.InquiriesChildren,
		QuotesMale:         input.QuotesMale,
		QuotesFemale:        input.QuotesFemale,
		QuotesChildren:          input.QuotesChildren,
		EffectiveConsultationsMale:   input.EffectiveConsultationsMale,
		EffectiveConsultationsFemale:  input.EffectiveConsultationsFemale,
		EffectiveConsultationsChildren:    input.EffectiveConsultationsChildren,
		FormulaConsultations:       input.FormulaConsultations,
		NonEffectiveConsultations:       input.NonEffectiveConsultations,
		BonusesDelivered:            input.BonusesDelivered,
		BonusesRedeemed:             input.BonusesRedeemed,
		SistecreditsDone:    input.SistecreditsDone,
		AddiDone:             input.AddiDone,
		FollowUpControl:         input.FollowUpControl,
		WarrantyFollowUp:       input.WarrantyFollowUp,
		Orders:                    input.Orders,
		LayawayPlan:                 input.LayawayPlan,
		OtherSales:                input.OtherSales,
		Deliveries:                   input.Deliveries,
		SistecreditsPayments:        input.SistecreditsPayments,
		OrdersValue:               input.OrdersValue,
		FacebookPosts:      input.FacebookPosts,
		InstagramPosts:     input.InstagramPosts,
		WhatsappPosts:      input.WhatsappPosts,
		FacebookSharedPosts: input.FacebookSharedPosts,
		TiktokVideos:           input.TiktokVideos,
		GiftBonusesSent:        input.GiftBonusesSent,
		LoyaltyBonusesSent:  input.LoyaltyBonusesSent,
		FacebookMessages:           input.FacebookMessages,
		InstagramMessages:          input.InstagramMessages,
		WhatsappMessages:           input.WhatsappMessages,
		DeliveriesCompleted:         input.DeliveriesCompleted,
		CustomerTags:          input.CustomerTags,
		WorkQuotes:        input.WorkQuotes,
		WorkOrders:             input.WorkOrders,
		Observations:               input.Observations,
	}
}

func incrementReportField(r *domain.DailyActivityReport, item, profile string) error {
	switch item {
	case "preguntas":
		switch profile {
		case "hombre":
			r.InquiriesMale++
		case "mujer":
			r.InquiriesFemale++
		case "nino":
			r.InquiriesChildren++
		default:
			return &domain.ErrValidation{Message: "profile requerido: hombre|mujer|nino"}
		}
	case "cotizaciones":
		switch profile {
		case "hombre":
			r.QuotesMale++
		case "mujer":
			r.QuotesFemale++
		case "nino":
			r.QuotesChildren++
		default:
			return &domain.ErrValidation{Message: "profile requerido: hombre|mujer|nino"}
		}
	case "consultas_efectivas":
		switch profile {
		case "hombre":
			r.EffectiveConsultationsMale++
		case "mujer":
			r.EffectiveConsultationsFemale++
		case "nino":
			r.EffectiveConsultationsChildren++
		default:
			return &domain.ErrValidation{Message: "profile requerido: hombre|mujer|nino"}
		}
	case "consulta_venta_formula":
		r.FormulaConsultations++
	case "consultas_no_efectivas":
		r.NonEffectiveConsultations++
	case "bonos_entregados":
		r.BonusesDelivered++
	case "bonos_redimidos":
		r.BonusesRedeemed++
	case "sistecreditos_realizados":
		r.SistecreditsDone++
	case "addi_realizados":
		r.AddiDone++
	default:
		return &domain.ErrValidation{Message: fmt.Sprintf("item '%s' no reconocido", item)}
	}
	return nil
}
