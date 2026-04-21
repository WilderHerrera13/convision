package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var cashTransferFilterAllowlist = map[string]bool{
	"status": true,
	"type":   true,
}

// CashTransferRepository implements domain.CashTransferRepository using GORM/PostgreSQL.
type CashTransferRepository struct {
	db *gorm.DB
}

// NewCashTransferRepository creates a new CashTransferRepository.
func NewCashTransferRepository(db *gorm.DB) *CashTransferRepository {
	return &CashTransferRepository{db: db}
}

func (r *CashTransferRepository) GetByID(id uint) (*domain.CashTransfer, error) {
	var t domain.CashTransfer
	err := r.db.Preload("CreatedByUser").Preload("ApprovedByUser").
		First(&t, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "cash_transfer"}
	}
	return &t, err
}

func (r *CashTransferRepository) Create(t *domain.CashTransfer) error {
	return r.db.Create(t).Error
}

func (r *CashTransferRepository) Update(t *domain.CashTransfer) error {
	return r.db.Model(t).Updates(map[string]any{
		"from_account":        t.FromAccount,
		"to_account":          t.ToAccount,
		"amount":              t.Amount,
		"concept":             t.Concept,
		"description":         t.Description,
		"reference_number":    t.ReferenceNumber,
		"status":              t.Status,
		"notes":               t.Notes,
		"approved_by_user_id": t.ApprovedByUserID,
		"approved_at":         t.ApprovedAt,
	}).Error
}

func (r *CashTransferRepository) Delete(id uint) error {
	return r.db.Delete(&domain.CashTransfer{}, id).Error
}

func (r *CashTransferRepository) List(filters map[string]any, page, perPage int) ([]*domain.CashTransfer, int64, error) {
	var records []*domain.CashTransfer
	var total int64

	q := r.db.Model(&domain.CashTransfer{})
	for k, v := range filters {
		if cashTransferFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, transfer_number, type, from_account, to_account, amount, status, concept, transfer_date, created_at, updated_at, created_by_user_id, approved_by_user_id, approved_at").
		Order("created_at DESC").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}
