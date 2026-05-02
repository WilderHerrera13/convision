package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ---------- Brand ----------

type BrandRepository struct{}

func NewBrandRepository() *BrandRepository { return &BrandRepository{} }

func (r *BrandRepository) GetByID(db *gorm.DB, id uint) (*domain.Brand, error) {
	var e domain.Brand
	err := db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "brand"}
	}
	return &e, err
}

func (r *BrandRepository) GetByName(db *gorm.DB, name string) (*domain.Brand, error) {
	var e domain.Brand
	err := db.Select("id, name, description, created_at, updated_at").
		Where("LOWER(name) = LOWER(?)", name).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "brand"}
	}
	return &e, err
}

func (r *BrandRepository) Create(db *gorm.DB, e *domain.Brand) error {
	return db.Create(e).Error
}

func (r *BrandRepository) Update(db *gorm.DB, e *domain.Brand) error {
	return db.Model(e).Updates(map[string]any{
		"name":        e.Name,
		"description": e.Description,
	}).Error
}

func (r *BrandRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Brand{}, id).Error
}

func (r *BrandRepository) List(db *gorm.DB, page, perPage int) ([]*domain.Brand, int64, error) {
	var data []*domain.Brand
	var total int64

	q := db.Model(&domain.Brand{})
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

type LensTypeRepository struct{}

func NewLensTypeRepository() *LensTypeRepository { return &LensTypeRepository{} }

func (r *LensTypeRepository) GetByID(db *gorm.DB, id uint) (*domain.LensType, error) {
	var e domain.LensType
	err := db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens_type"}
	}
	return &e, err
}

func (r *LensTypeRepository) GetByName(db *gorm.DB, name string) (*domain.LensType, error) {
	var e domain.LensType
	err := db.Select("id, name, description, created_at, updated_at").
		Where("LOWER(name) = LOWER(?)", name).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens_type"}
	}
	return &e, err
}

func (r *LensTypeRepository) Create(db *gorm.DB, e *domain.LensType) error {
	return db.Create(e).Error
}

func (r *LensTypeRepository) Update(db *gorm.DB, e *domain.LensType) error {
	return db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *LensTypeRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.LensType{}, id).Error
}

func (r *LensTypeRepository) List(db *gorm.DB, page, perPage int) ([]*domain.LensType, int64, error) {
	var data []*domain.LensType
	var total int64
	q := db.Model(&domain.LensType{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- Material ----------

type MaterialRepository struct{}

func NewMaterialRepository() *MaterialRepository { return &MaterialRepository{} }

func (r *MaterialRepository) GetByID(db *gorm.DB, id uint) (*domain.Material, error) {
	var e domain.Material
	err := db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "material"}
	}
	return &e, err
}

func (r *MaterialRepository) GetByName(db *gorm.DB, name string) (*domain.Material, error) {
	var e domain.Material
	err := db.Select("id, name, description, created_at, updated_at").
		Where("LOWER(name) = LOWER(?)", name).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "material"}
	}
	return &e, err
}

func (r *MaterialRepository) Create(db *gorm.DB, e *domain.Material) error {
	return db.Create(e).Error
}

func (r *MaterialRepository) Update(db *gorm.DB, e *domain.Material) error {
	return db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *MaterialRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Material{}, id).Error
}

func (r *MaterialRepository) List(db *gorm.DB, page, perPage int) ([]*domain.Material, int64, error) {
	var data []*domain.Material
	var total int64
	q := db.Model(&domain.Material{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- LensClass ----------

type LensClassRepository struct{}

func NewLensClassRepository() *LensClassRepository { return &LensClassRepository{} }

func (r *LensClassRepository) GetByID(db *gorm.DB, id uint) (*domain.LensClass, error) {
	var e domain.LensClass
	err := db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens_class"}
	}
	return &e, err
}

func (r *LensClassRepository) GetByName(db *gorm.DB, name string) (*domain.LensClass, error) {
	var e domain.LensClass
	err := db.Select("id, name, description, created_at, updated_at").
		Where("LOWER(name) = LOWER(?)", name).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "lens_class"}
	}
	return &e, err
}

func (r *LensClassRepository) Create(db *gorm.DB, e *domain.LensClass) error {
	return db.Create(e).Error
}

func (r *LensClassRepository) Update(db *gorm.DB, e *domain.LensClass) error {
	return db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *LensClassRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.LensClass{}, id).Error
}

