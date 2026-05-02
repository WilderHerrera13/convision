package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var productCategoryFilterAllowlist = map[string]bool{
	"is_active": true,
}

// ProductCategoryRepository is the PostgreSQL-backed implementation of domain.ProductCategoryRepository.
type ProductCategoryRepository struct{}

// NewProductCategoryRepository creates a new ProductCategoryRepository.
func NewProductCategoryRepository() *ProductCategoryRepository {
	return &ProductCategoryRepository{}
}

func (r *ProductCategoryRepository) GetByID(db *gorm.DB, id uint) (*domain.ProductCategory, error) {
	var c domain.ProductCategory
	err := db.First(&c, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "product_category"}
		}
		return nil, err
	}
	return &c, nil
}

func (r *ProductCategoryRepository) Create(db *gorm.DB, c *domain.ProductCategory) error {
	return db.Create(c).Error
}

func (r *ProductCategoryRepository) Update(db *gorm.DB, c *domain.ProductCategory) error {
	return db.Model(c).Updates(map[string]any{
		"name":        c.Name,
		"slug":        c.Slug,
		"description": c.Description,
		"icon":        c.Icon,
		"is_active":   c.IsActive,
	}).Error
}

func (r *ProductCategoryRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.ProductCategory{}, id).Error
}

func (r *ProductCategoryRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.ProductCategory, int64, error) {
	var cats []*domain.ProductCategory
	var total int64

	q := db.Model(&domain.ProductCategory{})
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

func (r *ProductCategoryRepository) All(db *gorm.DB) ([]*domain.ProductCategory, error) {
	var cats []*domain.ProductCategory
	err := db.Model(&domain.ProductCategory{}).
		Where("is_active = ?", true).
		Order("product_categories.id asc").
		Find(&cats).Error
	return cats, err
}

func (r *ProductCategoryRepository) ListWithProductCount(db *gorm.DB) ([]*domain.CategoryWithCount, error) {
	type row struct {
		domain.ProductCategory
		ProductCount int64 `gorm:"column:product_count"`
	}
	var rows []row
	err := db.Table("product_categories").
		Select("product_categories.*, COUNT(p.id) AS product_count").
		Joins("LEFT JOIN products p ON p.product_category_id = product_categories.id AND p.deleted_at IS NULL").
		Group("product_categories.id").
		Order("product_categories.id asc").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]*domain.CategoryWithCount, len(rows))
	for i, r := range rows {
		cat := r.ProductCategory
		out[i] = &domain.CategoryWithCount{
			ProductCategory: &cat,
			ProductCount:    r.ProductCount,
		}
	}
	return out, nil
}

func (r *ProductCategoryRepository) GetBySlug(db *gorm.DB, slug string) (*domain.ProductCategory, error) {
	var c domain.ProductCategory
	err := db.Where("slug = ?", slug).First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "product_category"}
		}
		return nil, err
	}
	return &c, nil
}
