package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// InventoryAdjustmentRepository is the PostgreSQL-backed implementation of domain.InventoryAdjustmentRepository.
type InventoryAdjustmentRepository struct {
	db *gorm.DB
}

// NewInventoryAdjustmentRepository creates a new InventoryAdjustmentRepository.
func NewInventoryAdjustmentRepository(db *gorm.DB) *InventoryAdjustmentRepository {
	return &InventoryAdjustmentRepository{db: db}
}

func (r *InventoryAdjustmentRepository) GetByID(id uint) (*domain.InventoryAdjustment, error) {
	var a domain.InventoryAdjustment
	err := r.db.Preload("InventoryItem").First(&a, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "inventory_adjustment"}
		}
		return nil, err
	}
	return &a, nil
}

func (r *InventoryAdjustmentRepository) Create(a *domain.InventoryAdjustment) error {
	return r.db.Create(a).Error
}

func (r *InventoryAdjustmentRepository) Update(a *domain.InventoryAdjustment) error {
	return r.db.Save(a).Error
}

func (r *InventoryAdjustmentRepository) List(filters map[string]any, page, perPage int) ([]*domain.InventoryAdjustment, int64, error) {
	var data []*domain.InventoryAdjustment
	var total int64

	q := r.db.Model(&domain.InventoryAdjustment{}).Preload("InventoryItem")

	if v, ok := filters["status"]; ok {
		q = q.Where("status = ?", v)
	}
	if v, ok := filters["requested_by"]; ok {
		q = q.Where("requested_by = ?", v)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}
