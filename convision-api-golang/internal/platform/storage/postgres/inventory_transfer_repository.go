package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var inventoryTransferFilterAllowlist = map[string]bool{
	"status":                  true,
	"product_id":              true,
	"source_location_id":      true,
	"destination_location_id": true,
	"transferred_by":          true,
}

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

func (r *InventoryTransferRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.InventoryTransfer, int64, error) {
	var transfers []*domain.InventoryTransfer
	var total int64

	q := db.Model(&domain.InventoryTransfer{})
	for field, value := range filters {
		if !inventoryTransferFilterAllowlist[field] {
			continue
		}
		q = q.Where("inventory_transfers."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("inventory_transfers.id desc").
		Find(&transfers).Error
	if err != nil {
		return nil, 0, err
	}

	return transfers, total, nil
}
