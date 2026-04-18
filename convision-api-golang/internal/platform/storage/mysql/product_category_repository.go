package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var productCategoryFilterAllowlist = map[string]bool{
	"is_active": true,
}

// ProductCategoryRepository is the PostgreSQL-backed implementation of domain.ProductCategoryRepository.
type ProductCategoryRepository struct {
	db *gorm.DB
}

// NewProductCategoryRepository creates a new ProductCategoryRepository.
func NewProductCategoryRepository(db *gorm.DB) *ProductCategoryRepository {
	return &ProductCategoryRepository{db: db}
}

func (r *ProductCategoryRepository) GetByID(id uint) (*domain.ProductCategory, error) {
	var c domain.ProductCategory
	err := r.db.First(&c, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "product_category"}
		}
		return nil, err
	}
	return &c, nil
}

func (r *ProductCategoryRepository) Create(c *domain.ProductCategory) error {
	return r.db.Create(c).Error
}

func (r *ProductCategoryRepository) Update(c *domain.ProductCategory) error {
	return r.db.Model(c).Updates(map[string]any{
		"name":        c.Name,
		"slug":        c.Slug,
		"description": c.Description,
		"icon":        c.Icon,
		"is_active":   c.IsActive,
	}).Error
}

func (r *ProductCategoryRepository) Delete(id uint) error {
	return r.db.Delete(&domain.ProductCategory{}, id).Error
}

func (r *ProductCategoryRepository) List(filters map[string]any, page, perPage int) ([]*domain.ProductCategory, int64, error) {
	var cats []*domain.ProductCategory
	var total int64

	q := r.db.Model(&domain.ProductCategory{})
	for field, value := range filters {
		if !productCategoryFilterAllowlist[field] {
			continue
		}
		q = q.Where("product_categories."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Select("id, name, slug, description, icon, required_attributes, is_active, created_at, updated_at").
		Offset(offset).
		Limit(perPage).
		Order("product_categories.id asc").
		Find(&cats).Error
	if err != nil {
		return nil, 0, err
	}

	return cats, total, nil
}
