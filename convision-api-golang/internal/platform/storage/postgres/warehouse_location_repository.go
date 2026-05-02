package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var warehouseLocationFilterAllowlist = map[string]bool{
	"warehouse_id": true,
	"status":       true,
	"type":         true,
}

// WarehouseLocationRepository is the PostgreSQL-backed implementation of domain.WarehouseLocationRepository.
type WarehouseLocationRepository struct{}

// NewWarehouseLocationRepository creates a new WarehouseLocationRepository.
func NewWarehouseLocationRepository() *WarehouseLocationRepository {
	return &WarehouseLocationRepository{}
}

func (r *WarehouseLocationRepository) GetByID(db *gorm.DB, id uint) (*domain.WarehouseLocation, error) {
	var l domain.WarehouseLocation
	err := db.Preload("Warehouse").First(&l, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "warehouse_location"}
		}
		return nil, err
	}
	return &l, nil
}

func (r *WarehouseLocationRepository) Create(db *gorm.DB, l *domain.WarehouseLocation) error {
	return db.Create(l).Error
}

func (r *WarehouseLocationRepository) Update(db *gorm.DB, l *domain.WarehouseLocation) error {
	return db.Model(l).Updates(map[string]any{
		"warehouse_id": l.WarehouseID,
		"name":         l.Name,
		"code":         l.Code,
		"type":         l.Type,
		"status":       l.Status,
		"description":  l.Description,
	}).Error
}

func (r *WarehouseLocationRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.WarehouseLocation{}, id).Error
}

func (r *WarehouseLocationRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.WarehouseLocation, int64, error) {
	var locations []*domain.WarehouseLocation
	var total int64

	q := db.Model(&domain.WarehouseLocation{})
	for field, value := range filters {
		if !warehouseLocationFilterAllowlist[field] {
			continue
		}
		q = q.Where("warehouse_locations."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Preload("Warehouse").
		Offset(offset).
		Limit(perPage).
		Order("warehouse_locations.id asc").
		Find(&locations).Error
	if err != nil {
		return nil, 0, err
	}

	return locations, total, nil
}
