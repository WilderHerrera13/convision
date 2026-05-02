package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var warehouseFilterAllowlist = map[string]bool{
	"branch_id": true,
	"status":    true,
}

// WarehouseRepository is the PostgreSQL-backed implementation of domain.WarehouseRepository.
type WarehouseRepository struct{}

// NewWarehouseRepository creates a new WarehouseRepository.
func NewWarehouseRepository() *WarehouseRepository {
	return &WarehouseRepository{}
}

func (r *WarehouseRepository) GetByID(db *gorm.DB, id uint) (*domain.Warehouse, error) {
	var w domain.Warehouse
	err := db.Preload("Locations").First(&w, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "warehouse"}
		}
		return nil, err
	}
	return &w, nil
}

func (r *WarehouseRepository) Create(db *gorm.DB, w *domain.Warehouse) error {
	return db.Create(w).Error
}

func (r *WarehouseRepository) Update(db *gorm.DB, w *domain.Warehouse) error {
	return db.Model(w).Updates(map[string]any{
		"name":    w.Name,
		"code":    w.Code,
		"address": w.Address,
		"city":    w.City,
		"status":  w.Status,
		"notes":   w.Notes,
	}).Error
}

func (r *WarehouseRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Warehouse{}, id).Error
}

func (r *WarehouseRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Warehouse, int64, error) {
	var warehouses []*domain.Warehouse
	var total int64

	q := db.Model(&domain.Warehouse{})
	for field, value := range filters {
		if field == "branch_id" {
			q = q.Where("warehouses.branch_id = ?", value)
			continue
		}
		if !warehouseFilterAllowlist[field] {
			continue
		}
		q = q.Where("warehouses."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Select("id, name, code, address, city, status, notes, created_at, updated_at").
		Offset(offset).
		Limit(perPage).
		Order("warehouses.id asc").
		Find(&warehouses).Error
	if err != nil {
		return nil, 0, err
	}

	return warehouses, total, nil
}

func (r *WarehouseRepository) ListLocations(db *gorm.DB, warehouseID uint) ([]*domain.WarehouseLocation, error) {
	var locations []*domain.WarehouseLocation
	err := db.
		Select("id, warehouse_id, name, code, type, status, description, created_at, updated_at").
		Where("warehouse_id = ?", warehouseID).
		Order("id asc").
		Find(&locations).Error
	return locations, err
}
