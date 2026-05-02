package optica

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/featurecache"
)

// FeatureService handles feature flag management for opticas.
type FeatureService struct {
	repo   domain.OpticaFeatureRepository
	cache  *featurecache.Cache
	logger *zap.Logger
}

// NewFeatureService creates a new FeatureService.
func NewFeatureService(
	repo domain.OpticaFeatureRepository,
	cache *featurecache.Cache,
	logger *zap.Logger,
) *FeatureService {
	return &FeatureService{repo: repo, cache: cache, logger: logger}
}

// List returns all feature flags for an optica.
func (s *FeatureService) List(opticaID uint) ([]*domain.OpticaFeature, error) {
	return s.repo.ListByOpticaID(opticaID)
}

// BulkUpdate replaces all feature flag values for an optica and invalidates the cache.
func (s *FeatureService) BulkUpdate(opticaID uint, toggles []domain.FeatureToggle) error {
	if err := s.repo.BulkUpsert(opticaID, toggles); err != nil {
		return err
	}
	s.cache.Invalidate(opticaID)
	s.logger.Info("feature flags bulk updated", zap.Uint("optica_id", opticaID))
	return nil
}

// Toggle sets a single feature flag and invalidates the cache.
func (s *FeatureService) Toggle(opticaID uint, featureKey string, isEnabled bool) error {
	if err := s.repo.Toggle(opticaID, featureKey, isEnabled); err != nil {
		return err
	}
	s.cache.Invalidate(opticaID)
	return nil
}

// AllKeys returns every known feature flag key.
func (s *FeatureService) AllKeys() []string {
	return domain.AllFeatureKeys
}
