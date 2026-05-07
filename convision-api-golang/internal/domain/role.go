package domain

import (
	"time"

	"gorm.io/gorm"
)

// RoleModel represents a named set of permissions that can be assigned to users.
// Named RoleModel to avoid collision with the existing Role string type.
type RoleModel struct {
	ID          uint       `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name        string     `json:"name"        gorm:"type:varchar(100);not null"`
	Description string     `json:"description" gorm:"type:text"`
	IsDefault   bool       `json:"is_default"  gorm:"not null;default:false"`
	IsSystem    bool       `json:"is_system"   gorm:"not null;default:false"`
	CreatedBy   *uint      `json:"created_by"  gorm:"column:created_by"`
	CreatedAt   time.Time  `json:"created_at"  gorm:"type:timestamptz;not null;default:now()"`
	UpdatedAt   time.Time  `json:"updated_at"  gorm:"type:timestamptz;not null;default:now()"`
	DeletedAt   *time.Time `json:"deleted_at"  gorm:"type:timestamptz;index"`

	Permissions []*Permission `json:"permissions,omitempty" gorm:"many2many:role_permissions;"`
}

// TableName returns the PostgreSQL table name for RoleModel.
func (RoleModel) TableName() string { return "roles" }

// Permission represents a single ability a user can have, formatted as module:action.
type Permission struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Module      string    `json:"module"      gorm:"type:varchar(50);not null"`
	Action      string    `json:"action"      gorm:"type:varchar(50);not null"`
	Description string    `json:"description" gorm:"type:varchar(200)"`
	CreatedAt   time.Time `json:"created_at"  gorm:"type:timestamptz;not null;default:now()"`
}

// Key returns the permission key in module:action format.
func (p Permission) Key() string {
	return p.Module + ":" + p.Action
}

// UserRole is the join table linking users to roles.
type UserRole struct {
	UserID    uint      `json:"user_id"    gorm:"primaryKey"`
	RoleID    uint      `json:"role_id"    gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null;default:now()"`
}

// RolePermission is the join table linking roles to permissions.
type RolePermission struct {
	RoleID       uint      `json:"role_id"       gorm:"primaryKey"`
	PermissionID uint      `json:"permission_id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at"    gorm:"type:timestamptz;not null;default:now()"`
}

// RoleRepository defines persistence operations for RoleModel.
type RoleRepository interface {
	GetByID(db *gorm.DB, id uint) (*RoleModel, error)
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*RoleModel, int64, error)
	Create(db *gorm.DB, r *RoleModel) error
	Update(db *gorm.DB, r *RoleModel) error
	SoftDelete(db *gorm.DB, id uint) error
	GetPermissions(db *gorm.DB, roleID uint) ([]*Permission, error)
	GetUserPermissions(db *gorm.DB, userID uint) ([]string, error)
}

// PermissionRepository defines persistence operations for Permission (read-only, immutable).
type PermissionRepository interface {
	ListAll(db *gorm.DB) ([]*Permission, error)
	GetByModule(db *gorm.DB, module string) ([]*Permission, error)
}
