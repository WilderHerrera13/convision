package mysql

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// LocationRepository implements domain.LocationRepository backed by PostgreSQL.
type LocationRepository struct{ db *gorm.DB }

func NewLocationRepository(db *gorm.DB) *LocationRepository { return &LocationRepository{db: db} }

func (r *LocationRepository) ListCountries() ([]*domain.Country, error) {
	var data []*domain.Country
	err := r.db.Select("id, name").Where("is_active = ?", true).Order("name asc").Find(&data).Error
	return data, err
}

func (r *LocationRepository) ListDepartmentsByCountry(countryID uint) ([]*domain.Department, error) {
	var data []*domain.Department
	err := r.db.Select("id, name, country_id").
		Where("country_id = ? AND is_active = ?", countryID, true).
		Order("name asc").Find(&data).Error
	return data, err
}

func (r *LocationRepository) ListCitiesByDepartment(departmentID uint) ([]*domain.City, error) {
	var data []*domain.City
	err := r.db.Select("id, name, department_id").
		Where("department_id = ? AND is_active = ?", departmentID, true).
		Order("name asc").Find(&data).Error
	return data, err
}

func (r *LocationRepository) ListDistrictsByCity(cityID uint) ([]*domain.District, error) {
	var data []*domain.District
	err := r.db.Select("id, name, city_id").
		Where("city_id = ? AND is_active = ?", cityID, true).
		Order("name asc").Find(&data).Error
	return data, err
}
