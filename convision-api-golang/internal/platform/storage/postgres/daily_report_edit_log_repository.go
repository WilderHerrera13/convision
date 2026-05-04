package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// DailyReportEditLogRepository implements domain.DailyReportEditLogRepository using GORM/PostgreSQL.
type DailyReportEditLogRepository struct{}

// NewDailyReportEditLogRepository creates a new DailyReportEditLogRepository.
func NewDailyReportEditLogRepository() *DailyReportEditLogRepository {
	return &DailyReportEditLogRepository{}
}

func (r *DailyReportEditLogRepository) Create(db *gorm.DB, entry *domain.DailyReportEditLog) error {
	return db.Create(entry).Error
}

func (r *DailyReportEditLogRepository) ListByReportID(db *gorm.DB, reportID uint) ([]*domain.DailyReportEditLog, error) {
	var entries []*domain.DailyReportEditLog
	err := db.
		Preload("PerformedByUser").
		Where("daily_activity_report_id = ?", reportID).
		Order("performed_at ASC").
		Find(&entries).Error
	return entries, err
}
