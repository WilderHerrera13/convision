package postgres

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ProductRepository is the PostgreSQL-backed implementation of domain.ProductRepository.
type ProductRepository struct{}

// NewProductRepository creates a new ProductRepository.
func NewProductRepository() *ProductRepository {
	return &ProductRepository{}
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

func (r *ProductRepository) GetByID(db *gorm.DB, id uint) (*domain.Product, error) {
	var p domain.Product
	err := r.withRelations(db).First(&p, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "product"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) Create(db *gorm.DB, p *domain.Product) error {
	return db.Create(p).Error
}

func (r *ProductRepository) Update(db *gorm.DB, p *domain.Product) error {
	return db.Model(p).Updates(map[string]any{
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

func (r *ProductRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Product{}, id).Error
}

func (r *ProductRepository) List(db *gorm.DB, f domain.ProductFilter) ([]*domain.Product, int64, error) {
	f.Clamp()
	var products []*domain.Product
	var total int64

	q := db.Model(&domain.Product{})
	if f.Status != "" {
		q = q.Where("products.status = ?", f.Status)
	}
	if f.ProductCategoryID != nil {
		q = q.Where("products.product_category_id = ?", *f.ProductCategoryID)
	}
	if f.BrandID != nil {
		q = q.Where("products.brand_id = ?", *f.BrandID)
	}
	if f.SupplierID != nil {
		q = q.Where("products.supplier_id = ?", *f.SupplierID)
	}
	if f.ProductType != "" {
		q = q.Where("products.product_type = ?", f.ProductType)
	}
	if f.TracksStock != nil {
		q = q.Where("products.tracks_stock = ?", *f.TracksStock)
	}
	if f.InternalCode != "" {
		q = q.Where("products.internal_code = ?", f.InternalCode)
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("products.identifier ILIKE ? OR products.internal_code ILIKE ? OR products.description ILIKE ?", like, like, like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("products.id desc").
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *ProductRepository) Search(db *gorm.DB, query string, category string, page, perPage int) ([]*domain.Product, int64, error) {
	var products []*domain.Product
	var total int64

	q := db.Model(&domain.Product{})
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

func (r *ProductRepository) BulkUpdateStatus(db *gorm.DB, ids []uint, status string) (int64, error) {
	result := db.Model(&domain.Product{}).
		Where("id IN ?", ids).
		Update("status", status)
	return result.RowsAffected, result.Error
}

func (r *ProductRepository) ListByCategory(db *gorm.DB, slug string, filters map[string]any, page, perPage int) ([]*domain.Product, int64, error) {
	var products []*domain.Product
	var total int64

	q := db.Model(&domain.Product{}).
		Joins("JOIN product_categories ON product_categories.id = products.product_category_id").
		Where("product_categories.slug = ?", slug)

	if v, ok := filters["brand_id"]; ok {
		q = q.Where("products.brand_id = ?", v)
	}
	if v, ok := filters["supplier_id"]; ok {
		q = q.Where("products.supplier_id = ?", v)
	}
	if v, ok := filters["status"]; ok {
		q = q.Where("products.status = ?", v)
	}
	if v, ok := filters["search"]; ok {
		like := "%" + strings.ToLower(v.(string)) + "%"
		q = q.Where("LOWER(products.identifier) LIKE ? OR LOWER(products.internal_code) LIKE ? OR LOWER(products.description) LIKE ?", like, like, like)
	}

	// Lens attribute filters — join once if any lens filter is present.
	lensFilterCols := []string{"lens_type_id", "material_id", "lens_class_id", "treatment_id", "photochromic_id"}
	lensJoined := false
	for _, col := range lensFilterCols {
		if v, ok := filters[col]; ok {
			if !lensJoined {
				q = q.Joins("LEFT JOIN product_lens_attributes pla ON pla.product_id = products.id")
				lensJoined = true
			}
			q = q.Where("pla."+col+" = ?", v)
		}
	}

	// Frame attribute filters — join once if any frame filter is present.
	frameJoined := false
	for _, col := range []string{"frame_type", "gender", "color", "shape"} {
		if v, ok := filters[col]; ok {
			if !frameJoined {
				q = q.Joins("LEFT JOIN product_frame_attributes pfa ON pfa.product_id = products.id")
				frameJoined = true
			}
			like := "%" + strings.ToLower(v.(string)) + "%"
			q = q.Where("LOWER(pfa."+col+") LIKE ?", like)
		}
	}

	// Contact lens attribute filters.
	contactJoined := false
	for _, col := range []string{"contact_type", "replacement_schedule"} {
		if v, ok := filters[col]; ok {
			if !contactJoined {
				q = q.Joins("LEFT JOIN product_contact_lens_attributes pcla ON pcla.product_id = products.id")
				contactJoined = true
			}
			q = q.Where("pcla."+col+" = ?", v)
		}
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

func (r *ProductRepository) ListByPrescription(db *gorm.DB, f domain.PrescriptionFilter) ([]*domain.Product, error) {
	var products []*domain.Product

	q := db.Model(&domain.Product{}).
		Joins("JOIN product_categories ON product_categories.id = products.product_category_id").
		Where("product_categories.slug = ?", "lens").
		Joins("JOIN product_lens_attributes la ON la.product_id = products.id")

	// Use the most restrictive eye (OD takes priority, fall back to OS).
	sphere := f.SphereOD
	if sphere == nil {
		sphere = f.SphereOS
	}
	cylinder := f.CylinderOD
	if cylinder == nil {
		cylinder = f.CylinderOS
	}
	addition := f.AdditionOD
	if addition == nil {
		addition = f.AdditionOS
	}

	if sphere != nil {
		q = q.Where("la.sphere_min <= ? AND la.sphere_max >= ?", *sphere, *sphere)
	}
	if cylinder != nil {
		q = q.Where("la.cylinder_min <= ? AND la.cylinder_max >= ?", *cylinder, *cylinder)
	}
	if addition != nil {
		q = q.Where("la.addition_min <= ? AND la.addition_max >= ?", *addition, *addition)
	}

	err := r.withRelations(q).Order("products.id asc").Find(&products).Error
	return products, err
}

func (r *ProductRepository) StockByProduct(db *gorm.DB, productID uint) ([]*domain.ProductStockByWarehouse, error) {
	var results []*domain.ProductStockByWarehouse
	err := db.Table("inventory_items ii").
		Select(`ii.warehouse_id,
			w.name AS warehouse_name,
			ii.warehouse_location_id AS location_id,
			COALESCE(wl.name, '') AS location_name,
			ii.quantity,
			ii.status`).
		Joins("JOIN warehouses w ON w.id = ii.warehouse_id").
		Joins("LEFT JOIN warehouse_locations wl ON wl.id = ii.warehouse_location_id").
		Where("ii.product_id = ?", productID).
		Order("ii.warehouse_id, ii.warehouse_location_id").
		Scan(&results).Error
	return results, err
}

func (r *ProductRepository) ListLensCatalog(db *gorm.DB, f domain.LensCatalogFilter) ([]*domain.Product, int64, error) {
	f.Clamp()
	var data []*domain.Product
	var total int64

	q := db.Model(&domain.Product{}).
		Where("products.product_type = ?", domain.ProductTypeLens).
		Preload("Brand").
		Preload("LensAttributes").
		Preload("LensAttributes.LensType").
		Preload("LensAttributes.Material").
		Preload("LensAttributes.LensClass").
		Preload("LensAttributes.Treatment")

	if f.BrandID != nil {
		q = q.Where("products.brand_id = ?", *f.BrandID)
	}
	if f.SupplierID != nil {
		q = q.Where("products.supplier_id = ?", *f.SupplierID)
	}
	if f.Status != "" {
		q = q.Where("products.status = ?", f.Status)
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Joins("LEFT JOIN brands b_search ON b_search.id = products.brand_id").
			Where("products.internal_code ILIKE ? OR products.identifier ILIKE ? OR b_search.name ILIKE ?", like, like, like)
	}

	hasPrescription := f.SphereOD != nil || f.CylinderOD != nil || f.AdditionOD != nil ||
		f.SphereOS != nil || f.CylinderOS != nil || f.AdditionOS != nil
	if hasPrescription {
		q = q.Joins("JOIN product_lens_attributes pla ON pla.product_id = products.id")
		// OD takes priority over OS — lens_attributes carries a single sphere/cylinder/addition range.
		sphere := f.SphereOD
		if sphere == nil {
			sphere = f.SphereOS
		}
		cylinder := f.CylinderOD
		if cylinder == nil {
			cylinder = f.CylinderOS
		}
		addition := f.AdditionOD
		if addition == nil {
			addition = f.AdditionOS
		}
		if sphere != nil {
			q = q.Where("pla.sphere_min <= ? AND pla.sphere_max >= ?", *sphere, *sphere)
		}
		if cylinder != nil {
			q = q.Where("pla.cylinder_min <= ? AND pla.cylinder_max >= ?", *cylinder, *cylinder)
		}
		if addition != nil {
			q = q.Where("pla.addition_min <= ? AND pla.addition_max >= ?", *addition, *addition)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("products.internal_code ASC").
		Offset(f.Offset()).Limit(f.PerPage).Find(&data).Error
	return data, total, err
}
