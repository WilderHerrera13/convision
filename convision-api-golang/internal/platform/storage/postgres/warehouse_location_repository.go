package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

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

func (r *WarehouseLocationRepository) List(db *gorm.DB, f domain.WarehouseLocationFilter) ([]*domain.WarehouseLocation, int64, error) {
	f.Clamp()
	var locations []*domain.WarehouseLocation
	var total int64

	q := db.Model(&domain.WarehouseLocation{})
	if f.BranchID != nil {
		q = q.Where("warehouse_locations.branch_id = ?", *f.BranchID)
	}
	if f.WarehouseID != nil {
		q = q.Where("warehouse_locations.warehouse_id = ?", *f.WarehouseID)
	}
	if f.Status != "" {
		q = q.Where("warehouse_locations.status = ?", f.Status)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Preload("Warehouse").
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("warehouse_locations.id asc").
		Find(&locations).Error
	if err != nil {
		return nil, 0, err
	}

	return locations, total, nil
}
