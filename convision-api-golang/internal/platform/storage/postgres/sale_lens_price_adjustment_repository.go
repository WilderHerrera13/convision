package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// SaleLensPriceAdjustmentRepository implements domain.SaleLensPriceAdjustmentRepository.
type SaleLensPriceAdjustmentRepository struct{}

// NewSaleLensPriceAdjustmentRepository creates a new repository.
func NewSaleLensPriceAdjustmentRepository() *SaleLensPriceAdjustmentRepository {
	return &SaleLensPriceAdjustmentRepository{}
}

func (r *SaleLensPriceAdjustmentRepository) GetBySaleID(db *gorm.DB, saleID uint) ([]*domain.SaleLensPriceAdjustment, error) {
	var adjs []*domain.SaleLensPriceAdjustment
	err := db.
		Preload("Lens").
		Preload("AdjustedByUser").
		Where("sale_id = ?", saleID).
		Find(&adjs).Error
	return adjs, err
}

func (r *SaleLensPriceAdjustmentRepository) GetByID(db *gorm.DB, id uint) (*domain.SaleLensPriceAdjustment, error) {
	var adj domain.SaleLensPriceAdjustment
	err := db.
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

func (r *SaleLensPriceAdjustmentRepository) Create(db *gorm.DB, adj *domain.SaleLensPriceAdjustment) error {
	return db.Create(adj).Error
}

func (r *SaleLensPriceAdjustmentRepository) Delete(db *gorm.DB, id uint) error {
	result := db.Delete(&domain.SaleLensPriceAdjustment{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &domain.ErrNotFound{Resource: "lens_price_adjustment"}
	}
	return nil
}

func (r *SaleLensPriceAdjustmentRepository) GetBySaleLens(db *gorm.DB, saleID, lensID uint) (*domain.SaleLensPriceAdjustment, error) {
	var adj domain.SaleLensPriceAdjustment
	err := db.
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
