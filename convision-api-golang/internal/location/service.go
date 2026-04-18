package location

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles geographic lookup use-cases.
type Service struct {
	repo   domain.LocationRepository
	logger *zap.Logger
}

// NewService creates a new location Service.
func NewService(repo domain.LocationRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
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
