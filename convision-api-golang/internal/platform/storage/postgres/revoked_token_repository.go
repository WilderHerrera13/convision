package postgres

import (
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// RevokedTokenRepository is the PostgreSQL-backed implementation of domain.RevokedTokenRepository.
type RevokedTokenRepository struct{}

// NewRevokedTokenRepository creates a new RevokedTokenRepository.
func NewRevokedTokenRepository() *RevokedTokenRepository {
	return &RevokedTokenRepository{}
}

// IsRevoked returns true if the given jti has been revoked.
func (r *RevokedTokenRepository) IsRevoked(db *gorm.DB, jti string) (bool, error) {
	var count int64
	err := db.Model(&domain.RevokedToken{}).
		Where("jti = ?", jti).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Revoke marks the given jti as revoked.
func (r *RevokedTokenRepository) Revoke(db *gorm.DB, jti string) error {
	return db.Create(&domain.RevokedToken{
		JTI:       jti,
		RevokedAt: time.Now().UTC(),
	}).Error
}