func (r *LensClassRepository) List(db *gorm.DB, page, perPage int) ([]*domain.LensClass, int64, error) {
	var data []*domain.LensClass
	var total int64
	q := db.Model(&domain.LensClass{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- Treatment ----------

type TreatmentRepository struct{}

func NewTreatmentRepository() *TreatmentRepository { return &TreatmentRepository{} }

func (r *TreatmentRepository) GetByID(db *gorm.DB, id uint) (*domain.Treatment, error) {
	var e domain.Treatment
	err := db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "treatment"}
	}
	return &e, err
}

func (r *TreatmentRepository) GetByName(db *gorm.DB, name string) (*domain.Treatment, error) {
	var e domain.Treatment
	err := db.Select("id, name, description, created_at, updated_at").
		Where("LOWER(name) = LOWER(?)", name).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "treatment"}
	}
	return &e, err
}

func (r *TreatmentRepository) Create(db *gorm.DB, e *domain.Treatment) error {
	return db.Create(e).Error
}

func (r *TreatmentRepository) Update(db *gorm.DB, e *domain.Treatment) error {
	return db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *TreatmentRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Treatment{}, id).Error
}

func (r *TreatmentRepository) List(db *gorm.DB, page, perPage int) ([]*domain.Treatment, int64, error) {
	var data []*domain.Treatment
	var total int64
	q := db.Model(&domain.Treatment{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- Photochromic ----------

type PhotochromicRepository struct{}

func NewPhotochromicRepository() *PhotochromicRepository {
	return &PhotochromicRepository{}
}

func (r *PhotochromicRepository) GetByID(db *gorm.DB, id uint) (*domain.Photochromic, error) {
	var e domain.Photochromic
	err := db.Select("id, name, description, created_at, updated_at").First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "photochromic"}
	}
	return &e, err
}

func (r *PhotochromicRepository) GetByName(db *gorm.DB, name string) (*domain.Photochromic, error) {
	var e domain.Photochromic
	err := db.Select("id, name, description, created_at, updated_at").
		Where("LOWER(name) = LOWER(?)", name).First(&e).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "photochromic"}
	}
	return &e, err
}

func (r *PhotochromicRepository) Create(db *gorm.DB, e *domain.Photochromic) error {
	return db.Create(e).Error
}

func (r *PhotochromicRepository) Update(db *gorm.DB, e *domain.Photochromic) error {
	return db.Model(e).Updates(map[string]any{
		"name": e.Name, "description": e.Description,
	}).Error
}

func (r *PhotochromicRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Photochromic{}, id).Error
}

func (r *PhotochromicRepository) List(db *gorm.DB, page, perPage int) ([]*domain.Photochromic, int64, error) {
	var data []*domain.Photochromic
	var total int64
	q := db.Model(&domain.Photochromic{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, description, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ---------- PaymentMethod ----------

type PaymentMethodRepository struct{}

func NewPaymentMethodRepository() *PaymentMethodRepository {
	return &PaymentMethodRepository{}
}

func (r *PaymentMethodRepository) GetByID(db *gorm.DB, id uint) (*domain.PaymentMethod, error) {
	var e domain.PaymentMethod
	err := db.Select("id, name, code, description, icon, is_active, requires_reference, created_at, updated_at").
		First(&e, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "payment_method"}
	}
	return &e, err
}

func (r *PaymentMethodRepository) Create(db *gorm.DB, e *domain.PaymentMethod) error {
	return db.Create(e).Error
}

func (r *PaymentMethodRepository) Update(db *gorm.DB, e *domain.PaymentMethod) error {
	return db.Model(e).Updates(map[string]any{
		"name": e.Name, "code": e.Code, "description": e.Description,
		"icon": e.Icon, "is_active": e.IsActive, "requires_reference": e.RequiresReference,
	}).Error
}

func (r *PaymentMethodRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.PaymentMethod{}, id).Error
}

func (r *PaymentMethodRepository) List(db *gorm.DB, page, perPage int) ([]*domain.PaymentMethod, int64, error) {
	var data []*domain.PaymentMethod
	var total int64
	q := db.Model(&domain.PaymentMethod{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, name, code, description, icon, is_active, requires_reference, created_at, updated_at").
		Order("name asc").Offset(offset).Limit(perPage).Find(&data).Error
	return data, total, err
}

// ListActive returns all active payment methods ordered by name (no pagination).
func (r *PaymentMethodRepository) ListActive(db *gorm.DB) ([]*domain.PaymentMethod, error) {
	var data []*domain.PaymentMethod
	err := db.
		Select("id, name, code, description, icon, is_active, requires_reference, created_at, updated_at").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}
