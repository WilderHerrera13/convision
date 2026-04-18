package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// SaleLensPriceAdjustmentRepository implements domain.SaleLensPriceAdjustmentRepository.
type SaleLensPriceAdjustmentRepository struct {
	db *gorm.DB
}

// NewSaleLensPriceAdjustmentRepository creates a new repository.
func NewSaleLensPriceAdjustmentRepository(db *gorm.DB) *SaleLensPriceAdjustmentRepository {
	return &SaleLensPriceAdjustmentRepository{db: db}
}

func (r *SaleLensPriceAdjustmentRepository) GetBySaleID(saleID uint) ([]*domain.SaleLensPriceAdjustment, error) {
	var adjs []*domain.SaleLensPriceAdjustment
	err := r.db.
		Preload("Lens").
		Preload("AdjustedByUser").
		Where("sale_id = ?", saleID).
		Find(&adjs).Error
	return adjs, err
}

func (r *SaleLensPriceAdjustmentRepository) GetByID(id uint) (*domain.SaleLensPriceAdjustment, error) {
	var adj domain.SaleLensPriceAdjustment
	err := r.db.
		Preload("Lens").
		Preload("AdjustedByUser").
		First(&adj, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "lens_price_adjustment"}
		}
		return nil, err
	}
	return &adj, nil
}

func (r *SaleLensPriceAdjustmentRepository) Create(adj *domain.SaleLensPriceAdjustment) error {
	return r.db.Create(adj).Error
}

func (r *SaleLensPriceAdjustmentRepository) Delete(id uint) error {
	result := r.db.Delete(&domain.SaleLensPriceAdjustment{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &domain.ErrNotFound{Resource: "lens_price_adjustment"}
	}
	return nil
}

func (r *SaleLensPriceAdjustmentRepository) GetBySaleLens(saleID, lensID uint) (*domain.SaleLensPriceAdjustment, error) {
	var adj domain.SaleLensPriceAdjustment
	err := r.db.
		Where("sale_id = ? AND lens_id = ?", saleID, lensID).
		First(&adj).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "lens_price_adjustment"}
		}
		return nil, err
	}
	return &adj, nil
}
