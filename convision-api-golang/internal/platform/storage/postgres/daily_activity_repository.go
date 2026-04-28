package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// DailyActivityRepository implements domain.DailyActivityRepository using GORM/PostgreSQL.
type DailyActivityRepository struct {
	db *gorm.DB
}

// NewDailyActivityRepository creates a new DailyActivityRepository.
func NewDailyActivityRepository(db *gorm.DB) *DailyActivityRepository {
	return &DailyActivityRepository{db: db}
}

func (r *DailyActivityRepository) GetByID(id uint) (*domain.DailyActivityReport, error) {
	var report domain.DailyActivityReport
	err := r.db.Preload("User").First(&report, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "daily_activity_report"}
	}
	return &report, err
}

func (r *DailyActivityRepository) FindByUserAndDate(userID uint, date string) (*domain.DailyActivityReport, error) {
	var report domain.DailyActivityReport
	err := r.db.Where("user_id = ? AND DATE(report_date) = ?", userID, date).
		First(&report).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "daily_activity_report"}
	}
	return &report, err
}

func (r *DailyActivityRepository) Create(report *domain.DailyActivityReport) error {
	return r.db.Create(report).Error
}

func (r *DailyActivityRepository) Update(report *domain.DailyActivityReport) error {
	return r.db.Save(report).Error
}

func (r *DailyActivityRepository) List(filters map[string]any, page, perPage int) ([]*domain.DailyActivityReport, int64, error) {
	var records []*domain.DailyActivityReport
	var total int64

	q := r.db.Model(&domain.DailyActivityReport{})

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
