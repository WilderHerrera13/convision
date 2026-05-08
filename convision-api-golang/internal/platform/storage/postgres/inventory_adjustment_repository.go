package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// InventoryAdjustmentRepository is the PostgreSQL-backed implementation of domain.InventoryAdjustmentRepository.
type InventoryAdjustmentRepository struct{}

// NewInventoryAdjustmentRepository creates a new InventoryAdjustmentRepository.
func NewInventoryAdjustmentRepository() *InventoryAdjustmentRepository {
	return &InventoryAdjustmentRepository{}
}

func (r *InventoryAdjustmentRepository) GetByID(db *gorm.DB, id uint) (*domain.InventoryAdjustment, error) {
	var a domain.InventoryAdjustment
	err := db.Preload("InventoryItem").First(&a, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "inventory_adjustment"}
		}
		return nil, err
	}
	return &a, nil
}

func (r *InventoryAdjustmentRepository) Create(db *gorm.DB, a *domain.InventoryAdjustment) error {
	return db.Create(a).Error
}

func (r *InventoryAdjustmentRepository) Update(db *gorm.DB, a *domain.InventoryAdjustment) error {
	return db.Model(a).Updates(map[string]any{
		"status": a.Status,
		"notes":  a.Notes,
	}).Error
}

func (r *InventoryAdjustmentRepository) List(db *gorm.DB, f domain.InventoryAdjustmentFilter) ([]*domain.InventoryAdjustment, int64, error) {
	f.Clamp()
	var data []*domain.InventoryAdjustment
	var total int64

	q := db.Model(&domain.InventoryAdjustment{}).Preload("InventoryItem")
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.RequestedBy != nil {
		q = q.Where("requested_by = ?", *f.RequestedBy)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Offset(f.Offset()).Limit(f.PerPage).Find(&data).Error
	return data, total, err
}
