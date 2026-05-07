package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// PermissionRepository is the PostgreSQL-backed implementation of domain.PermissionRepository.
type PermissionRepository struct{}

// NewPermissionRepository creates a new PermissionRepository.
func NewPermissionRepository() *PermissionRepository {
	return &PermissionRepository{}
}

func (r *PermissionRepository) ListAll(db *gorm.DB) ([]*domain.Permission, error) {
	var perms []*domain.Permission
	if err := db.Order("module, action").Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

func (r *PermissionRepository) GetByModule(db *gorm.DB, module string) ([]*domain.Permission, error) {
	var perms []*domain.Permission
	if err := db.Where("module = ?", module).Order("action").Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}
