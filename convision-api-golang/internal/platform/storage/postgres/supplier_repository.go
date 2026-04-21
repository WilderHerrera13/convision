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
type SupplierRepository struct {
	db *gorm.DB
}

// NewSupplierRepository creates a new SupplierRepository.
func NewSupplierRepository(db *gorm.DB) *SupplierRepository {
	return &SupplierRepository{db: db}
}

func (r *SupplierRepository) GetByID(id uint) (*domain.Supplier, error) {
	var s domain.Supplier
	err := r.db.Preload("City").First(&s, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "supplier"}
		}
		return nil, err
	}
	return &s, nil
}

func (r *SupplierRepository) Create(s *domain.Supplier) error {
	return r.db.Create(s).Error
}

func (r *SupplierRepository) Update(s *domain.Supplier) error {
	return r.db.Model(s).Updates(map[string]any{
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

func (r *SupplierRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Supplier{}, id).Error
}

func (r *SupplierRepository) List(filters map[string]any, page, perPage int) ([]*domain.Supplier, int64, error) {
	var suppliers []*domain.Supplier
	var total int64

	q := r.db.Model(&domain.Supplier{})
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
