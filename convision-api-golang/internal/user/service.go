package user

import (
	"strings"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/convision/api/internal/domain"
)

// Service handles user management use-cases.
type Service struct {
	repo   domain.UserRepository
	logger *zap.Logger
}

// NewService creates a new user Service.
func NewService(repo domain.UserRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a user.
type CreateInput struct {
	Name           string      `json:"name"           binding:"required,max=255"`
	LastName       string      `json:"last_name"      binding:"required,max=255"`
	Email          string      `json:"email"          binding:"required,email,max=255"`
	Identification string      `json:"identification" binding:"required,max=255"`
	Phone          string      `json:"phone"          binding:"omitempty,max=20"`
	Password       string      `json:"password"       binding:"required,min=8"`
	Role           domain.Role `json:"role"           binding:"required,oneof=admin specialist receptionist laboratory"`
}

// UpdateInput holds validated fields for updating a user (all optional).
type UpdateInput struct {
	Name           *string      `json:"name"           binding:"omitempty,max=255"`
	LastName       *string      `json:"last_name"      binding:"omitempty,max=255"`
	Email          *string      `json:"email"          binding:"omitempty,email,max=255"`
	Identification *string      `json:"identification" binding:"omitempty,max=255"`
	Phone          *string      `json:"phone"          binding:"omitempty,max=20"`
	Password       *string      `json:"password"       binding:"omitempty,min=8"`
	Role           *domain.Role `json:"role"           binding:"omitempty,oneof=admin specialist receptionist laboratory"`
}

// ListOutput is the paginated response for user listing.
type ListOutput struct {
	CurrentPage int            `json:"current_page"`
	Data        []*domain.User `json:"data"`
	LastPage    int            `json:"last_page"`
	PerPage     int            `json:"per_page"`
	Total       int64          `json:"total"`
}

// List returns a paginated list of users.
func (s *Service) List(page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	users, total, err := s.repo.List(nil, page, perPage)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(total) / perPage
		if int(total)%perPage != 0 {
			lastPage++
		}
	}

	return &ListOutput{
		CurrentPage: page,
		Data:        users,
		LastPage:    lastPage,
		PerPage:     perPage,
		Total:       total,
	}, nil
}

// GetByID returns a single user by ID.
func (s *Service) GetByID(id uint) (*domain.User, error) {
	return s.repo.GetByID(id)
}

// Create creates a new user with a bcrypt-hashed password.
func (s *Service) Create(input CreateInput) (*domain.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := &domain.User{
		Name:           input.Name,
		LastName:       input.LastName,
		Email:          strings.ToLower(input.Email),
		Identification: input.Identification,
		Phone:          input.Phone,
		Password:       string(hash),
		Role:           input.Role,
		Active:         true,
	}

	if err := s.repo.Create(u); err != nil {
		return nil, err
	}

	s.logger.Info("user created", zap.Uint("user_id", u.ID), zap.String("role", string(u.Role)))
	return u, nil
}

// Update applies partial updates to an existing user.
func (s *Service) Update(id uint, input UpdateInput) (*domain.User, error) {
	u, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		u.Name = *input.Name
	}
	if input.LastName != nil {
		u.LastName = *input.LastName
	}
	if input.Email != nil {
		u.Email = strings.ToLower(*input.Email)
	}
	if input.Identification != nil {
		u.Identification = *input.Identification
	}
	if input.Phone != nil {
		u.Phone = *input.Phone
	}
	if input.Role != nil {
		u.Role = *input.Role
	}
	if input.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		u.Password = string(hash)
	}

	if err := s.repo.Update(u); err != nil {
		return nil, err
	}

	// Re-fetch to get updated timestamps.
	return s.repo.GetByID(id)
}

// Delete removes a user by ID.
func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
