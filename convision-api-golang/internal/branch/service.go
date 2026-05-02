package branch

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

type Service struct {
	repo   domain.BranchRepository
	logger *zap.Logger
}

func NewService(repo domain.BranchRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

type CreateInput struct {
	Name     string `json:"name"      binding:"required"`
	Address  string `json:"address"`
	City     string `json:"city"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	IsActive bool   `json:"is_active"`
}

type UpdateInput struct {
	Name     *string `json:"name"`
	Address  *string `json:"address"`
	City     *string `json:"city"`
	Phone    *string `json:"phone"`
	Email    *string `json:"email"`
	IsActive *bool   `json:"is_active"`
}

type AssignInput struct {
	Assignments []domain.UserBranchInput `json:"assignments"`
}

type UserBranchAssignmentOut struct {
	BranchID  uint   `json:"branch_id"`
	IsPrimary bool   `json:"is_primary"`
	Name      string `json:"name"`
}

func (s *Service) GetByID(id uint) (*domain.Branch, error) {
	b, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (s *Service) ListAll() ([]*domain.Branch, error) {
	return s.repo.ListAll()
}

func (s *Service) ListForUser(userID uint) ([]*domain.Branch, error) {
	return s.repo.ListForUser(userID)
}

func (s *Service) ListAssignmentsForUser(userID uint) ([]UserBranchAssignmentOut, error) {
	rows, err := s.repo.ListUserBranchesByUserID(userID)
	if err != nil {
		return nil, err
	}
	out := make([]UserBranchAssignmentOut, 0, len(rows))
	for _, row := range rows {
		name := ""
		if row.Branch != nil {
			name = row.Branch.Name
		}
		out = append(out, UserBranchAssignmentOut{
			BranchID:  row.BranchID,
			IsPrimary: row.IsPrimary,
			Name:      name,
		})
	}
	return out, nil
}

func (s *Service) Create(input CreateInput) (*domain.Branch, error) {
	b := &domain.Branch{
		Name:     input.Name,
		Address:  input.Address,
		City:     input.City,
		Phone:    input.Phone,
		Email:    input.Email,
		IsActive: input.IsActive,
	}
	if err := s.repo.Create(b); err != nil {
		return nil, err
	}
	s.logger.Info("branch created", zap.Uint("branch_id", b.ID))
	return b, nil
}

func (s *Service) Update(id uint, input UpdateInput) (*domain.Branch, error) {
	b, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		b.Name = *input.Name
	}
	if input.Address != nil {
		b.Address = *input.Address
	}
	if input.City != nil {
		b.City = *input.City
	}
	if input.Phone != nil {
		b.Phone = *input.Phone
	}
	if input.Email != nil {
		b.Email = *input.Email
	}
	if input.IsActive != nil {
		b.IsActive = *input.IsActive
	}
	if err := s.repo.Update(b); err != nil {
		return nil, err
	}
	s.logger.Info("branch updated", zap.Uint("branch_id", b.ID))
	return b, nil
}

func (s *Service) AssignUserBranches(userID uint, input AssignInput) error {
	return s.repo.AssignUserBranches(userID, input.Assignments)
}
