package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ---------- Brand ----------

type BrandRepository struct{ db *gorm.DB }

func NewBrandRepository(db *gorm.DB) *BrandRepository { return &BrandRepository{db: db} }

func (r *BrandRepository) GetByID(id uint) (*domain.Brand, error) {
	var e domain.Brand
	err := r.db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "brand"}
	}
	return &e, err
}

func (r *BrandRepository) Create(e *domain.Brand) error {
	return r.db.Create(e).Error
}

func (r *BrandRepository) Update(e *domain.Brand) error {
	return r.db.Model(e).Updates(map[string]any{
		"name":        e.Name,
		"description": e.Description,
	}).Error
}

func (r *BrandRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Brand{}, id).Error
}

func (r *BrandRepository) List(page, perPage int) ([]*domain.Brand, int64, error) {
	var data []*domain.Brand
	var total int64

	q := r.db.Model(&domain.Brand{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").
		Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- LensType ----------

type LensTypeRepository struct{ db *gorm.DB }

func NewLensTypeRepository(db *gorm.DB) *LensTypeRepository { return &LensTypeRepository{db: db} }

func (r *LensTypeRepository) GetByID(id uint) (*domain.LensType, error) {
	var e domain.LensType
	err := r.db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens_type"}
	}
	return &e, err
}

func (r *LensTypeRepository) Create(e *domain.LensType) error { return r.db.Create(e).Error }

func (r *LensTypeRepository) Update(e *domain.LensType) error {
	return r.db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *LensTypeRepository) Delete(id uint) error {
	return r.db.Delete(&domain.LensType{}, id).Error
}

func (r *LensTypeRepository) List(page, perPage int) ([]*domain.LensType, int64, error) {
	var data []*domain.LensType
	var total int64
	q := r.db.Model(&domain.LensType{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- Material ----------

type MaterialRepository struct{ db *gorm.DB }

func NewMaterialRepository(db *gorm.DB) *MaterialRepository { return &MaterialRepository{db: db} }

func (r *MaterialRepository) GetByID(id uint) (*domain.Material, error) {
	var e domain.Material
	err := r.db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "material"}
	}
	return &e, err
}

func (r *MaterialRepository) Create(e *domain.Material) error { return r.db.Create(e).Error }

func (r *MaterialRepository) Update(e *domain.Material) error {
	return r.db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *MaterialRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Material{}, id).Error
}

func (r *MaterialRepository) List(page, perPage int) ([]*domain.Material, int64, error) {
	var data []*domain.Material
	var total int64
	q := r.db.Model(&domain.Material{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- LensClass ----------

type LensClassRepository struct{ db *gorm.DB }

func NewLensClassRepository(db *gorm.DB) *LensClassRepository { return &LensClassRepository{db: db} }

func (r *LensClassRepository) GetByID(id uint) (*domain.LensClass, error) {
	var e domain.LensClass
	err := r.db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens_class"}
	}
	return &e, err
}

func (r *LensClassRepository) Create(e *domain.LensClass) error { return r.db.Create(e).Error }

func (r *LensClassRepository) Update(e *domain.LensClass) error {
	return r.db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *LensClassRepository) Delete(id uint) error {
	return r.db.Delete(&domain.LensClass{}, id).Error
}

func (r *LensClassRepository) List(page, perPage int) ([]*domain.LensClass, int64, error) {
	var data []*domain.LensClass
	var total int64
	q := r.db.Model(&domain.LensClass{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- Treatment ----------

type TreatmentRepository struct{ db *gorm.DB }

func NewTreatmentRepository(db *gorm.DB) *TreatmentRepository { return &TreatmentRepository{db: db} }

func (r *TreatmentRepository) GetByID(id uint) (*domain.Treatment, error) {
	var e domain.Treatment
	err := r.db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "treatment"}
	}
	return &e, err
}

func (r *TreatmentRepository) Create(e *domain.Treatment) error { return r.db.Create(e).Error }

func (r *TreatmentRepository) Update(e *domain.Treatment) error {
	return r.db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *TreatmentRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Treatment{}, id).Error
}

func (r *TreatmentRepository) List(page, perPage int) ([]*domain.Treatment, int64, error) {
	var data []*domain.Treatment
	var total int64
	q := r.db.Model(&domain.Treatment{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- Photochromic ----------

type PhotochromicRepository struct{ db *gorm.DB }

func NewPhotochromicRepository(db *gorm.DB) *PhotochromicRepository {
	return &PhotochromicRepository{db: db}
}

func (r *PhotochromicRepository) GetByID(id uint) (*domain.Photochromic, error) {
	var e domain.Photochromic
	err := r.db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "photochromic"}
	}
	return &e, err
}

func (r *PhotochromicRepository) Create(e *domain.Photochromic) error { return r.db.Create(e).Error }

func (r *PhotochromicRepository) Update(e *domain.Photochromic) error {
	return r.db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *PhotochromicRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Photochromic{}, id).Error
}

func (r *PhotochromicRepository) List(page, perPage int) ([]*domain.Photochromic, int64, error) {
	var data []*domain.Photochromic
	var total int64
	q := r.db.Model(&domain.Photochromic{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- PaymentMethod ----------

type PaymentMethodRepository struct{ db *gorm.DB }

func NewPaymentMethodRepository(db *gorm.DB) *PaymentMethodRepository {
	return &PaymentMethodRepository{db: db}
}

func (r *PaymentMethodRepository) GetByID(id uint) (*domain.PaymentMethod, error) {
	var e domain.PaymentMethod
	err := r.db.Select("id, name, code, description, icon, is_active, requires_reference, created_at, updated_at").
		First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "payment_method"}
	}
	return &e, err
}

func (r *PaymentMethodRepository) Create(e *domain.PaymentMethod) error { return r.db.Create(e).Error }

func (r *PaymentMethodRepository) Update(e *domain.PaymentMethod) error {
	return r.db.Model(e).Updates(map[string]any{
		"name": e.Name, "code": e.Code, "description": e.Description,
		"icon": e.Icon, "is_active": e.IsActive, "requires_reference": e.RequiresReference,
	}).Error
}

func (r *PaymentMethodRepository) Delete(id uint) error {
	return r.db.Delete(&domain.PaymentMethod{}, id).Error
}

func (r *PaymentMethodRepository) List(page, perPage int) ([]*domain.PaymentMethod, int64, error) {
	var data []*domain.PaymentMethod
	var total int64
	q := r.db.Model(&domain.PaymentMethod{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, code, description, icon, is_active, requires_reference, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ListActive returns all active payment methods ordered by name (no pagination).
func (r *PaymentMethodRepository) ListActive() ([]*domain.PaymentMethod, error) {
	var data []*domain.PaymentMethod
	err := r.db.
		Select("id, name, code, description, icon, is_active, requires_reference, created_at, updated_at").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}
