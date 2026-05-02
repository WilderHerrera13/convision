package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var inventoryItemFilterAllowlist = map[string]bool{
	"branch_id":             true,
	"product_id":            true,
	"warehouse_id":          true,
	"warehouse_location_id": true,
	"status":                true,
}

// InventoryItemRepository is the PostgreSQL-backed implementation of domain.InventoryItemRepository.
type InventoryItemRepository struct{}

// NewInventoryItemRepository creates a new InventoryItemRepository.
func NewInventoryItemRepository() *InventoryItemRepository {
	return &InventoryItemRepository{}
}

func (r *InventoryItemRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Product").
		Preload("Warehouse").
		Preload("WarehouseLocation")
}

func (r *InventoryItemRepository) GetByID(db *gorm.DB, id uint) (*domain.InventoryItem, error) {
	var item domain.InventoryItem
	err := r.withRelations(db).First(&item, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "inventory_item"}
		}
		return nil, err
	}
	return &item, nil
}

func (r *InventoryItemRepository) Create(db *gorm.DB, i *domain.InventoryItem) error {
	return db.Create(i).Error
}

func (r *InventoryItemRepository) Update(db *gorm.DB, i *domain.InventoryItem) error {
	return db.Model(i).Updates(map[string]any{
		"product_id":            i.ProductID,
		"warehouse_id":          i.WarehouseID,
		"warehouse_location_id": i.WarehouseLocationID,
		"quantity":              i.Quantity,
		"status":                i.Status,
		"notes":                 i.Notes,
	}).Error
}

func (r *InventoryItemRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.InventoryItem{}, id).Error
}

func (r *InventoryItemRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.InventoryItem, int64, error) {
	var items []*domain.InventoryItem
	var total int64

	q := db.Model(&domain.InventoryItem{})
	for field, value := range filters {
		if field == "branch_id" {
			q = q.Where("inventory_items.branch_id = ?", value)
			continue
		}
		if !inventoryItemFilterAllowlist[field] {
			continue
		}
		q = q.Where("inventory_items."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("inventory_items.id desc").
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *InventoryItemRepository) TotalStock(db *gorm.DB) (int64, error) {
	var total int64
	err := db.Model(&domain.InventoryItem{}).
		Where("status = ?", domain.InventoryItemStatusAvailable).
		Select("COALESCE(SUM(quantity), 0)").
		Scan(&total).Error
	return total, err
}

var totalStockItemFilterAllowlist = map[string]bool{
	"warehouse_id":          true,
	"warehouse_location_id": true,
}

var totalStockProductFilterAllowlist = map[string]bool{
	"brand_id":    true,
	"supplier_id": true,
}

func (r *InventoryItemRepository) TotalStockPerProduct(db *gorm.DB, filters map[string]any) ([]*domain.ProductStockEntry, error) {
	q := db.Table("inventory_items").
		Select("inventory_items.product_id, products.description AS product_name, COALESCE(SUM(inventory_items.quantity), 0) AS total_quantity").
		Joins("JOIN products ON products.id = inventory_items.product_id").
		Where("inventory_items.status = ?", domain.InventoryItemStatusAvailable).
		Where("products.tracks_stock = true").
		Group("inventory_items.product_id, products.description").
		Order("inventory_items.product_id")

	for field, value := range filters {
		if totalStockItemFilterAllowlist[field] {
			q = q.Where("inventory_items."+field+" = ?", value)
			continue
		}
		if totalStockProductFilterAllowlist[field] {
			q = q.Where("products."+field+" = ?", value)
			continue
		}
		if field == "category_id" {
			q = q.Where("products.product_category_id = ?", value)
		}
	}

	var results []*domain.ProductStockEntry
	if err := q.Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *InventoryItemRepository) ExistsByProductAndLocation(db *gorm.DB, productID, locationID, excludeID uint) (bool, error) {
	q := db.Model(&domain.InventoryItem{}).
		Where("product_id = ? AND warehouse_location_id = ?", productID, locationID)
	if excludeID != 0 {
		q = q.Where("id != ?", excludeID)
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
