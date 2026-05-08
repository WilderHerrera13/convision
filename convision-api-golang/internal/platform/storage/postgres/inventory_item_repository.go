package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

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

func (r *InventoryItemRepository) List(db *gorm.DB, f domain.InventoryItemFilter) ([]*domain.InventoryItem, int64, error) {
	f.Clamp()
	var items []*domain.InventoryItem
	var total int64

	q := db.Model(&domain.InventoryItem{})
	if f.BranchID != nil {
		q = q.Where("inventory_items.branch_id = ?", *f.BranchID)
	}
	if f.ProductID != nil {
		q = q.Where("inventory_items.product_id = ?", *f.ProductID)
	}
	if f.WarehouseID != nil {
		q = q.Where("inventory_items.warehouse_id = ?", *f.WarehouseID)
	}
	if f.WarehouseLocationID != nil {
		q = q.Where("inventory_items.warehouse_location_id = ?", *f.WarehouseLocationID)
	}
	if f.Status != "" {
		q = q.Where("inventory_items.status = ?", f.Status)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
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

func applyTotalStockFilters(q *gorm.DB, f domain.TotalStockFilter) *gorm.DB {
	q = q.Joins("JOIN products ON products.id = inventory_items.product_id").
		Joins("LEFT JOIN brands ON brands.id = products.brand_id").
		Where("inventory_items.status = ?", domain.InventoryItemStatusAvailable).
		Where("products.tracks_stock = true")
	if f.WarehouseID != nil {
		q = q.Where("inventory_items.warehouse_id = ?", *f.WarehouseID)
	}
	if f.WarehouseLocationID != nil {
		q = q.Where("inventory_items.warehouse_location_id = ?", *f.WarehouseLocationID)
	}
	if f.BrandID != nil {
		q = q.Where("products.brand_id = ?", *f.BrandID)
	}
	if f.SupplierID != nil {
		q = q.Where("products.supplier_id = ?", *f.SupplierID)
	}
	if f.CategoryID != nil {
		q = q.Where("products.product_category_id = ?", *f.CategoryID)
	}
	return q
}

func (r *InventoryItemRepository) TotalStockPerProduct(db *gorm.DB, f domain.TotalStockFilter) ([]*domain.ProductStockEntry, int64, error) {
	f.Clamp()
	var total int64
	if err := applyTotalStockFilters(db.Table("inventory_items"), f).
		Select("COUNT(DISTINCT inventory_items.product_id)").
		Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	results := make([]*domain.ProductStockEntry, 0)
	err := applyTotalStockFilters(db.Table("inventory_items"), f).
		Select("inventory_items.product_id AS id, products.internal_code, products.identifier, brands.name AS brand_name, COALESCE(SUM(inventory_items.quantity), 0) AS total_quantity").
		Group("inventory_items.product_id, products.internal_code, products.identifier, brands.name").
		Order("products.internal_code").
		Limit(f.PerPage).
		Offset(f.Offset()).
		Scan(&results).Error
	if err != nil {
		return nil, 0, err
	}
	return results, total, nil
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
