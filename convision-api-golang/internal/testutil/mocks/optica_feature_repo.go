package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.OpticaFeatureRepository = (*MockOpticaFeatureRepository)(nil)

type MockOpticaFeatureRepository struct {
	mock.Mock
}

func (m *MockOpticaFeatureRepository) ListByOpticaID(opticaID uint) ([]*domain.OpticaFeature, error) {
	args := m.Called(opticaID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.OpticaFeature), args.Error(1)
}

func (m *MockOpticaFeatureRepository) BulkUpsert(opticaID uint, features []domain.FeatureToggle) error {
	return m.Called(opticaID, features).Error(0)
}

func (m *MockOpticaFeatureRepository) Toggle(opticaID uint, featureKey string, isEnabled bool) error {
	return m.Called(opticaID, featureKey, isEnabled).Error(0)
}

func (m *MockOpticaFeatureRepository) SeedDefaults(opticaID uint) error {
	return m.Called(opticaID).Error(0)
}
