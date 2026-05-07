package postgres

import (
	"errors"
	"strings"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// RoleRepository is the PostgreSQL-backed implementation of domain.RoleRepository.
type RoleRepository struct{}

// NewRoleRepository creates a new RoleRepository.
func NewRoleRepository() *RoleRepository {
	return &RoleRepository{}
}

func (r *RoleRepository) GetByID(db *gorm.DB, id uint) (*domain.RoleModel, error) {
	var role domain.RoleModel
	if err := db.Preload("Permissions").First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "role"}
		}
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.RoleModel, int64, error) {
	var roles []*domain.RoleModel
	var total int64

	query := db.Model(&domain.RoleModel{}).Where("deleted_at IS NULL")

	if name, ok := filters["name"]; ok && name != "" {
		query = query.Where("name ILIKE ?", "%"+name.(string)+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("Permissions").
		Order("is_system DESC, name ASC").
		Offset((page - 1) * perPage).
		Limit(perPage).
		Find(&roles).Error; err != nil {
		return nil, 0, err
	}
	return roles, total, nil
}

func (r *RoleRepository) Create(db *gorm.DB, role *domain.RoleModel) error {
	if err := db.Create(role).Error; err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.Constraint, "name") {
				return &domain.ErrConflict{Resource: "role", Field: "name"}
			}
		}
		return err
	}
	return nil
}

func (r *RoleRepository) Update(db *gorm.DB, role *domain.RoleModel) error {
	if err := db.Model(&domain.RoleModel{}).Where("id = ?", role.ID).Updates(map[string]any{
		"name":        role.Name,
		"description": role.Description,
		"is_default":  role.IsDefault,
	}).Error; err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.Constraint, "name") {
				return &domain.ErrConflict{Resource: "role", Field: "name"}
			}
		}
		return err
	}
	return nil
}

func (r *RoleRepository) SoftDelete(db *gorm.DB, id uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		role, err := r.GetByID(tx, id)
		if err != nil {
			return err
		}
		if role.IsSystem {
			return &domain.ErrUnauthorized{Action: "delete system role"}
		}
		return tx.Delete(&domain.RoleModel{}, id).Error
	})
}

func (r *RoleRepository) GetPermissions(db *gorm.DB, roleID uint) ([]*domain.Permission, error) {
	var perms []*domain.Permission
	if err := db.
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Where("role_permissions.role_id = ?", roleID).
		Order("permissions.module, permissions.action").
		Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

func (r *RoleRepository) GetUserPermissions(db *gorm.DB, userID uint) ([]string, error) {
	var keys []string
	if err := db.Table("permissions").
		Select("DISTINCT permissions.module || ':' || permissions.action").
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Joins("JOIN user_roles ON user_roles.role_id = role_permissions.role_id").
		Joins("JOIN roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Where("roles.deleted_at IS NULL").
		Scan(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}
