package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// PatientLookupRepository implements domain.PatientLookupRepository backed by PostgreSQL.
type PatientLookupRepository struct{ db *gorm.DB }

func NewPatientLookupRepository(db *gorm.DB) *PatientLookupRepository {
	return &PatientLookupRepository{db: db}
}

func (r *PatientLookupRepository) ListIdentificationTypes() ([]*domain.IdentificationType, error) {
	var data []*domain.IdentificationType
	err := r.db.Select("id, name, code").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListHealthInsuranceProviders() ([]*domain.HealthInsuranceProvider, error) {
	var data []*domain.HealthInsuranceProvider
	err := r.db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListAffiliationTypes() ([]*domain.AffiliationType, error) {
	var data []*domain.AffiliationType
	err := r.db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListCoverageTypes() ([]*domain.CoverageType, error) {
	var data []*domain.CoverageType
	err := r.db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListEducationLevels() ([]*domain.EducationLevel, error) {
	var data []*domain.EducationLevel
	err := r.db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}
