package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type BulkImportLogRepository struct{}

func NewBulkImportLogRepository(db *gorm.DB) *BulkImportLogRepository {
	_ = db // retained for backward-compat wiring in main.go; will be removed next pass
	return &BulkImportLogRepository{}
}

func (r *BulkImportLogRepository) Create(db *gorm.DB, log *domain.BulkImportLog) error {
	return db.Create(log).Error
}

func (r *BulkImportLogRepository) List(db *gorm.DB, importType string, page, perPage int) ([]*domain.BulkImportLog, int64, error) {
	var logs []*domain.BulkImportLog
	var total int64

	q := db.Model(&domain.BulkImportLog{})
	if importType != "" {
		q = q.Where("import_type = ?", importType)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := q.Order("processed_at DESC").Offset(offset).Limit(perPage).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}
