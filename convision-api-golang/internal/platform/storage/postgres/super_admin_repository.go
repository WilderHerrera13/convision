package postgres

import (
	"errors"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type SuperAdminRepository struct {
	db *gorm.DB
}

func NewSuperAdminRepository(db *gorm.DB) *SuperAdminRepository {
	return &SuperAdminRepository{db: db}
}

func (r *SuperAdminRepository) GetByID(id uint) (*domain.SuperAdmin, error) {
	var sa domain.SuperAdmin
	err := r.db.First(&sa, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "super_admin"}
		}
		return nil, err
	}
	return &sa, nil
}

func (r *SuperAdminRepository) GetByEmail(email string) (*domain.SuperAdmin, error) {
	var sa domain.SuperAdmin
	err := r.db.Where("email = ?", email).First(&sa).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "super_admin"}
		}
		return nil, err
	}
	return &sa, nil
}

func (r *SuperAdminRepository) Create(sa *domain.SuperAdmin) error {
	err := r.db.Create(sa).Error
	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return &domain.ErrConflict{Resource: "super_admin", Field: "email"}
		}
		return err
	}
	return nil
}

func (r *SuperAdminRepository) List(page, perPage int) ([]*domain.SuperAdmin, int64, error) {
	var admins []*domain.SuperAdmin
	var total int64
	q := r.db.Model(&domain.SuperAdmin{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := q.Offset(offset).Limit(perPage).Order("id asc").Find(&admins).Error; err != nil {
		return nil, 0, err
	}
	return admins, total, nil
}
