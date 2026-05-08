package postgres

import (
	"errors"

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

func (r *StockMovementRepository) List(db *gorm.DB, f domain.StockMovementFilter) ([]*domain.StockMovement, int64, error) {
	f.Clamp()
	var data []*domain.StockMovement
	var total int64

	q := db.Model(&domain.StockMovement{}).
		Preload("Product").
		Preload("Warehouse")
	if f.ProductID != nil {
		q = q.Where("product_id = ?", *f.ProductID)
	}
	if f.WarehouseID != nil {
		q = q.Where("warehouse_id = ?", *f.WarehouseID)
	}
	if f.MovementType != "" {
		q = q.Where("movement_type = ?", f.MovementType)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Offset(f.Offset()).Limit(f.PerPage).Find(&data).Error
	return data, total, err
}

func (r *StockMovementRepository) ListByProduct(db *gorm.DB, productID uint, page, perPage int) ([]*domain.StockMovement, int64, error) {
	pid := productID
	return r.List(db, domain.StockMovementFilter{
		Pagination: domain.Pagination{Page: page, PerPage: perPage},
		ProductID:  &pid,
	})
}

func (r *StockMovementRepository) FindBySaleAndProduct(db *gorm.DB, saleID, productID uint) (*domain.StockMovement, error) {
	var m domain.StockMovement
	refType := domain.ReferenceTypeSale
	err := db.
		Where("reference_type = ? AND reference_id = ? AND product_id = ? AND movement_type = ?",
			refType, saleID, productID, domain.MovementTypeExit).
		Order("created_at DESC").
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "stock_movement"}
		}
		return nil, err
	}
	return &m, nil
}
