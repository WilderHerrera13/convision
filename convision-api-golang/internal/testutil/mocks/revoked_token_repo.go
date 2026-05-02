package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.RevokedTokenRepository = (*MockRevokedTokenRepository)(nil)

type MockRevokedTokenRepository struct {
	mock.Mock
}

func (m *MockRevokedTokenRepository) IsRevoked(db *gorm.DB, jti string) (bool, error) {
	args := m.Called(db, jti)
	return args.Bool(0), args.Error(1)
}

func (m *MockRevokedTokenRepository) Revoke(db *gorm.DB, jti string) error {
	return m.Called(db, jti).Error(0)
}
