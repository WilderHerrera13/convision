package postgres

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var productFilterAllowlist = map[string]bool{
	"status":              true,
	"product_category_id": true,
	"brand_id":            true,
	"supplier_id":         true,
}

// ProductRepository is the PostgreSQL-backed implementation of domain.ProductRepository.
type ProductRepository struct {
	db *gorm.DB
}

// NewProductRepository creates a new ProductRepository.
func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Category").
		Preload("Brand").
		Preload("LensAttributes").
		Preload("LensAttributes.LensType").
		Preload("LensAttributes.Material").
		Preload("LensAttributes.LensClass").
		Preload("LensAttributes.Treatment").
		Preload("LensAttributes.Photochromic").
		Preload("FrameAttributes").
		Preload("ContactLensAttributes")
}

func (r *ProductRepository) GetByID(id uint) (*domain.Product, error) {
	var p domain.Product
	err := r.withRelations(r.db).First(&p, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "product"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) Create(p *domain.Product) error {
	return r.db.Create(p).Error
}

func (r *ProductRepository) Update(p *domain.Product) error {
	return r.db.Model(p).Updates(map[string]any{
		"internal_code":       p.InternalCode,
		"identifier":          p.Identifier,
		"description":         p.Description,
		"cost":                p.Cost,
		"price":               p.Price,
		"product_category_id": p.ProductCategoryID,
		"brand_id":            p.BrandID,
		"supplier_id":         p.SupplierID,
		"status":              p.Status,
	}).Error
}

func (r *ProductRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Product{}, id).Error
}

func (r *ProductRepository) List(filters map[string]any, page, perPage int) ([]*domain.Product, int64, error) {
	var products []*domain.Product
	var total int64

	q := r.db.Model(&domain.Product{})
	for field, value := range filters {
		if !productFilterAllowlist[field] {
			continue
		}
		q = q.Where("products."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("products.id desc").
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *ProductRepository) Search(query string, category string, page, perPage int) ([]*domain.Product, int64, error) {
	var products []*domain.Product
	var total int64

	q := r.db.Model(&domain.Product{})
	if query != "" {
		like := "%" + strings.ToLower(query) + "%"
		q = q.Where("LOWER(products.identifier) LIKE ? OR LOWER(products.internal_code) LIKE ? OR LOWER(products.description) LIKE ?", like, like, like)
	}
	if category != "" {
		q = q.Joins("JOIN product_categories ON product_categories.id = products.product_category_id").
			Where("product_categories.slug = ?", category)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("products.id desc").
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *ProductRepository) BulkUpdateStatus(ids []uint, status string) (int64, error) {
	result := r.db.Model(&domain.Product{}).
		Where("id IN ?", ids).
		Update("status", status)
	return result.RowsAffected, result.Error
}
