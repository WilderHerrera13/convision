package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type branchRepository struct {
	db *gorm.DB
}

func NewBranchRepository(db *gorm.DB) domain.BranchRepository {
	return &branchRepository{db: db}
}

func (r *branchRepository) GetByID(id uint) (*domain.Branch, error) {
	var b domain.Branch
	if err := r.db.First(&b, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrBranchNotFound{ID: id}
		}
		return nil, err
	}
	return &b, nil
}

func (r *branchRepository) GetActiveByID(id uint) (*domain.Branch, error) {
	b, err := r.GetByID(id)
	if err != nil {
		return nil, err
	}
	if !b.IsActive {
		return nil, &domain.ErrBranchInactive{ID: id}
	}
	return b, nil
}

func (r *branchRepository) ListAll() ([]*domain.Branch, error) {
	var branches []*domain.Branch
	if err := r.db.Select("id, name, city, is_active, created_at, updated_at").
		Order("name ASC").
		Find(&branches).Error; err != nil {
		return nil, err
	}
	return branches, nil
}

func (r *branchRepository) ListForUser(userID uint) ([]*domain.Branch, error) {
	var branches []*domain.Branch
	if err := r.db.
		Select("branches.id, branches.name, branches.city, branches.is_active, branches.created_at, branches.updated_at").
		Joins("INNER JOIN user_branches ub ON ub.branch_id = branches.id AND ub.user_id = ?", userID).
		Where("branches.is_active = TRUE").
		Order("ub.is_primary DESC, branches.name ASC").
		Find(&branches).Error; err != nil {
		return nil, err
	}
	return branches, nil
}

func (r *branchRepository) UserHasAccess(userID, branchID uint) (bool, error) {
	var count int64
	err := r.db.Model(&domain.UserBranch{}).
		Where("user_id = ? AND branch_id = ?", userID, branchID).
		Count(&count).Error
	return count > 0, err
}

func (r *branchRepository) Create(b *domain.Branch) error {
	return r.db.Create(b).Error
}

func (r *branchRepository) Update(b *domain.Branch) error {
	return r.db.Model(b).Updates(map[string]any{
		"name":      b.Name,
		"address":   b.Address,
		"city":      b.City,
		"phone":     b.Phone,
		"email":     b.Email,
		"is_active": b.IsActive,
	}).Error
}

func (r *branchRepository) AssignUserBranches(userID uint, assignments []domain.UserBranchInput) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&domain.UserBranch{}).Error; err != nil {
			return err
		}
		for _, a := range assignments {
			ub := domain.UserBranch{
				UserID:    userID,
				BranchID:  a.BranchID,
				IsPrimary: a.IsPrimary,
			}
			if err := tx.Create(&ub).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
