package patient

import (
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/clock"
)

// Service handles patient-related use-cases.
type Service struct {
	repo   domain.PatientRepository
	logger *zap.Logger
}

// NewService creates a new patient Service.
func NewService(repo domain.PatientRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a patient.
type CreateInput struct {
	FirstName                 string `json:"first_name"                 binding:"required"`
	LastName                  string `json:"last_name"                  binding:"required"`
	Email                     string `json:"email"                      binding:"required,email"`
	Phone                     string `json:"phone"                      binding:"required"`
	Identification            string `json:"identification"             binding:"required"`
	IdentificationTypeID      *uint  `json:"identification_type_id"`
	IdentificationType        string `json:"identification_type"`
	BirthDate                 string `json:"birth_date"`
	Gender                    string `json:"gender"                     binding:"required,oneof=male female other"`
	Address                   string `json:"address"`
	CityID                    *uint  `json:"city_id"`
	DistrictID                *uint  `json:"district_id"`
	DepartmentID              *uint  `json:"department_id"`
	CountryID                 *uint  `json:"country_id"`
	Neighborhood              string `json:"neighborhood"`
	PostalCode                string `json:"postal_code"`
	HealthInsuranceProviderID *uint  `json:"health_insurance_provider_id"`
	AffiliationTypeID         *uint  `json:"affiliation_type_id"`
	CoverageTypeID            *uint  `json:"coverage_type_id"`
	Occupation                string `json:"occupation"`
	EducationLevelID          *uint  `json:"education_level_id"`
	Position                  string `json:"position"`
	Company                   string `json:"company"`
	Notes                     string `json:"notes"`
	Status                    string `json:"status"`
}

// UpdateInput holds validated fields for updating a patient.
type UpdateInput struct {
	FirstName                 string `json:"first_name"`
	LastName                  string `json:"last_name"`
	Email                     string `json:"email"     binding:"omitempty,email"`
	Phone                     string `json:"phone"`
	Identification            string `json:"identification"`
	IdentificationTypeID      *uint  `json:"identification_type_id"`
	IdentificationType        string `json:"identification_type"`
	BirthDate                 string `json:"birth_date"`
	Gender                    string `json:"gender"`
	Address                   string `json:"address"`
	CityID                    *uint  `json:"city_id"`
	DistrictID                *uint  `json:"district_id"`
	DepartmentID              *uint  `json:"department_id"`
	CountryID                 *uint  `json:"country_id"`
	Neighborhood              string `json:"neighborhood"`
	PostalCode                string `json:"postal_code"`
	HealthInsuranceProviderID *uint  `json:"health_insurance_provider_id"`
	AffiliationTypeID         *uint  `json:"affiliation_type_id"`
	CoverageTypeID            *uint  `json:"coverage_type_id"`
	Occupation                string `json:"occupation"`
	EducationLevelID          *uint  `json:"education_level_id"`
	Position                  string `json:"position"`
	Company                   string `json:"company"`
	Notes                     string `json:"notes"`
	Status                    string `json:"status"`
}

// ListOutput wraps a page of patients with Laravel-compatible pagination metadata.
type ListOutput struct {
	Data        []*domain.Patient `json:"data"`
	Total       int64             `json:"total"`
	CurrentPage int               `json:"current_page"`
	PerPage     int               `json:"per_page"`
	LastPage    int               `json:"last_page"`
}

// GetByID returns a single patient (with relations) or ErrNotFound.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.Patient, error) {
	return s.repo.GetByID(db, id)
}

// List returns a paginated list of patients, optionally filtered.
func (s *Service) List(db *gorm.DB, f domain.PatientFilter) (*ListOutput, error) {
	f.Clamp()

	data, total, err := s.repo.List(db, f)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(f.PerPage)))
	}

	return &ListOutput{
		Data:        data,
		Total:       total,
		CurrentPage: f.Page,
		PerPage:     f.PerPage,
		LastPage:    lastPage,
	}, nil
}

// resolveIdentificationType maps a document-type code (e.g. "CC", "TI") to its
// row ID in identification_types. Returns nil if the code is empty or unknown
// so callers can decide whether to error or fall back to identification_type_id.
func (s *Service) resolveIdentificationType(db *gorm.DB, code string) *uint {
	if code == "" {
		return nil
	}
	var id uint
	if err := db.Table("identification_types").
		Select("id").
		Where("code = ?", code).
		Limit(1).
		Scan(&id).Error; err != nil || id == 0 {
		return nil
	}
	return &id
}

