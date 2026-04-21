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
}

// EnsureLocalDevUsers creates baseline login users for local environments when missing.
func EnsureLocalDevUsers(db *gorm.DB, logger *zap.Logger) error {
	hash, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	for _, seed := range localDevUsers {
		var existing domain.User
		err := db.Select("id").Where("email = ?", seed.Email).First(&existing).Error
		if err == nil {
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
	}

	return nil
}
