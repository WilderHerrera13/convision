package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.RevokedTokenRepository = (*MockRevokedTokenRepository)(nil)

type MockRevokedTokenRepository struct {
	mock.Mock
}

func (m *MockRevokedTokenRepository) IsRevoked(jti string) (bool, error) {
	args := m.Called(jti)
	return args.Bool(0), args.Error(1)
}

func (m *MockRevokedTokenRepository) Revoke(jti string) error {
	return m.Called(jti).Error(0)
}
