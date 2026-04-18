package domain

import "time"

// Role defines the access level of a system user.
type Role string

const (
	RoleAdmin        Role = "admin"
	RoleSpecialist   Role = "specialist"
	RoleReceptionist Role = "receptionist"
	RoleLaboratory   Role = "laboratory"
)

// User represents a system operator (not a patient).
type User struct {
	ID             uint      `json:"id"             gorm:"primaryKey;autoIncrement"`
	Name           string    `json:"name"           gorm:"not null"`
	LastName       string    `json:"last_name"      gorm:"column:last_name"`
	Email          string    `json:"email"          gorm:"uniqueIndex;not null"`
	Identification string    `json:"identification" gorm:"column:identification"`
	Phone          string    `json:"phone"          gorm:"column:phone"`
	Password       string    `json:"-"              gorm:"not null"`
	Role           Role      `json:"role"           gorm:"type:varchar(20);not null;default:'receptionist'"`
	Active         bool      `json:"active"         gorm:"not null;default:true"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// UserRepository defines persistence operations for User.
type UserRepository interface {
	GetByID(id uint) (*User, error)
	GetByEmail(email string) (*User, error)
	Create(u *User) error
	Update(u *User) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*User, int64, error)
}
