package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Icd10CodeRepository is the PostgreSQL-backed implementation of domain.Icd10CodeRepository.
type Icd10CodeRepository struct{}

// NewIcd10CodeRepository creates a new Icd10CodeRepository.
func NewIcd10CodeRepository() *Icd10CodeRepository {
	return &Icd10CodeRepository{}
}

func (r *Icd10CodeRepository) List(db *gorm.DB, f domain.Icd10CodeFilter) ([]*domain.Icd10Code, int64, error) {
	f.Clamp()
	var items []*domain.Icd10Code
	var total int64

	q := db.Model(&domain.Icd10Code{}).Where("is_active = ?", true)

	if f.Search != "" {
		like := f.Search + "%"
		descLike := "%" + f.Search + "%"
		q = q.Where("code ILIKE ? OR description ILIKE ?", like, descLike)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Select("id, code, description, chapter, is_active, created_at, updated_at").
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("code ASC").
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Icd10CodeRepository) GetByCode(db *gorm.DB, code string) (*domain.Icd10Code, error) {
	var item domain.Icd10Code
	err := db.
		Select("id, code, description, chapter, is_active, created_at, updated_at").
		Where("code = ? AND is_active = ?", code, true).
		First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "icd10_code"}
		}
		return nil, err
	}
	return &item, nil
}
