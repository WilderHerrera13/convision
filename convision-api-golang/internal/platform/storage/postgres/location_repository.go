package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// LocationRepository implements domain.LocationRepository backed by PostgreSQL.
type LocationRepository struct{}

func NewLocationRepository() *LocationRepository { return &LocationRepository{} }

func (r *LocationRepository) ListCountries(db *gorm.DB) ([]*domain.Country, error) {
	var data []*domain.Country
	err := db.Select("id, name").Where("is_active = ?", true).Order("name asc").Find(&data).Error
	return data, err
}

func (r *LocationRepository) ListDepartmentsByCountry(db *gorm.DB, countryID uint) ([]*domain.Department, error) {
	var data []*domain.Department
	err := db.Select("id, name, country_id").
		Where("country_id = ? AND is_active = ?", countryID, true).
		Order("name asc").Find(&data).Error
	return data, err
}

func (r *LocationRepository) ListCitiesByDepartment(db *gorm.DB, departmentID uint) ([]*domain.City, error) {
	var data []*domain.City
	err := db.Select("id, name, department_id").
		Where("department_id = ? AND is_active = ?", departmentID, true).
		Order("name asc").Find(&data).Error
	return data, err
}

func (r *LocationRepository) ListDistrictsByCity(db *gorm.DB, cityID uint) ([]*domain.District, error) {
	var data []*domain.District
	err := db.Select("id, name, city_id").
		Where("city_id = ? AND is_active = ?", cityID, true).
		Order("name asc").Find(&data).Error
	return data, err
}
