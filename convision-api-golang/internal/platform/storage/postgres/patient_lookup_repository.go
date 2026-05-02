package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// PatientLookupRepository implements domain.PatientLookupRepository backed by PostgreSQL.
type PatientLookupRepository struct{}

func NewPatientLookupRepository() *PatientLookupRepository {
	return &PatientLookupRepository{}
}

func (r *PatientLookupRepository) ListIdentificationTypes(db *gorm.DB) ([]*domain.IdentificationType, error) {
	var data []*domain.IdentificationType
	err := db.Select("id, name, code").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListHealthInsuranceProviders(db *gorm.DB) ([]*domain.HealthInsuranceProvider, error) {
	var data []*domain.HealthInsuranceProvider
	err := db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListAffiliationTypes(db *gorm.DB) ([]*domain.AffiliationType, error) {
	var data []*domain.AffiliationType
	err := db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListCoverageTypes(db *gorm.DB) ([]*domain.CoverageType, error) {
	var data []*domain.CoverageType
	err := db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}

func (r *PatientLookupRepository) ListEducationLevels(db *gorm.DB) ([]*domain.EducationLevel, error) {
	var data []*domain.EducationLevel
	err := db.Select("id, name").
		Where("is_active = ?", true).
		Order("name asc").
		Find(&data).Error
	return data, err
}
