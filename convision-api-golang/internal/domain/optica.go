package domain

import "time"

type Optica struct {
	ID         uint       `json:"id"          gorm:"primaryKey;autoIncrement"`
	Slug       string     `json:"slug"        gorm:"uniqueIndex;not null;type:varchar(60)"`
	Name       string     `json:"name"        gorm:"not null;type:varchar(150)"`
	Plan       string     `json:"plan"        gorm:"not null;default:standard;type:varchar(30)"`
	IsActive   bool       `json:"is_active"   gorm:"not null;default:true"`
	SchemaName string     `json:"schema_name" gorm:"column:schema_name;uniqueIndex;not null;type:varchar(70)"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `json:"deleted_at"`
}

func (Optica) TableName() string {
	return "platform.opticas"
}

// ReservedSlugs that cannot be used for optica slugs.
var ReservedSlugs = map[string]bool{
	"admin":      true,
	"superadmin": true,
	"platform":   true,
	"api":        true,
	"www":        true,
	"app":        true,
	"health":     true,
	"static":     true,
}

// IsReservedSlug reports whether a slug is reserved.
func IsReservedSlug(slug string) bool {
	return ReservedSlugs[slug]
}

type OpticaRepository interface {
	GetByID(id uint) (*Optica, error)
	GetBySlug(slug string) (*Optica, error)
	Create(o *Optica) error
	Update(o *Optica) error
	Delete(id uint) error
	List(page, perPage int) ([]*Optica, int64, error)
	ListAllActive() ([]*Optica, error)
}
