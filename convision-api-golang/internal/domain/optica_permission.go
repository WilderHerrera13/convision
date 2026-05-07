package domain

import "time"

// OpticaAllowedPermission represents a single permission key allowed for an optica.
// An optica with zero rows has NO restriction — all permissions pass through (default).
type OpticaAllowedPermission struct {
	OpticaID      uint      `json:"optica_id"      gorm:"primaryKey;column:optica_id"`
	PermissionKey string    `json:"permission_key" gorm:"primaryKey;column:permission_key;type:varchar(100)"`
	CreatedAt     time.Time `json:"created_at"     gorm:"type:timestamptz;not null;default:now()"`
}

// TableName returns the PostgreSQL table name (platform schema).
func (OpticaAllowedPermission) TableName() string {
	return "platform.optica_allowed_permissions"
}

// OpticaPermissionRepository defines platform-level persistence for optica permission ceilings.
// All methods use the platform DB (not a tenant DB).
type OpticaPermissionRepository interface {
	// ListByOpticaID returns all allowed permission keys for the given optica.
	// Returns an empty slice when no restrictions are configured.
	ListByOpticaID(opticaID uint) ([]string, error)

	// ReplaceAll replaces the entire allowed permission set for the optica in a single transaction.
	// Passing an empty slice clears all restrictions (reverts to default pass-through).
	ReplaceAll(opticaID uint, keys []string) error

	// HasAny reports whether the optica has any permission restrictions configured.
	// Returns false when no rows exist, meaning all permissions pass through.
	HasAny(opticaID uint) (bool, error)
}
