package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var lensFilterAllowlist = map[string]bool{
	"status":        true,
	"type_id":       true,
	"brand_id":      true,
	"material_id":   true,
	"lens_class_id": true,
	"treatment_id":  true,
	"supplier_id":   true,
}

type LensRepository struct{ db *gorm.DB }

func NewLensRepository(db *gorm.DB) *LensRepository { return &LensRepository{db: db} }

func (r *LensRepository) GetByID(id uint) (*domain.Lens, error) {
	var l domain.Lens
	err := r.db.
		Preload("LensType").Preload("Brand").Preload("Material").
		Preload("LensClass").Preload("Treatment").Preload("Photochromic").
		First(&l, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens"}
	}
	return &l, err
}

func (r *LensRepository) GetByInternalCode(code string) (*domain.Lens, error) {
	var l domain.Lens
	err := r.db.Select("id, internal_code").
		Where("internal_code = ?", code).First(&l).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens"}
	}
	return &l, err
}

func (r *LensRepository) Create(l *domain.Lens) error {
	return r.db.Create(l).Error
}

func (r *LensRepository) Update(l *domain.Lens) error {
	return r.db.Model(l).Updates(map[string]any{
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

func (r *LensRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Lens{}, id).Error
}

func (r *LensRepository) List(filters map[string]any, page, perPage int) ([]*domain.Lens, int64, error) {
	var data []*domain.Lens
	var total int64

	q := r.db.Model(&domain.Lens{})
	for k, v := range filters {
		if lensFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Select("id, internal_code, identifier, type_id, brand_id, material_id, lens_class_id, treatment_id, photochromic_id, description, supplier_id, price, cost, status, created_at, updated_at").
		Order("internal_code asc").
		Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}