// Create adds a new patient.
func (s *Service) Create(db *gorm.DB, input CreateInput) (*domain.Patient, error) {
	status := input.Status
	if status == "" {
		status = "active"
	}

	var bd *time.Time
	if input.BirthDate != "" {
		if t, err := clock.ParseDate(input.BirthDate); err == nil {
			bd = &t
		}
	}

	if input.IdentificationTypeID == nil && input.IdentificationType != "" {
		if resolved := s.resolveIdentificationType(db, input.IdentificationType); resolved != nil {
			input.IdentificationTypeID = resolved
		} else {
			return nil, &domain.ErrValidation{
				Field:   "identification_type",
				Message: "código de tipo de documento desconocido",
			}
		}
	}

	p := &domain.Patient{
		FirstName:            input.FirstName,
		LastName:             input.LastName,
		Email:                input.Email,
		Phone:                input.Phone,
		Identification:       input.Identification,
		IdentificationTypeID: input.IdentificationTypeID,
		BirthDate:            bd,
		Gender:               input.Gender,
		Address:              input.Address,
		CityID:               input.CityID,
		DistrictID:           input.DistrictID,
		DepartmentID:         input.DepartmentID,
		CountryID:            input.CountryID,
		Neighborhood:         input.Neighborhood,
		PostalCode:           input.PostalCode,
		HealthInsuranceID:    input.HealthInsuranceProviderID,
		AffiliationTypeID:    input.AffiliationTypeID,
		CoverageTypeID:       input.CoverageTypeID,
		EducationLevelID:     input.EducationLevelID,
		Occupation:           input.Occupation,
		Position:             input.Position,
		Company:              input.Company,
		Notes:                input.Notes,
		Status:               status,
	}

	if err := s.repo.Create(db, p); err != nil {
		return nil, err
	}

	s.logger.Info("patient created", zap.Uint("patient_id", p.ID))

	// Reload with relations.
	return s.repo.GetByID(db, p.ID)
}

// Update modifies an existing patient's mutable fields.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.Patient, error) {
	p, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if input.FirstName != "" {
		p.FirstName = input.FirstName
	}
	if input.LastName != "" {
		p.LastName = input.LastName
	}
	if input.Email != "" {
		p.Email = input.Email
	}
	if input.Phone != "" {
		p.Phone = input.Phone
	}
	if input.Identification != "" {
		p.Identification = input.Identification
	}
	if input.IdentificationTypeID == nil && input.IdentificationType != "" {
		if resolved := s.resolveIdentificationType(db, input.IdentificationType); resolved != nil {
			input.IdentificationTypeID = resolved
		} else {
			return nil, &domain.ErrValidation{
				Field:   "identification_type",
				Message: "código de tipo de documento desconocido",
			}
		}
	}
	if input.IdentificationTypeID != nil {
		p.IdentificationTypeID = input.IdentificationTypeID
	}
	if input.BirthDate != "" {
		if t, err := clock.ParseDate(input.BirthDate); err == nil {
			p.BirthDate = &t
		}
	}
	if input.Gender != "" {
		p.Gender = input.Gender
	}
	if input.Address != "" {
		p.Address = input.Address
	}
	if input.CityID != nil {
		p.CityID = input.CityID
	}
	if input.DistrictID != nil {
		p.DistrictID = input.DistrictID
	}
	if input.DepartmentID != nil {
		p.DepartmentID = input.DepartmentID
	}
	if input.CountryID != nil {
		p.CountryID = input.CountryID
	}
	if input.Neighborhood != "" {
		p.Neighborhood = input.Neighborhood
	}
	if input.PostalCode != "" {
		p.PostalCode = input.PostalCode
	}
	if input.HealthInsuranceProviderID != nil {
		p.HealthInsuranceID = input.HealthInsuranceProviderID
	}
	if input.AffiliationTypeID != nil {
		p.AffiliationTypeID = input.AffiliationTypeID
	}
	if input.CoverageTypeID != nil {
		p.CoverageTypeID = input.CoverageTypeID
	}
	if input.EducationLevelID != nil {
		p.EducationLevelID = input.EducationLevelID
	}
	if input.Occupation != "" {
		p.Occupation = input.Occupation
	}
	if input.Position != "" {
		p.Position = input.Position
	}
	if input.Company != "" {
		p.Company = input.Company
	}
	if input.Notes != "" {
		p.Notes = input.Notes
	}
	if input.Status != "" {
		p.Status = input.Status
	}

	if err := s.repo.Update(db, p); err != nil {
		return nil, err
	}

	return s.repo.GetByID(db, p.ID)
}

// Delete soft-deletes a patient.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	return s.repo.Delete(db, id)
}
