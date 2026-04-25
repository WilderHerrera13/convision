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
// report_date and shift are no longer required; the backend sets today and 'full' automatically.
type CreateInput struct {
	InquiriesMale                  int     `json:"preguntas_hombre"`
	InquiriesFemale                int     `json:"preguntas_mujeres"`
	InquiriesChildren              int     `json:"preguntas_ninos"`
	QuotesMale                     int     `json:"cotizaciones_hombre"`
	QuotesFemale                   int     `json:"cotizaciones_mujeres"`
	QuotesChildren                 int     `json:"cotizaciones_ninos"`
	EffectiveConsultationsMale     int     `json:"consultas_efectivas_hombre"`
	EffectiveConsultationsFemale   int     `json:"consultas_efectivas_mujeres"`
	EffectiveConsultationsChildren int     `json:"consultas_efectivas_ninos"`
	FormulaConsultations           int     `json:"consulta_venta_formula"`
	NonEffectiveConsultations      int     `json:"consultas_no_efectivas"`
	BonusesDelivered               int     `json:"bonos_entregados"`
	BonusesRedeemed                int     `json:"bonos_redimidos"`
	SistecreditsDone               int     `json:"sistecreditos_realizados"`
	AddiDone                       int     `json:"addi_realizados"`
	FollowUpControl                int     `json:"control_seguimiento"`
	WarrantyFollowUp               int     `json:"seguimiento_garantias"`
	Orders                         int     `json:"ordenes"`
	LayawayPlan                    int     `json:"plan_separe"`
	OtherSales                     int     `json:"otras_ventas"`
	Deliveries                     int     `json:"entregas"`
	SistecreditsPayments           int     `json:"sistecreditos_abonos"`
	OrdersValue                    float64 `json:"valor_ordenes"`
	FacebookPosts                  int     `json:"publicaciones_facebook"`
	InstagramPosts                 int     `json:"publicaciones_instagram"`
	WhatsappPosts                  int     `json:"publicaciones_whatsapp"`
	FacebookSharedPosts            int     `json:"publicaciones_compartidas_fb"`
	TiktokVideos                   int     `json:"tiktok_realizados"`
	GiftBonusesSent                int     `json:"bonos_regalo_enviados"`
	LoyaltyBonusesSent             int     `json:"bonos_fidelizacion_enviados"`
	FacebookMessages               int     `json:"mensajes_facebook"`
	InstagramMessages              int     `json:"mensajes_instagram"`
	WhatsappMessages               int     `json:"mensajes_whatsapp"`
	DeliveriesCompleted            int     `json:"entregas_realizadas"`
	CustomerTags                   int     `json:"etiquetas_clientes"`
	WorkQuotes                     int     `json:"cotizaciones_trabajo"`
	WorkOrders                     int     `json:"ordenes_trabajo"`
	Observations                   string  `json:"observations"`
}

// UpdateInput holds the same fields as CreateInput for updating a report.
type UpdateInput = CreateInput

