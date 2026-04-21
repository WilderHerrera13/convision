package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type BulkImportLogRepository struct {
	db *gorm.DB
}

func NewBulkImportLogRepository(db *gorm.DB) *BulkImportLogRepository {
	return &BulkImportLogRepository{db: db}
}

func (r *BulkImportLogRepository) Create(log *domain.BulkImportLog) error {
	return r.db.Create(log).Error
}

func (r *BulkImportLogRepository) List(importType string, page, perPage int) ([]*domain.BulkImportLog, int64, error) {
	var logs []*domain.BulkImportLog
	var total int64

	q := r.db.Model(&domain.BulkImportLog{})
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
