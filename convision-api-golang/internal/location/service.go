package location

import (
	"go.uber.org/zap"

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

func (s *Service) ListCountries() ([]*domain.Country, error) {
	return s.repo.ListCountries()
}

func (s *Service) ListDepartments(countryID uint) ([]*domain.Department, error) {
	return s.repo.ListDepartmentsByCountry(countryID)
}

func (s *Service) ListCities(departmentID uint) ([]*domain.City, error) {
	return s.repo.ListCitiesByDepartment(departmentID)
}

func (s *Service) ListDistricts(cityID uint) ([]*domain.District, error) {
	return s.repo.ListDistrictsByCity(cityID)
}

func (s *Service) ListIdentificationTypes() ([]*domain.IdentificationType, error) {
	return s.patientRepo.ListIdentificationTypes()
}

func (s *Service) ListHealthInsuranceProviders() ([]*domain.HealthInsuranceProvider, error) {
	return s.patientRepo.ListHealthInsuranceProviders()
}

func (s *Service) ListAffiliationTypes() ([]*domain.AffiliationType, error) {
	return s.patientRepo.ListAffiliationTypes()
}

func (s *Service) ListCoverageTypes() ([]*domain.CoverageType, error) {
	return s.patientRepo.ListCoverageTypes()
}

func (s *Service) ListEducationLevels() ([]*domain.EducationLevel, error) {
	return s.patientRepo.ListEducationLevels()
}

// PatientLookupData aggregates all patient-form catalogs in one call.
type PatientLookupData struct {
	IdentificationTypes      []*domain.IdentificationType      `json:"identification_types"`
	HealthInsuranceProviders []*domain.HealthInsuranceProvider `json:"health_insurance_providers"`
	AffiliationTypes         []*domain.AffiliationType         `json:"affiliation_types"`
	CoverageTypes            []*domain.CoverageType            `json:"coverage_types"`
	EducationLevels          []*domain.EducationLevel          `json:"education_levels"`
}

func (s *Service) GetPatientLookupData() (*PatientLookupData, error) {
	identTypes, err := s.patientRepo.ListIdentificationTypes()
	if err != nil {
		return nil, err
	}
	healthProviders, err := s.patientRepo.ListHealthInsuranceProviders()
	if err != nil {
		return nil, err
	}
	affTypes, err := s.patientRepo.ListAffiliationTypes()
	if err != nil {
		return nil, err
	}
	covTypes, err := s.patientRepo.ListCoverageTypes()
	if err != nil {
		return nil, err
	}
	eduLevels, err := s.patientRepo.ListEducationLevels()
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
