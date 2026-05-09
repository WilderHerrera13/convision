package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

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

func (r *PatientRepository) List(db *gorm.DB, f domain.PatientFilter) ([]*domain.Patient, int64, error) {
	f.Clamp()
	var patients []*domain.Patient
	var total int64

	q := db.Model(&domain.Patient{}).Where("patients.deleted_at IS NULL")

	// f.Search replaces the legacy s_f/s_v/s_o=or pattern — OR ILIKE across
	// all text identity fields the frontend used to fan out.
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where(
			"patients.first_name ILIKE ? OR patients.last_name ILIKE ? OR patients.email ILIKE ? OR patients.phone ILIKE ? OR patients.identification ILIKE ?",
			like, like, like, like, like,
		)
	}
	if f.Status != "" {
		q = q.Where("patients.status = ?", f.Status)
	}
	if f.Gender != "" {
		q = q.Where("patients.gender = ?", f.Gender)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("patients.id desc").
		Find(&patients).Error
	if err != nil {
		return nil, 0, err
	}

	return patients, total, nil
}
