package location

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles geographic and patient-catalog lookup use-cases.
type Service struct {
	repo        domain.LocationRepository
	patientRepo domain.PatientLookupRepository
	logger      *zap.Logger
}

// NewService creates a new location Service.
func NewService(repo domain.LocationRepository, patientRepo domain.PatientLookupRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, patientRepo: patientRepo, logger: logger}
}

func (s *Service) ListCountries(db *gorm.DB) ([]*domain.Country, error) {
	return s.repo.ListCountries(db)
}

func (s *Service) ListDepartments(db *gorm.DB, countryID uint) ([]*domain.Department, error) {
	return s.repo.ListDepartmentsByCountry(db, countryID)
}

func (s *Service) ListCities(db *gorm.DB, departmentID uint) ([]*domain.City, error) {
	return s.repo.ListCitiesByDepartment(db, departmentID)
}

func (s *Service) ListDistricts(db *gorm.DB, cityID uint) ([]*domain.District, error) {
	return s.repo.ListDistrictsByCity(db, cityID)
}

func (s *Service) ListIdentificationTypes(db *gorm.DB) ([]*domain.IdentificationType, error) {
	return s.patientRepo.ListIdentificationTypes(db)
}

func (s *Service) ListHealthInsuranceProviders(db *gorm.DB) ([]*domain.HealthInsuranceProvider, error) {
	return s.patientRepo.ListHealthInsuranceProviders(db)
}

func (s *Service) ListAffiliationTypes(db *gorm.DB) ([]*domain.AffiliationType, error) {
	return s.patientRepo.ListAffiliationTypes(db)
}

func (s *Service) ListCoverageTypes(db *gorm.DB) ([]*domain.CoverageType, error) {
	return s.patientRepo.ListCoverageTypes(db)
}

func (s *Service) ListEducationLevels(db *gorm.DB) ([]*domain.EducationLevel, error) {
	return s.patientRepo.ListEducationLevels(db)
}

// PatientLookupData aggregates all patient-form catalogs in one call.
type PatientLookupData struct {
	IdentificationTypes      []*domain.IdentificationType      `json:"identification_types"`
	HealthInsuranceProviders []*domain.HealthInsuranceProvider `json:"health_insurance_providers"`
	AffiliationTypes         []*domain.AffiliationType         `json:"affiliation_types"`
	CoverageTypes            []*domain.CoverageType            `json:"coverage_types"`
	EducationLevels          []*domain.EducationLevel          `json:"education_levels"`
}

func (s *Service) GetPatientLookupData(db *gorm.DB) (*PatientLookupData, error) {
	identTypes, err := s.patientRepo.ListIdentificationTypes(db)
	if err != nil {
		return nil, err
	}
	healthProviders, err := s.patientRepo.ListHealthInsuranceProviders(db)
	if err != nil {
		return nil, err
	}
	affTypes, err := s.patientRepo.ListAffiliationTypes(db)
	if err != nil {
		return nil, err
	}
	covTypes, err := s.patientRepo.ListCoverageTypes(db)
	if err != nil {
		return nil, err
	}
	eduLevels, err := s.patientRepo.ListEducationLevels(db)
	if err != nil {
		return nil, err
	}
	return &PatientLookupData{
		IdentificationTypes:      identTypes,
		HealthInsuranceProviders: healthProviders,
		AffiliationTypes:         affTypes,
		CoverageTypes:            covTypes,
		EducationLevels:          eduLevels,
	}, nil
}
