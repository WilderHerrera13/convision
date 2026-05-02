package postgres

import (
	"errors"
	"strings"

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
type PatientRepository struct{}

// NewPatientRepository creates a new PatientRepository.
func NewPatientRepository() *PatientRepository {
	return &PatientRepository{}
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

func (r *PatientRepository) GetByID(db *gorm.DB, id uint) (*domain.Patient, error) {
	var p domain.Patient
	err := r.withRelations(db).
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

func (r *PatientRepository) GetByIdentification(db *gorm.DB, doc string) (*domain.Patient, error) {
	var p domain.Patient
	if err := db.Where("identification = ?", doc).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "patient"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PatientRepository) Create(db *gorm.DB, p *domain.Patient) error {
	return db.Create(p).Error
}

func (r *PatientRepository) Update(db *gorm.DB, p *domain.Patient) error {
	return db.Model(p).Updates(map[string]any{
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

func (r *PatientRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Patient{}, id).Error
}

func (r *PatientRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Patient, int64, error) {
	var patients []*domain.Patient
	var total int64

	q := db.Model(&domain.Patient{}).Where("patients.deleted_at IS NULL")

	orMode := filters["_or_mode"] == "true"
	if orMode {
		// OR search: apply ILIKE conditions joined with OR across all requested text fields.
		// Exact-match fields (e.g. status) are still applied with AND.
		var orClauses []string
		var orArgs []interface{}
		for field, value := range filters {
			if field == "_or_mode" {
				continue
			}
			op, allowed := patientFilterAllowlist[field]
			if !allowed {
				continue
			}
			strVal, ok := value.(string)
			if !ok {
				continue
			}
			if op == "ILIKE" {
				orClauses = append(orClauses, "patients."+field+" ILIKE ?")
				orArgs = append(orArgs, "%"+strVal+"%")
			} else {
				// exact-match fields remain AND conditions
				q = q.Where("patients."+field+" = ?", strVal)
			}
		}
		if len(orClauses) > 0 {
			q = q.Where("("+strings.Join(orClauses, " OR ")+")", orArgs...)
		}
	} else {
		for field, value := range filters {
			if field == "_or_mode" {
				continue
			}
			op, allowed := patientFilterAllowlist[field]
			if !allowed {
				continue
			}
			if strVal, ok := value.(string); ok {
				if op == "ILIKE" {
					q = q.Where("patients."+field+" ILIKE ?", "%"+strVal+"%")
				} else {
					q = q.Where("patients."+field+" = ?", strVal)
				}
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
