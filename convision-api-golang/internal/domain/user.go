package domain

import (
	"time"

	"gorm.io/gorm"
)

// Role defines the access level of a system user.
type Role string

const (
	RoleSuperAdmin   Role = "super_admin"
	RoleAdmin        Role = "admin"
	RoleSpecialist   Role = "specialist"
	RoleReceptionist Role = "receptionist"
	RoleLaboratory   Role = "laboratory"
)

// User represents a system operator (not a patient).
type User struct {
	ID                 uint      `json:"id"                   gorm:"primaryKey;autoIncrement"`
	Name               string    `json:"name"                 gorm:"not null"`
	LastName           string    `json:"last_name"            gorm:"column:last_name"`
	Email              string    `json:"email"                gorm:"uniqueIndex;not null"`
	Identification     string    `json:"identification"       gorm:"column:identification"`
	Phone              string    `json:"phone"                gorm:"column:phone"`
	Password           string    `json:"-"                    gorm:"column:password_hash;not null"`
	Role               Role      `json:"role"                 gorm:"type:varchar(20);not null;default:'receptionist'"`
	Active             bool      `json:"active"               gorm:"not null;default:true"`
	MustChangePassword bool      `json:"must_change_password" gorm:"column:must_change_password;not null;default:false"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// UserRepository defines persistence operations for User.
type UserRepository interface {
	GetByID(db *gorm.DB, id uint) (*User, error)
	GetByEmail(db *gorm.DB, email string) (*User, error)
	GetByIdentification(db *gorm.DB, identification string) (*User, error)
	Create(db *gorm.DB, u *User) error
	Update(db *gorm.DB, u *User) error
	UpdatePassword(db *gorm.DB, userID uint, hashedPassword string) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*User, int64, error)
	GetSpecialistsByBranch(db *gorm.DB, branchID uint) ([]*User, error)
	GetAdvisorsByBranch(db *gorm.DB, branchID uint) ([]*User, error)
}
