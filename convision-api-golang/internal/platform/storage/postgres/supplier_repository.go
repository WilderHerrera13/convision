package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

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

func (r *SupplierRepository) List(db *gorm.DB, f domain.SupplierFilter) ([]*domain.Supplier, int64, error) {
	f.Clamp()
	var suppliers []*domain.Supplier
	var total int64

	q := db.Model(&domain.Supplier{})

	// f.Search replaces s_f/s_v/s_o=or — OR ILIKE across all text fields.
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("name ILIKE ? OR nit ILIKE ? OR legal_name ILIKE ? OR email ILIKE ? OR phone ILIKE ?",
			like, like, like, like, like)
	} else {
		// Individual named filters (used when frontend is updated).
		if f.Name != "" {
			q = q.Where("name ILIKE ?", "%"+f.Name+"%")
		}
		if f.Email != "" {
			q = q.Where("email ILIKE ?", "%"+f.Email+"%")
		}
	}

	if f.PersonType != "" {
		q = q.Where("person_type = ?", f.PersonType)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Preload("City").
		Select("id, name, legal_name, nit, legal_representative, person_type, address, phone, email, state, country, postal_code, website, notes, city_id, created_at, updated_at").
		Order("id DESC").
		Limit(f.PerPage).Offset(f.Offset()).
		Find(&suppliers).Error

	return suppliers, total, err
}
