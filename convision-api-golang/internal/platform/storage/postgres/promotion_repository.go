package postgres

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// PromotionRepository is the PostgreSQL-backed implementation of domain.PromotionRepository.
type PromotionRepository struct{}

// NewPromotionRepository creates a new PromotionRepository.
func NewPromotionRepository() *PromotionRepository {
	return &PromotionRepository{}
}

func (r *PromotionRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.Preload("Category").Preload("Brand")
}

func (r *PromotionRepository) GetByID(db *gorm.DB, id uint) (*domain.Promotion, error) {
	var p domain.Promotion
	if err := r.withRelations(db).First(&p, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "promotion"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PromotionRepository) Create(db *gorm.DB, p *domain.Promotion) error {
	return db.Create(p).Error
}

func (r *PromotionRepository) Update(db *gorm.DB, p *domain.Promotion) error {
	// Detached model: p may carry preloaded Category/Brand associations and GORM's
	// belongs-to handling would otherwise overwrite the FK columns being updated
	// with the stale association's primary key.
	return db.Model(&domain.Promotion{ID: p.ID}).Updates(map[string]any{
		"name":                        p.Name,
		"type":                        p.Type,
		"active":                      p.Active,
		"priority":                    p.Priority,
		"stackable":                   p.Stackable,
		"discount_percentage":         p.DiscountPercentage,
		"discount_amount":             p.DiscountAmount,
		"min_cart_total":              p.MinCartTotal,
		"min_quantity":                p.MinQuantity,
		"scope":                       p.Scope,
		"product_category_id":         p.ProductCategoryID,
		"brand_id":                    p.BrandID,
		"product_type":                p.ProductType,
		"trigger_scope":               p.TriggerScope,
		"trigger_product_category_id": p.TriggerProductCategoryID,
		"trigger_brand_id":            p.TriggerBrandID,
		"trigger_product_type":        p.TriggerProductType,
		"start_date":                  p.StartDate,
		"end_date":                    p.EndDate,
		"description":                 p.Description,
	}).Error
}

func (r *PromotionRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Promotion{}, id).Error
}

func (r *PromotionRepository) List(db *gorm.DB, f domain.PromotionFilter) ([]*domain.Promotion, int64, error) {
	f.Clamp()
	var promotions []*domain.Promotion
	var total int64

	q := db.Model(&domain.Promotion{})
	if f.Type != "" {
		q = q.Where("type = ?", f.Type)
	}
	if f.Active != nil {
		q = q.Where("active = ?", *f.Active)
	}
	if f.Search != "" {
		q = q.Where("name ILIKE ?", "%"+f.Search+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("priority desc, id desc").
		Find(&promotions).Error
	if err != nil {
		return nil, 0, err
	}
	return promotions, total, nil
}

func (r *PromotionRepository) ListActiveAt(db *gorm.DB, at time.Time) ([]*domain.Promotion, error) {
	var promotions []*domain.Promotion
	err := r.withRelations(db).
		Where("active = ?", true).
		Where("(start_date IS NULL OR start_date <= ?)", at).
		Where("(end_date IS NULL OR end_date >= ?)", at).
		Order("priority desc, id desc").
		Find(&promotions).Error
	return promotions, err
}
