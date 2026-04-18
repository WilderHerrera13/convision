package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// patientFilterAllowlist prevents SQL injection via column name injection.
// Values: "ILIKE" for partial text match, "=" for exact match.
var patientFilterAllowlist = map[string]string{
	"first_name":     "ILIKE",
	"last_name":      "ILIKE",
	"email":          "ILIKE",
	"phone":          "ILIKE",
	"identification": "ILIKE",
	"status":         "=",
	"gender":         "=",
}

// PatientRepository is the PostgreSQL-backed implementation of domain.PatientRepository.
type PatientRepository struct {
	db *gorm.DB
}

// NewPatientRepository creates a new PatientRepository.
func NewPatientRepository(db *gorm.DB) *PatientRepository {
	return &PatientRepository{db: db}
}

func (r *PatientRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("IdentificationType").
		Preload("City").
		Preload("District").
		Preload("Department").
		Preload("Country").
		Preload("HealthInsurance").
		Preload("AffiliationType").
		Preload("CoverageType").
		Preload("EducationLevel")
}

func (r *PatientRepository) GetByID(id uint) (*domain.Patient, error) {
	var p domain.Patient
	err := r.withRelations(r.db).
		Where("patients.deleted_at IS NULL").
		First(&p, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "patient"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PatientRepository) GetByIdentification(doc string) (*domain.Patient, error) {
	var p domain.Patient
	if err := r.db.Where("identification = ?", doc).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "patient"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PatientRepository) Create(p *domain.Patient) error {
	return r.db.Create(p).Error
}

func (r *PatientRepository) Update(p *domain.Patient) error {
	return r.db.Model(p).Updates(map[string]any{
		"first_name":             p.FirstName,
		"last_name":              p.LastName,
		"email":                  p.Email,
		"phone":                  p.Phone,
		"identification":         p.Identification,
		"identification_type_id": p.IdentificationTypeID,
		"birth_date":             p.BirthDate,
		"gender":                 p.Gender,
		"address":                p.Address,
		"city_id":                p.CityID,
		"district_id":            p.DistrictID,
		"department_id":          p.DepartmentID,
		"country_id":             p.CountryID,
		"neighborhood":           p.Neighborhood,
		"postal_code":            p.PostalCode,
		"health_insurance_id":    p.HealthInsuranceID,
		"affiliation_type_id":    p.AffiliationTypeID,
		"coverage_type_id":       p.CoverageTypeID,
		"education_level_id":     p.EducationLevelID,
		"occupation":             p.Occupation,
		"position":               p.Position,
		"company":                p.Company,
		"notes":                  p.Notes,
		"status":                 p.Status,
	}).Error
}

func (r *PatientRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Patient{}, id).Error
}

func (r *PatientRepository) List(filters map[string]any, page, perPage int) ([]*domain.Patient, int64, error) {
	var patients []*domain.Patient
	var total int64

	q := r.db.Model(&domain.Patient{}).Where("patients.deleted_at IS NULL")
	for field, value := range filters {
		op, allowed := patientFilterAllowlist[field]
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
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("patients.id desc").
		Find(&patients).Error
	if err != nil {
		return nil, 0, err
	}

	return patients, total, nil
}
