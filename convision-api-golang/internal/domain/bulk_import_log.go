package domain

import "time"

type BulkImportLog struct {
	ID          uint      `json:"id"           gorm:"primaryKey;autoIncrement"`
	ImportType  string    `json:"import_type"  gorm:"column:import_type;not null"`
	FileName    string    `json:"file_name"    gorm:"column:file_name;not null"`
	TotalRows   int       `json:"total_rows"   gorm:"not null;default:0"`
	Created     int       `json:"created"      gorm:"not null;default:0"`
	Skipped     int       `json:"skipped"      gorm:"not null;default:0"`
	Errors      int       `json:"errors"       gorm:"not null;default:0"`
	ProcessedBy *uint     `json:"processed_by" gorm:"column:processed_by"`
	ProcessedAt time.Time `json:"processed_at" gorm:"column:processed_at;not null"`
}

type BulkImportLogRepository interface {
	Create(log *BulkImportLog) error
	List(importType string, page, perPage int) ([]*BulkImportLog, int64, error)
}
