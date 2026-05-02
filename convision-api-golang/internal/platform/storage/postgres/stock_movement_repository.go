package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// StockMovementRepository is the PostgreSQL-backed implementation of domain.StockMovementRepository.
type StockMovementRepository struct{}

// NewStockMovementRepository creates a new StockMovementRepository.
func NewStockMovementRepository() *StockMovementRepository {
	return &StockMovementRepository{}
}

func (r *StockMovementRepository) Create(db *gorm.DB, m *domain.StockMovement) error {
	return db.Create(m).Error
}

func (r *StockMovementRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.StockMovement, int64, error) {
	var data []*domain.StockMovement
	var total int64

	q := db.Model(&domain.StockMovement{}).
		Preload("Product").
		Preload("Warehouse")

	if v, ok := filters["product_id"]; ok {
		q = q.Where("product_id = ?", v)
	}
	if v, ok := filters["warehouse_id"]; ok {
		q = q.Where("warehouse_id = ?", v)
	}
	if v, ok := filters["movement_type"]; ok {
		q = q.Where("movement_type = ?", v)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

func (r *StockMovementRepository) ListByProduct(db *gorm.DB, productID uint, page, perPage int) ([]*domain.StockMovement, int64, error) {
	return r.List(db, map[string]any{"product_id": productID}, page, perPage)
}
