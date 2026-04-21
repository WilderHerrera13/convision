package postgres

import (
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// RevokedTokenRepository is the PostgreSQL-backed implementation of domain.RevokedTokenRepository.
type RevokedTokenRepository struct {
	db *gorm.DB
}

// NewRevokedTokenRepository creates a new RevokedTokenRepository.
func NewRevokedTokenRepository(db *gorm.DB) *RevokedTokenRepository {
	return &RevokedTokenRepository{db: db}
}

// IsRevoked returns true if the given jti has been revoked.
func (r *RevokedTokenRepository) IsRevoked(jti string) (bool, error) {
	var count int64
	err := r.db.Model(&domain.RevokedToken{}).
		Where("jti = ?", jti).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Revoke marks the given jti as revoked.
func (r *RevokedTokenRepository) Revoke(jti string) error {
	return r.db.Create(&domain.RevokedToken{
		JTI:       jti,
		RevokedAt: time.Now().UTC(),
	}).Error
}
