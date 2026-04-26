package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// StockMovementRepository is the PostgreSQL-backed implementation of domain.StockMovementRepository.
type StockMovementRepository struct {
	db *gorm.DB
}

// NewStockMovementRepository creates a new StockMovementRepository.
func NewStockMovementRepository(db *gorm.DB) *StockMovementRepository {
	return &StockMovementRepository{db: db}
}

func (r *StockMovementRepository) Create(m *domain.StockMovement) error {
	return r.db.Create(m).Error
}

func (r *StockMovementRepository) List(filters map[string]any, page, perPage int) ([]*domain.StockMovement, int64, error) {
	var data []*domain.StockMovement
	var total int64

	q := r.db.Model(&domain.StockMovement{}).
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

func (r *StockMovementRepository) ListByProduct(productID uint, page, perPage int) ([]*domain.StockMovement, int64, error) {
	return r.List(map[string]any{"product_id": productID}, page, perPage)
}
