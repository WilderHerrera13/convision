package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// OpticaPermissionRepository implements domain.OpticaPermissionRepository using the platform DB.
type OpticaPermissionRepository struct {
	db *gorm.DB
}

// NewOpticaPermissionRepository constructs a new OpticaPermissionRepository.
func NewOpticaPermissionRepository(db *gorm.DB) *OpticaPermissionRepository {
	return &OpticaPermissionRepository{db: db}
}

// ListByOpticaID returns all allowed permission keys for the given optica.
func (r *OpticaPermissionRepository) ListByOpticaID(opticaID uint) ([]string, error) {
	var rows []domain.OpticaAllowedPermission
	if err := r.db.
		Select("permission_key").
		Where("optica_id = ?", opticaID).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	keys := make([]string, len(rows))
	for i, row := range rows {
		keys[i] = row.PermissionKey
	}
	return keys, nil
}

// ReplaceAll replaces the entire allowed set for the optica in a single transaction.
// An empty keys slice clears all restrictions (default pass-through).
func (r *OpticaPermissionRepository) ReplaceAll(opticaID uint, keys []string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("optica_id = ?", opticaID).
			Delete(&domain.OpticaAllowedPermission{}).Error; err != nil {
			return err
		}
		if len(keys) == 0 {
			return nil
		}
		rows := make([]*domain.OpticaAllowedPermission, len(keys))
		for i, k := range keys {
			rows[i] = &domain.OpticaAllowedPermission{
				OpticaID:      opticaID,
				PermissionKey: k,
			}
		}
		return tx.CreateInBatches(rows, 100).Error
	})
}

// HasAny reports whether the optica has any permission restrictions configured.
func (r *OpticaPermissionRepository) HasAny(opticaID uint) (bool, error) {
	var count int64
	err := r.db.Model(&domain.OpticaAllowedPermission{}).
		Where("optica_id = ?", opticaID).
		Count(&count).Error
	return count > 0, err
}
