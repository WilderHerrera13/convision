package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// InventoryTransferRepository is the PostgreSQL-backed implementation of domain.InventoryTransferRepository.
type InventoryTransferRepository struct{}

// NewInventoryTransferRepository creates a new InventoryTransferRepository.
func NewInventoryTransferRepository() *InventoryTransferRepository {
	return &InventoryTransferRepository{}
}

func (r *InventoryTransferRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Product").
		Preload("SourceLocation").
		Preload("DestinationLocation").
		Preload("TransferredByUser")
}

func (r *InventoryTransferRepository) GetByID(db *gorm.DB, id uint) (*domain.InventoryTransfer, error) {
	var t domain.InventoryTransfer
	err := r.withRelations(db).First(&t, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "inventory_transfer"}
		}
		return nil, err
	}
	return &t, nil
}

func (r *InventoryTransferRepository) Create(db *gorm.DB, t *domain.InventoryTransfer) error {
	return db.Create(t).Error
}

func (r *InventoryTransferRepository) Update(db *gorm.DB, t *domain.InventoryTransfer) error {
	return db.Model(t).Updates(map[string]any{
		"notes":        t.Notes,
		"status":       t.Status,
		"completed_at": t.CompletedAt,
	}).Error
}

func (r *InventoryTransferRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.InventoryTransfer{}, id).Error
}

func (r *InventoryTransferRepository) List(db *gorm.DB, f domain.InventoryTransferFilter) ([]*domain.InventoryTransfer, int64, error) {
	f.Clamp()
	var transfers []*domain.InventoryTransfer
	var total int64

	q := db.Model(&domain.InventoryTransfer{})
	if f.BranchID != nil {
		q = q.Where("inventory_transfers.branch_id = ?", *f.BranchID)
	}
	if f.ProductID != nil {
		q = q.Where("inventory_transfers.product_id = ?", *f.ProductID)
	}
	if f.Status != "" {
		q = q.Where("inventory_transfers.status = ?", f.Status)
	}
	if f.CreatedBy != nil {
		q = q.Where("inventory_transfers.transferred_by = ?", *f.CreatedBy)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("inventory_transfers.id desc").
		Find(&transfers).Error
	if err != nil {
		return nil, 0, err
	}

	return transfers, total, nil
}
