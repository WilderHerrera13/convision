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
		"branch_id":                        report.BranchID,
		"user_id":                          report.UserID,
		"report_date":                      report.ReportDate,
		"shift":                            report.Shift,
		"status":                           report.Status,
		"inquiries_male":                   report.InquiriesMale,
		"inquiries_female":                 report.InquiriesFemale,
		"inquiries_children":               report.InquiriesChildren,
		"quotes_male":                      report.QuotesMale,
		"quotes_female":                    report.QuotesFemale,
		"quotes_children":                  report.QuotesChildren,
		"effective_consultations_male":     report.EffectiveConsultationsMale,
		"effective_consultations_female":   report.EffectiveConsultationsFemale,
		"effective_consultations_children": report.EffectiveConsultationsChildren,
		"formula_consultations":            report.FormulaConsultations,
		"non_effective_consultations":      report.NonEffectiveConsultations,
		"bonuses_delivered":                report.BonusesDelivered,
		"bonuses_redeemed":                 report.BonusesRedeemed,
		"sistecredits_done":                report.SistecreditsDone,
		"addi_done":                        report.AddiDone,
		"follow_up_control":                report.FollowUpControl,
		"warranty_follow_up":               report.WarrantyFollowUp,
		"orders":                           report.Orders,
		"layaway_plan":                     report.LayawayPlan,
		"other_sales":                      report.OtherSales,
		"deliveries":                       report.Deliveries,
		"sistecredits_payments":            report.SistecreditsPayments,
		"orders_value":                     report.OrdersValue,
		"facebook_posts":                   report.FacebookPosts,
		"instagram_posts":                  report.InstagramPosts,
		"whatsapp_posts":                   report.WhatsappPosts,
		"facebook_shared_posts":            report.FacebookSharedPosts,
		"tiktok_videos":                    report.TiktokVideos,
		"gift_bonuses_sent":                report.GiftBonusesSent,
		"loyalty_bonuses_sent":             report.LoyaltyBonusesSent,
		"facebook_messages":                report.FacebookMessages,
		"instagram_messages":               report.InstagramMessages,
		"whatsapp_messages":                report.WhatsappMessages,
		"deliveries_completed":             report.DeliveriesCompleted,
		"customer_tags":                    report.CustomerTags,
		"work_quotes":                      report.WorkQuotes,
		"work_orders":                      report.WorkOrders,
		"observations":                     report.Observations,
		"recepciones_dinero":               report.MoneyReceipts,
	}).Error
}

func (r *DailyActivityRepository) List(db *gorm.DB, f domain.DailyActivityFilter) ([]*domain.DailyActivityReport, int64, error) {
	f.Clamp()
	var records []*domain.DailyActivityReport
	var total int64

	q := db.Model(&domain.DailyActivityReport{})

	if f.BranchID != nil {
		q = q.Where("branch_id = ?", *f.BranchID)
	}
	if f.UserID != nil {
		q = q.Where("user_id = ?", *f.UserID)
	}
	if f.DateFrom != "" {
		q = q.Where("(report_date AT TIME ZONE 'America/Bogota')::date >= ?::date", f.DateFrom)
	}
	if f.DateTo != "" {
		q = q.Where("(report_date AT TIME ZONE 'America/Bogota')::date <= ?::date", f.DateTo)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Preload("User").
		Order("report_date DESC, created_at DESC").
		Offset(f.Offset()).
		Limit(f.PerPage).
		Find(&records).Error
	return records, total, err
}
