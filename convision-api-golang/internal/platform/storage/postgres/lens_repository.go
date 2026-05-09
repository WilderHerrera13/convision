package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type LensRepository struct{}

func NewLensRepository() *LensRepository { return &LensRepository{} }

func (r *LensRepository) GetByID(db *gorm.DB, id uint) (*domain.Lens, error) {
	var l domain.Lens
	err := db.
		Preload("LensType").Preload("Brand").Preload("Material").
		Preload("LensClass").Preload("Treatment").Preload("Photochromic").
		First(&l, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens"}
	}
	return &l, err
}

func (r *LensRepository) GetByInternalCode(db *gorm.DB, code string) (*domain.Lens, error) {
	var l domain.Lens
	err := db.Select("id, internal_code").
		Where("internal_code = ?", code).First(&l).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens"}
	}
	return &l, err
}

func (r *LensRepository) Create(db *gorm.DB, l *domain.Lens) error {
	return db.Create(l).Error
}

func (r *LensRepository) Update(db *gorm.DB, l *domain.Lens) error {
	return db.Model(l).Updates(map[string]any{
		"internal_code":   l.InternalCode,
		"identifier":      l.Identifier,
		"type_id":         l.TypeID,
		"brand_id":        l.BrandID,
		"material_id":     l.MaterialID,
		"lens_class_id":   l.LensClassID,
		"treatment_id":    l.TreatmentID,
		"photochromic_id": l.PhotochromicID,
		"description":     l.Description,
		"supplier_id":     l.SupplierID,
		"price":           l.Price,
		"cost":            l.Cost,
		"sphere_min":      l.SphereMin,
		"sphere_max":      l.SphereMax,
		"cylinder_min":    l.CylinderMin,
		"cylinder_max":    l.CylinderMax,
		"addition_min":    l.AdditionMin,
		"addition_max":    l.AdditionMax,
		"status":          l.Status,
	}).Error
}

func (r *LensRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Lens{}, id).Error
}

func (r *LensRepository) List(db *gorm.DB, f domain.LensFilter) ([]*domain.Lens, int64, error) {
	f.Clamp()
	var data []*domain.Lens
	var total int64

	q := db.Model(&domain.Lens{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.TypeID != nil {
		q = q.Where("type_id = ?", *f.TypeID)
	}
	if f.BrandID != nil {
		q = q.Where("brand_id = ?", *f.BrandID)
	}
	if f.MaterialID != nil {
		q = q.Where("material_id = ?", *f.MaterialID)
	}
	if f.LensClassID != nil {
		q = q.Where("lens_class_id = ?", *f.LensClassID)
	}
	if f.TreatmentID != nil {
		q = q.Where("treatment_id = ?", *f.TreatmentID)
	}
	if f.SupplierID != nil {
		q = q.Where("supplier_id = ?", *f.SupplierID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Select("id, internal_code, identifier, type_id, brand_id, material_id, lens_class_id, treatment_id, photochromic_id, description, supplier_id, price, cost, status, created_at, updated_at").
		Order("internal_code asc").
		Offset(f.Offset()).Limit(f.PerPage).Find(&data).Error
	return data, total, err
}
