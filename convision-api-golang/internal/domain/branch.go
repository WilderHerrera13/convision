package domain

import (
	"time"

	"gorm.io/gorm"
)

type Branch struct {
	ID           uint          `json:"id"          gorm:"primaryKey;autoIncrement"`
	Name         string        `json:"name"        gorm:"not null;type:varchar(150)"`
	Address      string        `json:"address"     gorm:"type:varchar(255)"`
	City         string        `json:"city"        gorm:"type:varchar(100)"`
	Phone        string        `json:"phone"       gorm:"type:varchar(30)"`
	Email        string        `json:"email"       gorm:"type:varchar(150)"`
	IsActive     bool          `json:"is_active"   gorm:"not null;default:true"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`

	UserBranches []UserBranch `json:"user_branches,omitempty" gorm:"foreignKey:BranchID"`
}

type UserBranch struct {
	ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
	UserID    uint      `json:"user_id"    gorm:"not null;index"`
	BranchID  uint      `json:"branch_id"  gorm:"not null;index"`
	IsPrimary bool      `json:"is_primary" gorm:"not null;default:false"`
	CreatedAt time.Time `json:"created_at"`

	Branch *Branch `json:"branch,omitempty" gorm:"foreignKey:BranchID"`
	User   *User   `json:"user,omitempty"   gorm:"foreignKey:UserID"`
}

type BranchRepository interface {
	GetByID(db *gorm.DB, id uint) (*Branch, error)
	GetActiveByID(db *gorm.DB, id uint) (*Branch, error)
	FindByName(db *gorm.DB, name string) (*Branch, error)
	ListAll(db *gorm.DB) ([]*Branch, error)
	ListForUser(db *gorm.DB, userID uint) ([]*Branch, error)
	UserHasAccess(db *gorm.DB, userID, branchID uint) (bool, error)
	GetUserBranchPrimaryMap(db *gorm.DB, userID uint) (map[uint]bool, error)
	ListUserBranchesByUserID(db *gorm.DB, userID uint) ([]UserBranch, error)
	Create(db *gorm.DB, b *Branch) error
	Update(db *gorm.DB, b *Branch) error
	AssignUserBranches(db *gorm.DB, userID uint, assignments []UserBranchInput) error
}

type UserBranchInput struct {
	BranchID  uint `json:"branch_id"`
	IsPrimary bool `json:"is_primary"`
}

type ErrBranchNotFound struct{ ID uint }
type ErrBranchInactive struct{ ID uint }
type ErrBranchAccessDenied struct{ UserID, BranchID uint }

func (e *ErrBranchNotFound) Error() string {
	return "branch not found"
}

func (e *ErrBranchInactive) Error() string {
	return "branch is inactive"
}

func (e *ErrBranchAccessDenied) Error() string {
	return "access denied for this branch"
}
