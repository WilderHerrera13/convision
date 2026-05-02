package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// DailyActivityRepository implements domain.DailyActivityRepository using GORM/PostgreSQL.
type DailyActivityRepository struct{}

// NewDailyActivityRepository creates a new DailyActivityRepository.
func NewDailyActivityRepository() *DailyActivityRepository {
	return &DailyActivityRepository{}
}

func (r *DailyActivityRepository) GetByID(db *gorm.DB, id uint) (*domain.DailyActivityReport, error) {
	var report domain.DailyActivityReport
	err := db.Preload("User").First(&report, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "daily_activity_report"}
	}
	return &report, err
}

func (r *DailyActivityRepository) FindByUserAndDate(db *gorm.DB, userID uint, date string) (*domain.DailyActivityReport, error) {
	var report domain.DailyActivityReport
	err := db.Where("user_id = ? AND (report_date AT TIME ZONE 'America/Bogota')::date = ?::date", userID, date).
		First(&report).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "daily_activity_report"}
	}
	return &report, err
}

func (r *DailyActivityRepository) Create(db *gorm.DB, report *domain.DailyActivityReport) error {
	return db.Create(report).Error
}

func (r *DailyActivityRepository) Update(db *gorm.DB, report *domain.DailyActivityReport) error {
	return db.Model(report).Updates(map[string]any{
		"branch_id":                     report.BranchID,
		"user_id":                       report.UserID,
		"report_date":                   report.ReportDate,
		"shift":                         report.Shift,
		"status":                        report.Status,
		"preguntas_hombre":              report.InquiriesMale,
		"preguntas_mujeres":             report.InquiriesFemale,
		"preguntas_ninos":               report.InquiriesChildren,
		"cotizaciones_hombre":           report.QuotesMale,
		"cotizaciones_mujeres":          report.QuotesFemale,
		"cotizaciones_ninos":            report.QuotesChildren,
		"consultas_efectivas_hombre":    report.EffectiveConsultationsMale,
		"consultas_efectivas_mujeres":   report.EffectiveConsultationsFemale,
		"consultas_efectivas_ninos":     report.EffectiveConsultationsChildren,
		"consulta_venta_formula":        report.FormulaConsultations,
		"consultas_no_efectivas":        report.NonEffectiveConsultations,
		"bonos_entregados":              report.BonusesDelivered,
		"bonos_redimidos":               report.BonusesRedeemed,
		"sistecreditos_realizados":      report.SistecreditsDone,
		"addi_realizados":               report.AddiDone,
		"control_seguimiento":           report.FollowUpControl,
		"seguimiento_garantias":         report.WarrantyFollowUp,
		"ordenes":                       report.Orders,
		"plan_separe":                   report.LayawayPlan,
		"otras_ventas":                  report.OtherSales,
		"entregas":                      report.Deliveries,
		"sistecreditos_abonos":          report.SistecreditsPayments,
		"valor_ordenes":                 report.OrdersValue,
		"publicaciones_facebook":        report.FacebookPosts,
		"publicaciones_instagram":       report.InstagramPosts,
		"publicaciones_whatsapp":        report.WhatsappPosts,
		"publicaciones_compartidas_fb":  report.FacebookSharedPosts,
		"tiktok_realizados":             report.TiktokVideos,
		"bonos_regalo_enviados":         report.GiftBonusesSent,
		"bonos_fidelizacion_enviados":   report.LoyaltyBonusesSent,
		"mensajes_facebook":             report.FacebookMessages,
		"mensajes_instagram":            report.InstagramMessages,
		"mensajes_whatsapp":             report.WhatsappMessages,
		"entregas_realizadas":           report.DeliveriesCompleted,
		"etiquetas_clientes":            report.CustomerTags,
		"cotizaciones_trabajo":          report.WorkQuotes,
		"ordenes_trabajo":               report.WorkOrders,
		"observations":                  report.Observations,
		"recepciones_dinero":            report.MoneyReceipts,
	}).Error
}

func (r *DailyActivityRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.DailyActivityReport, int64, error) {
	var records []*domain.DailyActivityReport
	var total int64

	q := db.Model(&domain.DailyActivityReport{})

	if branchID, ok := filters["branch_id"]; ok {
		q = q.Where("branch_id = ?", branchID)
	}
	if userID, ok := filters["user_id"]; ok {
		q = q.Where("user_id = ?", userID)
	}
	if dateFrom, ok := filters["date_from"]; ok {
		q = q.Where("DATE(report_date) >= ?", dateFrom)
	}
	if dateTo, ok := filters["date_to"]; ok {
		q = q.Where("DATE(report_date) <= ?", dateTo)
	}
	if status, ok := filters["status"]; ok {
		q = q.Where("status = ?", status)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Preload("User").Order("report_date DESC, created_at DESC").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}
