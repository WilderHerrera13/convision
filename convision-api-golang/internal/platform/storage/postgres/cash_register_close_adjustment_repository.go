package postgres

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// CashRegisterCloseAdjustmentRepository implements domain.CashRegisterCloseAdjustmentRepository.
type CashRegisterCloseAdjustmentRepository struct{}

// NewCashRegisterCloseAdjustmentRepository creates a new CashRegisterCloseAdjustmentRepository.
func NewCashRegisterCloseAdjustmentRepository() *CashRegisterCloseAdjustmentRepository {
	return &CashRegisterCloseAdjustmentRepository{}
}

const adjustmentColumns = "id, cash_register_close_id, branch_id, advisor_user_id, admin_user_id, reason, before_snapshot, after_snapshot, acknowledged_at, created_at"

func (r *CashRegisterCloseAdjustmentRepository) GetByID(db *gorm.DB, id uint) (*domain.CashRegisterCloseAdjustment, error) {
	var item domain.CashRegisterCloseAdjustment
	err := db.
		Select(adjustmentColumns).
		Preload("AdminUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role_type")
		}).
		Preload("AdvisorUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role_type")
		}).
		First(&item, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "cash_register_close_adjustment"}
	}
	return &item, err
}

func (r *CashRegisterCloseAdjustmentRepository) ListByCloseID(db *gorm.DB, closeID uint) ([]*domain.CashRegisterCloseAdjustment, error) {
	var records []*domain.CashRegisterCloseAdjustment
	err := db.
		Select(adjustmentColumns).
		Where("cash_register_close_id = ?", closeID).
		Preload("AdminUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role_type")
		}).
		Preload("AdvisorUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role_type")
		}).
		Order("created_at ASC").
		Find(&records).Error
	return records, err
}

func (r *CashRegisterCloseAdjustmentRepository) List(db *gorm.DB, f domain.CashRegisterCloseAdjustmentFilter) ([]*domain.CashRegisterCloseAdjustment, int64, error) {
	f.Clamp()
	var records []*domain.CashRegisterCloseAdjustment
	var total int64

	q := db.Model(&domain.CashRegisterCloseAdjustment{})
	if f.AdvisorUserID != nil {
		q = q.Where("advisor_user_id = ?", *f.AdvisorUserID)
	}
	if f.BranchID != nil {
		q = q.Where("branch_id = ?", *f.BranchID)
	}
	if f.DateFrom != "" {
		q = q.Where("DATE(created_at) >= ?", f.DateFrom)
	}
	if f.DateTo != "" {
		q = q.Where("DATE(created_at) <= ?", f.DateTo)
	}
	if f.Unacknowledged != nil && *f.Unacknowledged {
		q = q.Where("acknowledged_at IS NULL")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Select(adjustmentColumns).
		Preload("AdminUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role_type")
		}).
		Preload("AdvisorUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role_type")
		}).
		Order("created_at DESC").
		Offset(f.Offset()).
		Limit(f.PerPage).
		Find(&records).Error
	return records, total, err
}

func (r *CashRegisterCloseAdjustmentRepository) CountByAdvisor(db *gorm.DB, advisorUserID uint) (int64, error) {
	var total int64
	err := db.Model(&domain.CashRegisterCloseAdjustment{}).
		Where("advisor_user_id = ?", advisorUserID).
		Count(&total).Error
	return total, err
}

func (r *CashRegisterCloseAdjustmentRepository) Acknowledge(db *gorm.DB, id uint) error {
	now := time.Now().UTC()
	return db.Model(&domain.CashRegisterCloseAdjustment{}).
		Where("id = ? AND acknowledged_at IS NULL", id).
		Update("acknowledged_at", &now).Error
}
