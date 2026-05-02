package postgres

import (
	"errors"
	"strings"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type OpticaRepository struct {
	db *gorm.DB
}

func NewOpticaRepository(db *gorm.DB) *OpticaRepository {
	return &OpticaRepository{db: db}
}

func (r *OpticaRepository) GetByID(id uint) (*domain.Optica, error) {
	var o domain.Optica
	err := r.db.First(&o, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "optica"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *OpticaRepository) GetBySlug(slug string) (*domain.Optica, error) {
	var o domain.Optica
	err := r.db.Where("slug = ? AND deleted_at IS NULL", slug).First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrOpticaNotFound{Slug: slug}
		}
		return nil, err
	}
	return &o, nil
}

func (r *OpticaRepository) Create(o *domain.Optica) error {
	err := r.db.Create(o).Error
	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.Constraint, "slug") {
				return &domain.ErrConflict{Resource: "optica", Field: "slug"}
			}
			return &domain.ErrConflict{Resource: "optica", Field: "schema_name"}
		}
		return err
	}
	return nil
}

func (r *OpticaRepository) Update(o *domain.Optica) error {
	return r.db.Model(o).Updates(map[string]any{
		"name":      o.Name,
		"plan":      o.Plan,
		"is_active": o.IsActive,
	}).Error
}

func (r *OpticaRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Optica{}, id).Error
}

func (r *OpticaRepository) List(page, perPage int) ([]*domain.Optica, int64, error) {
	var opticas []*domain.Optica
	var total int64
	q := r.db.Model(&domain.Optica{}).Where("deleted_at IS NULL")
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := q.Offset(offset).Limit(perPage).Order("id asc").Find(&opticas).Error; err != nil {
		return nil, 0, err
	}
	return opticas, total, nil
}

func (r *OpticaRepository) ListAllActive() ([]*domain.Optica, error) {
	var opticas []*domain.Optica
	err := r.db.Where("is_active = true AND deleted_at IS NULL").Find(&opticas).Error
	if err != nil {
		return nil, err
	}
	return opticas, nil
}
