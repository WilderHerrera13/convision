package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// NoteRepository implements domain.NoteRepository using GORM/PostgreSQL.
type NoteRepository struct{}

// NewNoteRepository creates a new NoteRepository.
func NewNoteRepository() *NoteRepository {
	return &NoteRepository{}
}

func (r *NoteRepository) List(db *gorm.DB, noteableType string, noteableID uint, page, perPage int) ([]*domain.Note, int64, error) {
	var records []*domain.Note
	var total int64

	q := db.Model(&domain.Note{}).
		Where("notable_type = ? AND notable_id = ?", noteableType, noteableID)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Preload("User").Order("created_at DESC").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}

func (r *NoteRepository) Create(db *gorm.DB, n *domain.Note) error {
	return db.Create(n).Error
}
