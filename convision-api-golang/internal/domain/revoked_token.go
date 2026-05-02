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

// RevokedTokenRepository defines persistence operations for revoked tokens.
type RevokedTokenRepository interface {
	IsRevoked(db *gorm.DB, jti string) (bool, error)
	Revoke(db *gorm.DB, jti string) error
}
