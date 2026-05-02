package domain

import (
	"time"

	"gorm.io/gorm"
)

// RevokedToken tracks invalidated JWT tokens by their JTI (JWT ID) claim.
// Used to implement logout and token rotation on refresh.
type RevokedToken struct {
	JTI       string    `gorm:"primaryKey;type:varchar(36)" json:"jti"`
	RevokedAt time.Time `gorm:"not null"                   json:"revoked_at"`
}

// TableName pins this entity to the platform schema so globalDB can reach it
// regardless of the current search_path (which is tenant-scoped for most queries).
func (RevokedToken) TableName() string { return "platform.revoked_tokens" }

// RevokedTokenRepository defines persistence operations for revoked tokens.
type RevokedTokenRepository interface {
	IsRevoked(db *gorm.DB, jti string) (bool, error)
	Revoke(db *gorm.DB, jti string) error
}
