package postgres

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var cashRegisterCloseFilterAllowlist = map[string]bool{
	"branch_id":  true,
	"user_id":    true,
	"status":     true,
	"close_date": true,
	"date_from":  true,
	"date_to":    true,
}

// CashRegisterCloseRepository implements domain.CashRegisterCloseRepository.
type CashRegisterCloseRepository struct{}

// NewCashRegisterCloseRepository creates a new CashRegisterCloseRepository.
func NewCashRegisterCloseRepository() *CashRegisterCloseRepository {
	return &CashRegisterCloseRepository{}
}

func (r *CashRegisterCloseRepository) GetByID(db *gorm.DB, id uint) (*domain.CashRegisterClose, error) {
	var item domain.CashRegisterClose
	err := db.
		Select("id, branch_id, user_id, close_date, status, total_counted, total_actual_amount, admin_actuals_recorded_at, admin_notes, advisor_notes, approved_by, approved_at, created_at, updated_at").
		Preload("User", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role")
		}).
		Preload("Payments", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, cash_register_close_id, payment_method_name, counted_amount, created_at, updated_at")
		}).
		Preload("Denominations", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, cash_register_close_id, denomination, quantity, subtotal, created_at, updated_at")
		}).
		First(&item, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "cash_register_close"}
	}
	return &item, err
}

// GetByUserAndDate returns the single authoritative close for (userID, date).
// When duplicates exist it prioritises: approved > submitted > draft (most recently created).
// Returns ErrNotFound if the user has no close for that date.
func (r *CashRegisterCloseRepository) GetByUserAndDate(db *gorm.DB, userID uint, date string) (*domain.CashRegisterClose, error) {
	var records []*domain.CashRegisterClose
	err := db.
		Select("id, branch_id, user_id, close_date, status, total_counted, total_actual_amount, admin_actuals_recorded_at, admin_notes, advisor_notes, approved_by, approved_at, created_at, updated_at").
		Where("user_id = ? AND DATE(close_date) = ?", userID, date).
		Order(`
			CASE status
				WHEN 'approved'  THEN 1
				WHEN 'submitted' THEN 2
				ELSE                  3
			END,
			created_at DESC
		`).
		Limit(1).
		Find(&records).Error
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, &domain.ErrNotFound{Resource: "cash_register_close"}
	}
	return r.GetByID(db, records[0].ID)
}

func (r *CashRegisterCloseRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.CashRegisterClose, int64, error) {
	var records []*domain.CashRegisterClose
	var total int64

	q := db.Model(&domain.CashRegisterClose{})
	for k, v := range filters {
		if k == "branch_id" {
			q = q.Where("branch_id = ?", v)
			continue
		}
		if !cashRegisterCloseFilterAllowlist[k] {
			continue
		}
		switch k {
		case "close_date":
			q = q.Where("DATE(close_date) = ?", v)
		case "date_from":
			q = q.Where("DATE(close_date) >= ?", v)
		case "date_to":
			q = q.Where("DATE(close_date) <= ?", v)
		default:
			q = q.Where(k+" = ?", v)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.
		Select("id, branch_id, user_id, close_date, status, total_counted, total_actual_amount, admin_actuals_recorded_at, admin_notes, advisor_notes, approved_by, approved_at, created_at, updated_at").
		Preload("User", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role")
		}).
		Order("close_date DESC NULLS LAST, created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&records).Error

	return records, total, err
}

// ListByStatuses returns all closes whose status is in the provided list,
// with the User association preloaded, ordered by close_date DESC.
func (r *CashRegisterCloseRepository) ListByStatuses(db *gorm.DB, statuses []domain.CashRegisterCloseStatus, branchID uint) ([]*domain.CashRegisterClose, error) {
	var records []*domain.CashRegisterClose
	q := db.
		Select("id, branch_id, user_id, close_date, status, total_counted, total_actual_amount, admin_actuals_recorded_at, admin_notes, advisor_notes, approved_by, approved_at, created_at, updated_at").
		Where("status IN ?", statuses)
	if branchID > 0 {
		q = q.Where("branch_id = ?", branchID)
	}
	err := q.
		Preload("User", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role")
		}).
		Order("close_date DESC NULLS LAST, created_at DESC").
		Find(&records).Error
	return records, err
}

// ListByUserAndDateRange returns all closes for a user within [from, to], ordered by close_date ASC.
func (r *CashRegisterCloseRepository) ListByUserAndDateRange(db *gorm.DB, userID uint, branchID uint, from, to string) ([]*domain.CashRegisterClose, error) {
	var records []*domain.CashRegisterClose
	q := db.
		Model(&domain.CashRegisterClose{}).
		Select("id, branch_id, user_id, close_date, status, total_counted, total_actual_amount, admin_actuals_recorded_at, admin_notes, advisor_notes, approved_by, approved_at, created_at, updated_at").
		Where("user_id = ?", userID).
		Where("DATE(close_date) BETWEEN ? AND ?", from, to)
	if branchID > 0 {
		q = q.Where("branch_id = ?", branchID)
	}
	q = q.
		Preload("User", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role")
		}).
		Preload("ApprovedByUser", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, name, last_name, role")
		}).
		Preload("Payments", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, cash_register_close_id, payment_method_name, counted_amount, created_at, updated_at")
		}).
		Preload("ActualPayments", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, cash_register_close_id, payment_method_name, actual_amount, created_at, updated_at")
		}).
		Preload("Denominations", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, cash_register_close_id, denomination, quantity, subtotal, created_at, updated_at")
		}).
		Order("close_date ASC NULLS LAST, created_at ASC")
	err := q.Find(&records).Error
	return records, err
}

