package postgres

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/convision/api/internal/domain"
)

type OpticaFeatureRepository struct {
	db *gorm.DB
}

func NewOpticaFeatureRepository(db *gorm.DB) *OpticaFeatureRepository {
	return &OpticaFeatureRepository{db: db}
}

func (r *OpticaFeatureRepository) ListByOpticaID(opticaID uint) ([]*domain.OpticaFeature, error) {
	var features []*domain.OpticaFeature
	err := r.db.Where("optica_id = ?", opticaID).Order("feature_key asc").Find(&features).Error
	if err != nil {
		return nil, err
	}
	return features, nil
}

func (r *OpticaFeatureRepository) BulkUpsert(opticaID uint, toggles []domain.FeatureToggle) error {
	features := make([]*domain.OpticaFeature, len(toggles))
	for i, t := range toggles {
		features[i] = &domain.OpticaFeature{
			OpticaID:   opticaID,
			FeatureKey: t.FeatureKey,
			IsEnabled:  t.IsEnabled,
		}
	}
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "optica_id"}, {Name: "feature_key"}},
		DoUpdates: clause.AssignmentColumns([]string{"is_enabled", "updated_at"}),
	}).Create(&features).Error
}

func (r *OpticaFeatureRepository) Toggle(opticaID uint, featureKey string, isEnabled bool) error {
	return r.db.Model(&domain.OpticaFeature{}).
		Where("optica_id = ? AND feature_key = ?", opticaID, featureKey).
		Update("is_enabled", isEnabled).Error
}

func (r *OpticaFeatureRepository) SeedDefaults(opticaID uint) error {
	features := make([]*domain.OpticaFeature, len(domain.AllFeatureKeys))
	for i, key := range domain.AllFeatureKeys {
		features[i] = &domain.OpticaFeature{
			OpticaID:   opticaID,
			FeatureKey: key,
			IsEnabled:  true,
		}
	}
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "optica_id"}, {Name: "feature_key"}},
		DoNothing: true,
	}).Create(&features).Error
}
