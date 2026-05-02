package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type branchRepository struct{}

func NewBranchRepository() domain.BranchRepository {
	return &branchRepository{}
}

func (r *branchRepository) GetByID(db *gorm.DB, id uint) (*domain.Branch, error) {
	var b domain.Branch
	if err := db.First(&b, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrBranchNotFound{ID: id}
		}
		return nil, err
	}
	return &b, nil
}

func (r *branchRepository) GetActiveByID(db *gorm.DB, id uint) (*domain.Branch, error) {
	b, err := r.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if !b.IsActive {
		return nil, &domain.ErrBranchInactive{ID: id}
	}
	return b, nil
}

func (r *branchRepository) ListAll(db *gorm.DB) ([]*domain.Branch, error) {
	var branches []*domain.Branch
	if err := db.Select("id, name, address, city, phone, email, is_active, created_at, updated_at").
		Order("name ASC").
		Find(&branches).Error; err != nil {
		return nil, err
	}
	return branches, nil
}

func (r *branchRepository) ListForUser(db *gorm.DB, userID uint) ([]*domain.Branch, error) {
	var branches []*domain.Branch
	if err := db.
		Select("branches.id, branches.name, branches.city, branches.is_active, branches.created_at, branches.updated_at").
		Joins("INNER JOIN user_branches ub ON ub.branch_id = branches.id AND ub.user_id = ?", userID).
		Where("branches.is_active = TRUE").
		Order("ub.is_primary DESC, branches.name ASC").
		Find(&branches).Error; err != nil {
		return nil, err
	}
	return branches, nil
}

func (r *branchRepository) UserHasAccess(db *gorm.DB, userID, branchID uint) (bool, error) {
	var count int64
	err := db.Model(&domain.UserBranch{}).
		Where("user_id = ? AND branch_id = ?", userID, branchID).
		Count(&count).Error
	return count > 0, err
}

func (r *branchRepository) ListUserBranchesByUserID(db *gorm.DB, userID uint) ([]domain.UserBranch, error) {
	var rows []domain.UserBranch
	err := db.
		Preload("Branch", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id", "name", "is_active")
		}).
		Where("user_id = ?", userID).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *branchRepository) GetUserBranchPrimaryMap(db *gorm.DB, userID uint) (map[uint]bool, error) {
	var ubs []domain.UserBranch
	if err := db.Where("user_id = ?", userID).Find(&ubs).Error; err != nil {
		return nil, err
	}
	m := make(map[uint]bool, len(ubs))
	for _, ub := range ubs {
		m[ub.BranchID] = ub.IsPrimary
	}
	return m, nil
}

func (r *branchRepository) Create(db *gorm.DB, b *domain.Branch) error {
	return db.Create(b).Error
}

func (r *branchRepository) Update(db *gorm.DB, b *domain.Branch) error {
	return db.Model(b).Updates(map[string]any{
		"name":      b.Name,
		"address":   b.Address,
		"city":      b.City,
		"phone":     b.Phone,
		"email":     b.Email,
		"is_active": b.IsActive,
	}).Error
}

func (r *branchRepository) AssignUserBranches(db *gorm.DB, userID uint, assignments []domain.UserBranchInput) error {
	return db.Transaction(func(tx *gorm.DB) error {
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
