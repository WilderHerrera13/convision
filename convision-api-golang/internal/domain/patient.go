package domain

import "time"

// Patient represents a clinic patient.
type Patient struct {
	ID                   uint       `json:"id"                     gorm:"primaryKey;autoIncrement"`
	FirstName            string     `json:"first_name"             gorm:"not null"`
	LastName             string     `json:"last_name"              gorm:"not null"`
	Email                string     `json:"email"                  gorm:"index"`
	Phone                string     `json:"phone"`
	Identification       string     `json:"identification"         gorm:"index"`
	IdentificationTypeID *uint      `json:"identification_type_id" gorm:"column:identification_type_id"`
	BirthDate            *time.Time `json:"birth_date"`
	Gender               string     `json:"gender"                 gorm:"type:varchar(10)"`
	Address              string     `json:"address"`
	Neighborhood         string     `json:"neighborhood"`
	PostalCode           string     `json:"postal_code"`
	CountryID            *uint      `json:"country_id"             gorm:"column:country_id"`
	DepartmentID         *uint      `json:"department_id"          gorm:"column:department_id"`
	CityID               *uint      `json:"city_id"                gorm:"column:city_id"`
	DistrictID           *uint      `json:"district_id"            gorm:"column:district_id"`
	HealthInsuranceID    *uint      `json:"health_insurance_id"    gorm:"column:health_insurance_id"`
	AffiliationTypeID    *uint      `json:"affiliation_type_id"    gorm:"column:affiliation_type_id"`
	CoverageTypeID       *uint      `json:"coverage_type_id"       gorm:"column:coverage_type_id"`
	EducationLevelID     *uint      `json:"education_level_id"     gorm:"column:education_level_id"`
	Occupation           string     `json:"occupation"`
	Position             string     `json:"position"`
	Company              string     `json:"company"`
	Notes                string     `json:"notes"                  gorm:"type:text"`
	Status               string     `json:"status"                 gorm:"type:varchar(20);default:'active'"`
	ProfileImage         string     `json:"profile_image"`
	DeletedAt            *time.Time `json:"deleted_at,omitempty"   gorm:"index"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`

	// Associations
	Country            *Country                 `json:"country,omitempty"             gorm:"foreignKey:CountryID"`
	Department         *Department              `json:"department,omitempty"          gorm:"foreignKey:DepartmentID"`
	City               *City                    `json:"city,omitempty"                gorm:"foreignKey:CityID"`
	District           *District                `json:"district,omitempty"            gorm:"foreignKey:DistrictID"`
	IdentificationType *IdentificationType      `json:"identification_type,omitempty" gorm:"foreignKey:IdentificationTypeID"`
	HealthInsurance    *HealthInsuranceProvider `json:"health_insurance,omitempty"    gorm:"foreignKey:HealthInsuranceID"`
	AffiliationType    *AffiliationType         `json:"affiliation_type,omitempty"    gorm:"foreignKey:AffiliationTypeID"`
	CoverageType       *CoverageType            `json:"coverage_type,omitempty"       gorm:"foreignKey:CoverageTypeID"`
	EducationLevel     *EducationLevel          `json:"education_level,omitempty"     gorm:"foreignKey:EducationLevelID"`
}

// FullName returns the patient's concatenated full name.
func (p *Patient) FullName() string {
	return p.FirstName + " " + p.LastName
}

// PatientRepository defines persistence operations for Patient.
type PatientRepository interface {
	GetByID(id uint) (*Patient, error)
	GetByIdentification(doc string) (*Patient, error)
	Create(p *Patient) error
	Update(p *Patient) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Patient, int64, error)
}