// Create inserts a close and its nested payment/denomination rows atomically.
func (r *CashRegisterCloseRepository) Create(db *gorm.DB, c *domain.CashRegisterClose, payments []domain.CashRegisterClosePayment, denoms []domain.CashCountDenomination) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(c).Error; err != nil {
			return err
		}

		if len(payments) > 0 {
			for i := range payments {
				payments[i].CashRegisterCloseID = c.ID
			}
			if err := tx.Create(&payments).Error; err != nil {
				return err
			}
		}

		if len(denoms) > 0 {
			for i := range denoms {
				denoms[i].CashRegisterCloseID = c.ID
			}
			if err := tx.Create(&denoms).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Update updates the close and optionally replaces nested payments/denominations atomically.
func (r *CashRegisterCloseRepository) Update(db *gorm.DB, c *domain.CashRegisterClose, payments *[]domain.CashRegisterClosePayment, denoms *[]domain.CashCountDenomination) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.CashRegisterClose{}).
			Where("id = ?", c.ID).
			Updates(map[string]any{
				"close_date":                c.CloseDate,
				"status":                    c.Status,
				"total_counted":             c.TotalCounted,
				"total_actual_amount":       c.TotalActualAmount,
				"admin_actuals_recorded_at": c.AdminActualsRecordedAt,
				"admin_notes":               c.AdminNotes,
				"advisor_notes":             c.AdvisorNotes,
				"approved_by":               c.ApprovedBy,
				"approved_at":               c.ApprovedAt,
				"updated_at":                time.Now().UTC(),
			}).Error; err != nil {
			return err
		}

		if payments != nil {
			if err := tx.Where("cash_register_close_id = ?", c.ID).Delete(&domain.CashRegisterClosePayment{}).Error; err != nil {
				return err
			}
			if len(*payments) > 0 {
				for i := range *payments {
					(*payments)[i].CashRegisterCloseID = c.ID
				}
				if err := tx.Create(payments).Error; err != nil {
					return err
				}
			}
		}

		if denoms != nil {
			if err := tx.Where("cash_register_close_id = ?", c.ID).Delete(&domain.CashCountDenomination{}).Error; err != nil {
				return err
			}
			if len(*denoms) > 0 {
				for i := range *denoms {
					(*denoms)[i].CashRegisterCloseID = c.ID
				}
				if err := tx.Create(denoms).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *CashRegisterCloseRepository) Delete(db *gorm.DB, id uint) error {
	var affected int64
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("cash_register_close_id = ?", id).Delete(&domain.CashRegisterClosePayment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("cash_register_close_id = ?", id).Delete(&domain.CashRegisterCloseActualPayment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("cash_register_close_id = ?", id).Delete(&domain.CashCountDenomination{}).Error; err != nil {
			return err
		}
		res := tx.Delete(&domain.CashRegisterClose{}, id)
		if res.Error != nil {
			return res.Error
		}
		affected = res.RowsAffected
		return nil
	})
	if err != nil {
		return err
	}
	if affected == 0 {
		return &domain.ErrNotFound{Resource: "cash_register_close"}
	}
	return nil
}

// SyncActualPayments replaces actual payment rows and updates reconciliation totals atomically.
func (r *CashRegisterCloseRepository) SyncActualPayments(db *gorm.DB, closeID uint, payments []domain.CashRegisterCloseActualPayment) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("cash_register_close_id = ?", closeID).Delete(&domain.CashRegisterCloseActualPayment{}).Error; err != nil {
			return err
		}

		total := 0.0
		if len(payments) > 0 {
			for i := range payments {
				payments[i].CashRegisterCloseID = closeID
				total += payments[i].ActualAmount
			}
			if err := tx.Create(&payments).Error; err != nil {
				return err
			}
		}

		now := time.Now().UTC()
		if err := tx.Model(&domain.CashRegisterClose{}).
			Where("id = ?", closeID).
			Updates(map[string]any{
				"total_actual_amount":       total,
				"admin_actuals_recorded_at": &now,
				"updated_at":                now,
			}).Error; err != nil {
			return err
		}

		return nil
	})
}
