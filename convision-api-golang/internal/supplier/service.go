package supplier

import (
	"math"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles supplier use-cases.
type Service struct {
	repo   domain.SupplierRepository
	logger *zap.Logger
}

// NewService creates a new supplier Service.
func NewService(repo domain.SupplierRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a supplier.
type CreateInput struct {
	Name                string `json:"name" binding:"required,max=255"`
	LegalName           string `json:"legal_name"`
	NIT                 string `json:"nit"`
	LegalRepresentative string `json:"legal_representative"`
	PersonType          string `json:"person_type"`
	Address             string `json:"address"`
	Phone               string `json:"phone"`
	Email               string `json:"email" binding:"omitempty,email"`
	City                string `json:"city"`
	State               string `json:"state"`
	Country             string `json:"country"`
	PostalCode          string `json:"postal_code"`
	Website             string `json:"website"`
	Notes               string `json:"notes"`
}

// UpdateInput holds validated fields for updating a supplier.
type UpdateInput struct {
	Name                string `json:"name"`
	LegalName           string `json:"legal_name"`
	NIT                 string `json:"nit"`
	LegalRepresentative string `json:"legal_representative"`
	PersonType          string `json:"person_type"`
	Address             string `json:"address"`
	Phone               string `json:"phone"`
	Email               string `json:"email" binding:"omitempty,email"`
	City                string `json:"city"`
	State               string `json:"state"`
	Country             string `json:"country"`
	PostalCode          string `json:"postal_code"`
	Website             string `json:"website"`
	Notes               string `json:"notes"`
}

// ListOutput wraps a page of suppliers with pagination metadata.
type ListOutput struct {
	Data        []*domain.Supplier `json:"data"`
	Total       int64              `json:"total"`
	CurrentPage int                `json:"current_page"`
	PerPage     int                `json:"per_page"`
	LastPage    int                `json:"last_page"`
}

// GetByID returns a single supplier or ErrNotFound.
func (s *Service) GetByID(id uint) (*domain.Supplier, error) {
	return s.repo.GetByID(id)
}

// List returns a paginated list of suppliers.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, PerPage: perPage, LastPage: lastPage}, nil
}

// Create creates a new supplier.
func (s *Service) Create(input CreateInput) (*domain.Supplier, error) {
	sup := &domain.Supplier{
		Name:                input.Name,
		LegalName:           input.LegalName,
		NIT:                 input.NIT,
		LegalRepresentative: input.LegalRepresentative,
		PersonType:          input.PersonType,
		Address:             input.Address,
		Phone:               input.Phone,
		Email:               input.Email,
		State:               input.State,
		Country:             input.Country,
		PostalCode:          input.PostalCode,
		Website:             input.Website,
		Notes:               input.Notes,
	}
	if err := s.repo.Create(sup); err != nil {
		return nil, err
	}
	s.logger.Info("supplier created", zap.Uint("id", sup.ID), zap.String("name", sup.Name))
	return sup, nil
}

// Update updates a supplier.
func (s *Service) Update(id uint, input UpdateInput) (*domain.Supplier, error) {
	sup, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		sup.Name = input.Name
	}
	if input.LegalName != "" {
		sup.LegalName = input.LegalName
	}
	if input.NIT != "" {
		sup.NIT = input.NIT
	}
	if input.LegalRepresentative != "" {
		sup.LegalRepresentative = input.LegalRepresentative
	}
	if input.PersonType != "" {
		sup.PersonType = input.PersonType
	}
	if input.Address != "" {
		sup.Address = input.Address
	}
	if input.Phone != "" {
		sup.Phone = input.Phone
	}
	if input.Email != "" {
		sup.Email = input.Email
	}
	if input.State != "" {
		sup.State = input.State
	}
	if input.Country != "" {
		sup.Country = input.Country
	}
	if input.PostalCode != "" {
		sup.PostalCode = input.PostalCode
	}
	if input.Website != "" {
		sup.Website = input.Website
	}
	if input.Notes != "" {
		sup.Notes = input.Notes
	}
	if err := s.repo.Update(sup); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Delete removes a supplier.
func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
