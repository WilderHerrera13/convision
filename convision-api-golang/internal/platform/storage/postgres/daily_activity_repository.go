package postgres

import (
	"errors"
	"time"

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

func (r *DailyActivityRepository) FindByUserDateShift(userID uint, reportDate time.Time, shift domain.DailyShift) (*domain.DailyActivityReport, error) {
	var report domain.DailyActivityReport
	// Match by date (date part) and shift and user
	dateStr := reportDate.Format("2006-01-02")
	err := r.db.Where("user_id = ? AND DATE(report_date) = ? AND shift = ?", userID, dateStr, shift).
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

	// Filter by user_id if provided (non-admin sees only their own)
	if userID, ok := filters["user_id"]; ok {
		q = q.Where("user_id = ?", userID)
	}
	if shift, ok := filters["shift"]; ok {
		q = q.Where("shift = ?", shift)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Preload("User").Order("report_date DESC, created_at DESC").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}
