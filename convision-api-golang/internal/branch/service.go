package branch

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

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

func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.Branch, error) {
	b, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (s *Service) ListAll(db *gorm.DB) ([]*domain.Branch, error) {
	return s.repo.ListAll(db)
}

func (s *Service) ListForUser(db *gorm.DB, userID uint) ([]*domain.Branch, error) {
	return s.repo.ListForUser(db, userID)
}

func (s *Service) ListAssignmentsForUser(db *gorm.DB, userID uint) ([]UserBranchAssignmentOut, error) {
	rows, err := s.repo.ListUserBranchesByUserID(db, userID)
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

func (s *Service) Create(db *gorm.DB, input CreateInput) (*domain.Branch, error) {
	b := &domain.Branch{
		Name:     input.Name,
		Address:  input.Address,
		City:     input.City,
		Phone:    input.Phone,
		Email:    input.Email,
		IsActive: input.IsActive,
	}
	if err := s.repo.Create(db, b); err != nil {
		return nil, err
	}
	s.logger.Info("branch created", zap.Uint("branch_id", b.ID))
	return b, nil
}

func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.Branch, error) {
	b, err := s.repo.GetByID(db, id)
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
	if err := s.repo.Update(db, b); err != nil {
		return nil, err
	}
	s.logger.Info("branch updated", zap.Uint("branch_id", b.ID))
	return b, nil
}

func (s *Service) AssignUserBranches(db *gorm.DB, userID uint, input AssignInput) error {
	return s.repo.AssignUserBranches(db, userID, input.Assignments)
}