// QuickAttentionInput holds fields for the quick-attention endpoint.
// report_date and shift are no longer required; the backend uses today automatically.
type QuickAttentionInput struct {
	Item    string  `json:"item"    binding:"required"`
	Profile string  `json:"profile"`
	Amount  float64 `json:"amount"`
	Note    string  `json:"note"`
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

// Create creates a new daily activity report for today.
func (s *Service) Create(input CreateInput, userID uint) (*domain.DailyActivityReport, error) {
	now := time.Now()
	todayStr := now.Format("2006-01-02")

	_, err := s.repo.FindByUserAndDate(userID, todayStr)
	if err == nil {
		return nil, &domain.ErrValidation{Message: "ya existe un reporte para el día de hoy"}
	}
	if _, ok := err.(*domain.ErrNotFound); !ok {
		return nil, err
	}

	r := buildReport(input, userID, now)
	r.Status = domain.DailyReportStatusPending
	if err := s.repo.Create(r); err != nil {
		return nil, err
	}
	return s.repo.GetByID(r.ID)
}

// Update updates the metric fields of a daily activity report.
func (s *Service) Update(id uint, input UpdateInput, requestingUserID uint, isAdmin bool) (*domain.DailyActivityReport, error) {
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		if existing.UserID != requestingUserID {
			return nil, &domain.ErrUnauthorized{Action: "editar informe de otro usuario"}
		}
		if existing.Status == domain.DailyReportStatusClosed {
			return nil, &domain.ErrValidation{Message: "el reporte ya está cerrado y no puede ser editado"}
		}
	}

	reportDate := time.Now()
	if existing.ReportDate != nil {
		reportDate = *existing.ReportDate
	}

	updated := buildReport(input, existing.UserID, reportDate)
	updated.ID = existing.ID
	updated.Status = existing.Status
	updated.MoneyReceipts = existing.MoneyReceipts
	if err := s.repo.Update(updated); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Close marks a daily activity report as closed.
// Non-admin users can only close their own report.
func (s *Service) Close(id uint, requestingUserID uint, isAdmin bool) (*domain.DailyActivityReport, error) {
	report, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if !isAdmin && report.UserID != requestingUserID {
		return nil, &domain.ErrUnauthorized{Action: "cerrar informe de otro usuario"}
	}
	if report.Status == domain.DailyReportStatusClosed {
		return nil, &domain.ErrValidation{Message: "el reporte ya está cerrado"}
	}
	report.Status = domain.DailyReportStatusClosed
	if err := s.repo.Update(report); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Reopen sets a closed report back to pending status.
// Admin-only action enforced at the handler level.
func (s *Service) Reopen(id uint) (*domain.DailyActivityReport, error) {
	report, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if report.Status != domain.DailyReportStatusClosed {
		return nil, &domain.ErrValidation{Message: "el reporte no está cerrado"}
	}
	report.Status = domain.DailyReportStatusPending
	if err := s.repo.Update(report); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// QuickAttention finds or creates today's report and increments a counter or accumulates an amount.
func (s *Service) QuickAttention(input QuickAttentionInput, userID uint) (*domain.DailyActivityReport, error) {
	today := time.Now()
	todayStr := today.Format("2006-01-02")

	report, err := s.repo.FindByUserAndDate(userID, todayStr)
	if err != nil {
		if _, ok := err.(*domain.ErrNotFound); !ok {
			return nil, err
		}
		report = &domain.DailyActivityReport{
			UserID:     userID,
			ReportDate: &today,
			Shift:      domain.DailyShiftFull,
			Status:     domain.DailyReportStatusPending,
		}
		if err := s.repo.Create(report); err != nil {
			return nil, err
		}
	}

	if report.Status == domain.DailyReportStatusClosed {
		return nil, &domain.ErrValidation{Message: "el reporte del día ya está cerrado"}
	}

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
		if err := incrementReportField(report, input.Item, input.Profile); err != nil {
			return nil, err
		}
	}

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
		UserID:                         userID,
		ReportDate:                     &reportDate,
		Shift:                          domain.DailyShiftFull,
		InquiriesMale:                  input.InquiriesMale,
		InquiriesFemale:                input.InquiriesFemale,
		InquiriesChildren:              input.InquiriesChildren,
		QuotesMale:                     input.QuotesMale,
		QuotesFemale:                   input.QuotesFemale,
		QuotesChildren:                 input.QuotesChildren,
		EffectiveConsultationsMale:     input.EffectiveConsultationsMale,
		EffectiveConsultationsFemale:   input.EffectiveConsultationsFemale,
		EffectiveConsultationsChildren: input.EffectiveConsultationsChildren,
		FormulaConsultations:           input.FormulaConsultations,
		NonEffectiveConsultations:      input.NonEffectiveConsultations,
		BonusesDelivered:               input.BonusesDelivered,
		BonusesRedeemed:                input.BonusesRedeemed,
		SistecreditsDone:               input.SistecreditsDone,
		AddiDone:                       input.AddiDone,
		FollowUpControl:                input.FollowUpControl,
		WarrantyFollowUp:               input.WarrantyFollowUp,
		Orders:                         input.Orders,
		LayawayPlan:                    input.LayawayPlan,
		OtherSales:                     input.OtherSales,
		Deliveries:                     input.Deliveries,
		SistecreditsPayments:           input.SistecreditsPayments,
		OrdersValue:                    input.OrdersValue,
		FacebookPosts:                  input.FacebookPosts,
		InstagramPosts:                 input.InstagramPosts,
		WhatsappPosts:                  input.WhatsappPosts,
		FacebookSharedPosts:            input.FacebookSharedPosts,
		TiktokVideos:                   input.TiktokVideos,
		GiftBonusesSent:                input.GiftBonusesSent,
		LoyaltyBonusesSent:             input.LoyaltyBonusesSent,
		FacebookMessages:               input.FacebookMessages,
		InstagramMessages:              input.InstagramMessages,
		WhatsappMessages:               input.WhatsappMessages,
		DeliveriesCompleted:            input.DeliveriesCompleted,
		CustomerTags:                   input.CustomerTags,
		WorkQuotes:                     input.WorkQuotes,
		WorkOrders:                     input.WorkOrders,
		Observations:                   input.Observations,
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
