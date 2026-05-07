package role

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles all business logic for roles and permissions.
type Service struct {
	db             *gorm.DB
	roleRepo       domain.RoleRepository
	permissionRepo domain.PermissionRepository
	userRepo       domain.UserRepository
	logger         *zap.Logger
}

// NewService creates a new role Service.
func NewService(
	db *gorm.DB,
	roleRepo domain.RoleRepository,
	permissionRepo domain.PermissionRepository,
	userRepo domain.UserRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		db:             db,
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
		userRepo:       userRepo,
		logger:         logger,
	}
}

// ---------- DTOs ----------

// CreateInput is the payload for creating a new role.
type CreateInput struct {
	Name          string `json:"name"           binding:"required"`
	Description   string `json:"description"`
	PermissionIDs []uint `json:"permission_ids" binding:"required,min=1"`
}

// UpdateInput is the payload for updating an existing role.
type UpdateInput struct {
	Name          string `json:"name"           binding:"required"`
	Description   string `json:"description"`
	PermissionIDs []uint `json:"permission_ids" binding:"required,min=1"`
}

// AssignInput is the payload for assigning a role to a user.
type AssignInput struct {
	UserID uint `json:"user_id"`
	RoleID uint `json:"role_id" binding:"required"`
}

// RemoveInput is the payload for removing a role from a user.
type RemoveInput struct {
	UserID uint `json:"user_id"`
	RoleID uint `json:"role_id" binding:"required"`
}

// ListOutput is the response for role listing.
type ListOutput struct {
	Data    []*domain.RoleModel `json:"data"`
	Total   int64               `json:"total"`
	Page    int                 `json:"page"`
	PerPage int                 `json:"per_page"`
}

// ---------- Methods ----------

// GetByID returns a single role with its permissions.
func (s *Service) GetByID(id uint) (*domain.RoleModel, error) {
	return s.roleRepo.GetByID(s.db, id)
}

// List returns a paginated list of roles.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	roles, total, err := s.roleRepo.List(s.db, filters, page, perPage)
	if err != nil {
		s.logger.Error("failed to list roles", zap.Error(err))
		return nil, err
	}
	return &ListOutput{Data: roles, Total: total, Page: page, PerPage: perPage}, nil
}

// Create creates a new role with the given permissions.
func (s *Service) Create(input CreateInput) (*domain.RoleModel, error) {
	role := &domain.RoleModel{
		Name:        input.Name,
		Description: input.Description,
		IsSystem:    false,
		IsDefault:   false,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.roleRepo.Create(tx, role); err != nil {
			return err
		}
		for _, permID := range input.PermissionIDs {
			if err := tx.Exec(
				"INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
				role.ID, permID,
			).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		s.logger.Error("failed to create role", zap.Error(err))
		return nil, err
	}

	s.logger.Info("role created", zap.Uint("role_id", role.ID), zap.String("name", role.Name))
	return role, nil
}

// Update updates a role's name, description, and permission set.
func (s *Service) Update(id uint, input UpdateInput) (*domain.RoleModel, error) {
	role, err := s.roleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		role.Name = input.Name
		role.Description = input.Description
		if err := s.roleRepo.Update(tx, role); err != nil {
			return err
		}
		if err := tx.Where("role_id = ?", id).Delete(&domain.RolePermission{}).Error; err != nil {
			return err
		}
		for _, permID := range input.PermissionIDs {
			if err := tx.Exec(
				"INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
				id, permID,
			).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		s.logger.Error("failed to update role", zap.Error(err))
		return nil, err
	}

	s.logger.Info("role updated", zap.Uint("role_id", role.ID), zap.String("name", role.Name))
	return role, nil
}

// Delete soft-deletes a role. System roles cannot be deleted.
func (s *Service) Delete(id uint) error {
	role, err := s.roleRepo.GetByID(s.db, id)
	if err != nil {
		return err
	}
	if role.IsSystem {
		return &domain.ErrUnauthorized{Action: "delete system role"}
	}
	if err := s.roleRepo.SoftDelete(s.db, id); err != nil {
		s.logger.Error("failed to delete role", zap.Error(err))
		return err
	}
	s.logger.Info("role deleted", zap.Uint("role_id", id))
	return nil
}

// GetUserPermissionKeys returns all permission keys for a user across all their roles.
func (s *Service) GetUserPermissionKeys(userID uint) ([]string, error) {
	return s.roleRepo.GetUserPermissions(s.db, userID)
}

// ListAllPermissions returns all predefined permission records.
func (s *Service) ListAllPermissions() ([]*domain.Permission, error) {
	return s.permissionRepo.ListAll(s.db)
}

// AssignRoleToUser assigns a role to a user and invalidates their existing tokens.
func (s *Service) AssignRoleToUser(input AssignInput) error {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(
			"INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
			input.UserID, input.RoleID,
		).Error; err != nil {
			return err
		}
		return s.userRepo.IncrementTokenVersion(tx, input.UserID)
	})
	if err != nil {
		s.logger.Error("failed to assign role to user", zap.Error(err))
		return err
	}
	s.logger.Info("role assigned to user", zap.Uint("user_id", input.UserID), zap.Uint("role_id", input.RoleID))
	return nil
}

// RemoveRoleFromUser removes a role from a user and invalidates their existing tokens.
func (s *Service) RemoveRoleFromUser(input RemoveInput) error {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND role_id = ?", input.UserID, input.RoleID).
			Delete(&domain.UserRole{}).Error; err != nil {
			return err
		}
		return s.userRepo.IncrementTokenVersion(tx, input.UserID)
	})
	if err != nil {
		s.logger.Error("failed to remove role from user", zap.Error(err))
		return err
	}
	s.logger.Info("role removed from user", zap.Uint("user_id", input.UserID), zap.Uint("role_id", input.RoleID))
	return nil
}
