package domain

import "time"

// Country represents a country in the location hierarchy.
type Country struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"       gorm:"uniqueIndex"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Department represents a state/department within a country.
type Department struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	CountryID uint      `json:"country_id" gorm:"not null;index"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Country *Country `json:"country,omitempty" gorm:"foreignKey:CountryID"`
}

// City represents a city within a department.
type City struct {
	ID           uint      `json:"id"            gorm:"primaryKey;autoIncrement"`
	DepartmentID uint      `json:"department_id" gorm:"not null;index"`
	Name         string    `json:"name"          gorm:"not null"`
	Code         string    `json:"code"`
	IsActive     bool      `json:"is_active"     gorm:"not null;default:true"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Department *Department `json:"department,omitempty" gorm:"foreignKey:DepartmentID"`
}

// District represents a district/neighborhood classification within a city.
type District struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	CityID    uint      `json:"city_id"    gorm:"not null;index"`
	Name      string    `json:"name"       gorm:"not null"`
	Code      string    `json:"code"`
	IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	City *City `json:"city,omitempty" gorm:"foreignKey:CityID"`
}

// LocationRepository defines lookup operations for hierarchical geographic data.
type LocationRepository interface {
	ListCountries() ([]*Country, error)
	ListDepartmentsByCountry(countryID uint) ([]*Department, error)
	ListCitiesByDepartment(departmentID uint) ([]*City, error)
	ListDistrictsByCity(cityID uint) ([]*District, error)
}
