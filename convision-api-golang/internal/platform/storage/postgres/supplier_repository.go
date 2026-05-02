package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var supplierFilterAllowlist = map[string]string{
	"name":        "ILIKE",
	"nit":         "ILIKE",
	"email":       "ILIKE",
	"phone":       "ILIKE",
	"person_type": "=",
}

// SupplierRepository is the PostgreSQL-backed implementation of domain.SupplierRepository.
type SupplierRepository struct{}

// NewSupplierRepository creates a new SupplierRepository.
func NewSupplierRepository() *SupplierRepository {
	return &SupplierRepository{}
}

func (r *SupplierRepository) GetByID(db *gorm.DB, id uint) (*domain.Supplier, error) {
	var s domain.Supplier
	err := db.Preload("City").First(&s, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "supplier"}
		}
		return nil, err
	}
	return &s, nil
}

func (r *SupplierRepository) Create(db *gorm.DB, s *domain.Supplier) error {
	return db.Create(s).Error
}

func (r *SupplierRepository) Update(db *gorm.DB, s *domain.Supplier) error {
	return db.Model(s).Updates(map[string]any{
		"name":                 s.Name,
		"legal_name":           s.LegalName,
		"nit":                  s.NIT,
		"legal_representative": s.LegalRepresentative,
		"person_type":          s.PersonType,
		"address":              s.Address,
		"phone":                s.Phone,
		"email":                s.Email,
		"state":                s.State,
		"country":              s.Country,
		"postal_code":          s.PostalCode,
		"website":              s.Website,
		"notes":                s.Notes,
	}).Error
}

func (r *SupplierRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Supplier{}, id).Error
}

func (r *SupplierRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Supplier, int64, error) {
	var suppliers []*domain.Supplier
	var total int64

	q := db.Model(&domain.Supplier{})
	for field, value := range filters {
		op, allowed := supplierFilterAllowlist[field]
		if !allowed {
			continue
		}
		if strVal, ok := value.(string); ok {
			if op == "ILIKE" {
				q = q.Where(field+" ILIKE ?", "%"+strVal+"%")
			} else {
				q = q.Where(field+" = ?", strVal)
			}
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Preload("City").
		Select("id, name, legal_name, nit, legal_representative, person_type, address, phone, email, state, country, postal_code, website, notes, city_id, created_at, updated_at").
		Order("id DESC").
		Limit(perPage).Offset(offset).
		Find(&suppliers).Error

	return suppliers, total, err
}
