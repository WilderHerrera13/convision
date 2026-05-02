package domain

import "time"

type OpticaFeature struct {
	ID         uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	OpticaID   uint      `json:"optica_id"   gorm:"column:optica_id;uniqueIndex:uq_optica_feature;not null"`
	FeatureKey string    `json:"feature_key" gorm:"column:feature_key;uniqueIndex:uq_optica_feature;not null;type:varchar(80)"`
	IsEnabled  bool      `json:"is_enabled"  gorm:"not null;default:true"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (OpticaFeature) TableName() string {
	return "platform.optica_features"
}

type OpticaFeatureRepository interface {
	ListByOpticaID(opticaID uint) ([]*OpticaFeature, error)
	BulkUpsert(opticaID uint, features []FeatureToggle) error
	Toggle(opticaID uint, featureKey string, isEnabled bool) error
	SeedDefaults(opticaID uint) error
}

type FeatureToggle struct {
	FeatureKey string `json:"feature_key"`
	IsEnabled  bool   `json:"is_enabled"`
}
