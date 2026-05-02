package domain

import "time"

type SuperAdmin struct {
	ID           uint      `json:"id"            gorm:"primaryKey;autoIncrement"`
	Name         string    `json:"name"          gorm:"not null;type:varchar(150)"`
	Email        string    `json:"email"         gorm:"uniqueIndex;not null;type:varchar(150)"`
	PasswordHash string    `json:"-"             gorm:"column:password_hash;not null;type:varchar(255)"`
	IsActive     bool      `json:"is_active"     gorm:"not null;default:true"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (SuperAdmin) TableName() string {
	return "platform.super_admins"
}

type SuperAdminRepository interface {
	GetByID(id uint) (*SuperAdmin, error)
	GetByEmail(email string) (*SuperAdmin, error)
	Create(sa *SuperAdmin) error
	List(page, perPage int) ([]*SuperAdmin, int64, error)
}
