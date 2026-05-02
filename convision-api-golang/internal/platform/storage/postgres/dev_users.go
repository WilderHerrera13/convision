package postgres

import (
	"errors"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type devUserSeed struct {
	Name           string
	LastName       string
	Email          string
	Identification string
	Phone          string
	Role           domain.Role
}

var localDevUsers = []devUserSeed{
	{Name: "Carlos", LastName: "Vargas", Email: "admin@convision.com", Identification: "123456789", Phone: "3001234567", Role: domain.RoleAdmin},
	{Name: "Specialist", LastName: "Demo", Email: "specialist@convision.com", Identification: "223456789", Phone: "3001234568", Role: domain.RoleSpecialist},
	{Name: "Receptionist", LastName: "Demo", Email: "receptionist@convision.com", Identification: "323456789", Phone: "3001234569", Role: domain.RoleReceptionist},
	{Name: "Laboratory", LastName: "Demo", Email: "laboratory@convision.com", Identification: "423456789", Phone: "3001234570", Role: domain.RoleLaboratory},
}

func ensureDefaultBranch(db *gorm.DB, logger *zap.Logger) (uint, error) {
	var branch domain.Branch
	err := db.Select("id").First(&branch).Error
	if err == nil {
		return branch.ID, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}
	branch = domain.Branch{
		Name:     "Sede Principal",
		Address:  "Dirección por configurar",
		City:     "Ciudad",
		Phone:    "",
		Email:    "",
		IsActive: true,
	}
	if err := db.Create(&branch).Error; err != nil {
		return 0, err
	}
	logger.Info("created default branch", zap.Uint("branch_id", branch.ID))
	return branch.ID, nil
}

// EnsureLocalDevUsers creates baseline login users for local environments when missing.
func EnsureLocalDevUsers(db *gorm.DB, logger *zap.Logger) error {
	defaultBranchID, err := ensureDefaultBranch(db, logger)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	for _, seed := range localDevUsers {
		var existing domain.User
		err := db.Select("id").Where("email = ?", seed.Email).First(&existing).Error
		if err == nil {
			if err := ensureDevUserBranchAssignmentIfNeeded(db, existing.ID, seed.Role, defaultBranchID); err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		user := domain.User{
			Name:           seed.Name,
			LastName:       seed.LastName,
			Email:          seed.Email,
			Identification: seed.Identification,
			Phone:          seed.Phone,
			Password:       string(hash),
			Role:           seed.Role,
			Active:         true,
		}
		if err := db.Create(&user).Error; err != nil {
			return err
		}
		logger.Info("created local dev user", zap.String("email", seed.Email), zap.String("role", string(seed.Role)))
		if err := ensureDevUserBranchAssignmentIfNeeded(db, user.ID, seed.Role, defaultBranchID); err != nil {
			return err
		}
	}

	return nil
}

func ensureDevUserBranchAssignmentIfNeeded(db *gorm.DB, userID uint, role domain.Role, branchID uint) error {
	if role != domain.RoleSpecialist && role != domain.RoleReceptionist {
		return nil
	}
	var n int64
	if err := db.Model(&domain.UserBranch{}).Where("user_id = ?", userID).Count(&n).Error; err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	ub := domain.UserBranch{UserID: userID, BranchID: branchID, IsPrimary: true}
	return db.Create(&ub).Error
}
