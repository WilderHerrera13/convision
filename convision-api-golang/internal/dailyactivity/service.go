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

	PreguntasHombre            int     `json:"preguntas_hombre"`
	PreguntasMujeres           int     `json:"preguntas_mujeres"`
	PreguntasNinos             int     `json:"preguntas_ninos"`
	CotizacionesHombre         int     `json:"cotizaciones_hombre"`
	CotizacionesMujeres        int     `json:"cotizaciones_mujeres"`
	CotizacionesNinos          int     `json:"cotizaciones_ninos"`
	ConsultasEfectivasHombre   int     `json:"consultas_efectivas_hombre"`
	ConsultasEfectivasMujeres  int     `json:"consultas_efectivas_mujeres"`
	ConsultasEfectivasNinos    int     `json:"consultas_efectivas_ninos"`
	ConsultaVentaFormula       int     `json:"consulta_venta_formula"`
	ConsultasNoEfectivas       int     `json:"consultas_no_efectivas"`
	BonosEntregados            int     `json:"bonos_entregados"`
	BonosRedimidos             int     `json:"bonos_redimidos"`
	SistecreditosRealizados    int     `json:"sistecreditos_realizados"`
	AddiRealizados             int     `json:"addi_realizados"`
	ControlSeguimiento         int     `json:"control_seguimiento"`
	SeguimientoGarantias       int     `json:"seguimiento_garantias"`
	Ordenes                    int     `json:"ordenes"`
	PlanSepare                 int     `json:"plan_separe"`
	OtrasVentas                int     `json:"otras_ventas"`
	Entregas                   int     `json:"entregas"`
	SistecreditosAbonos        int     `json:"sistecreditos_abonos"`
	ValorOrdenes               float64 `json:"valor_ordenes"`
	PublicacionesFacebook      int     `json:"publicaciones_facebook"`
	PublicacionesInstagram     int     `json:"publicaciones_instagram"`
	PublicacionesWhatsapp      int     `json:"publicaciones_whatsapp"`
	PublicacionesCompartidasFB int     `json:"publicaciones_compartidas_fb"`
	TiktokRealizados           int     `json:"tiktok_realizados"`
	BonosRegaloEnviados        int     `json:"bonos_regalo_enviados"`
	BonosFidelizacionEnviados  int     `json:"bonos_fidelizacion_enviados"`
	MensajesFacebook           int     `json:"mensajes_facebook"`
	MensajesInstagram          int     `json:"mensajes_instagram"`
	MensajesWhatsapp           int     `json:"mensajes_whatsapp"`
	EntregasRealizadas         int     `json:"entregas_realizadas"`
	EtiquetasClientes          int     `json:"etiquetas_clientes"`
	CotizacionesTrabajo        int     `json:"cotizaciones_trabajo"`
	OrdenesTrabajo             int     `json:"ordenes_trabajo"`
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
	updated.RecepcionesDinero = existing.RecepcionesDinero
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
		if len(report.RecepcionesDinero) > 0 {
			_ = json.Unmarshal(report.RecepcionesDinero, &dinero)
		}
		dinero[input.Item] += input.Amount
		raw, _ := json.Marshal(dinero)
		report.RecepcionesDinero = raw
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
		PreguntasHombre:            input.PreguntasHombre,
		PreguntasMujeres:           input.PreguntasMujeres,
		PreguntasNinos:             input.PreguntasNinos,
		CotizacionesHombre:         input.CotizacionesHombre,
		CotizacionesMujeres:        input.CotizacionesMujeres,
		CotizacionesNinos:          input.CotizacionesNinos,
		ConsultasEfectivasHombre:   input.ConsultasEfectivasHombre,
		ConsultasEfectivasMujeres:  input.ConsultasEfectivasMujeres,
		ConsultasEfectivasNinos:    input.ConsultasEfectivasNinos,
		ConsultaVentaFormula:       input.ConsultaVentaFormula,
		ConsultasNoEfectivas:       input.ConsultasNoEfectivas,
		BonosEntregados:            input.BonosEntregados,
		BonosRedimidos:             input.BonosRedimidos,
		SistecreditosRealizados:    input.SistecreditosRealizados,
		AddiRealizados:             input.AddiRealizados,
		ControlSeguimiento:         input.ControlSeguimiento,
		SeguimientoGarantias:       input.SeguimientoGarantias,
		Ordenes:                    input.Ordenes,
		PlanSepare:                 input.PlanSepare,
		OtrasVentas:                input.OtrasVentas,
		Entregas:                   input.Entregas,
		SistecreditosAbonos:        input.SistecreditosAbonos,
		ValorOrdenes:               input.ValorOrdenes,
		PublicacionesFacebook:      input.PublicacionesFacebook,
		PublicacionesInstagram:     input.PublicacionesInstagram,
		PublicacionesWhatsapp:      input.PublicacionesWhatsapp,
		PublicacionesCompartidasFB: input.PublicacionesCompartidasFB,
		TiktokRealizados:           input.TiktokRealizados,
		BonosRegaloEnviados:        input.BonosRegaloEnviados,
		BonosFidelizacionEnviados:  input.BonosFidelizacionEnviados,
		MensajesFacebook:           input.MensajesFacebook,
		MensajesInstagram:          input.MensajesInstagram,
		MensajesWhatsapp:           input.MensajesWhatsapp,
		EntregasRealizadas:         input.EntregasRealizadas,
		EtiquetasClientes:          input.EtiquetasClientes,
		CotizacionesTrabajo:        input.CotizacionesTrabajo,
		OrdenesTrabajo:             input.OrdenesTrabajo,
		Observations:               input.Observations,
	}
}

func incrementReportField(r *domain.DailyActivityReport, item, profile string) error {
	switch item {
	case "preguntas":
		switch profile {
		case "hombre":
			r.PreguntasHombre++
		case "mujer":
			r.PreguntasMujeres++
		case "nino":
			r.PreguntasNinos++
		default:
			return &domain.ErrValidation{Message: "profile requerido: hombre|mujer|nino"}
		}
	case "cotizaciones":
		switch profile {
		case "hombre":
			r.CotizacionesHombre++
		case "mujer":
			r.CotizacionesMujeres++
		case "nino":
			r.CotizacionesNinos++
		default:
			return &domain.ErrValidation{Message: "profile requerido: hombre|mujer|nino"}
		}
	case "consultas_efectivas":
		switch profile {
		case "hombre":
			r.ConsultasEfectivasHombre++
		case "mujer":
			r.ConsultasEfectivasMujeres++
		case "nino":
			r.ConsultasEfectivasNinos++
		default:
			return &domain.ErrValidation{Message: "profile requerido: hombre|mujer|nino"}
		}
	case "consulta_venta_formula":
		r.ConsultaVentaFormula++
	case "consultas_no_efectivas":
		r.ConsultasNoEfectivas++
	case "bonos_entregados":
		r.BonosEntregados++
	case "bonos_redimidos":
		r.BonosRedimidos++
	case "sistecreditos_realizados":
		r.SistecreditosRealizados++
	case "addi_realizados":
		r.AddiRealizados++
	default:
		return &domain.ErrValidation{Message: fmt.Sprintf("item '%s' no reconocido", item)}
	}
	return nil
}
