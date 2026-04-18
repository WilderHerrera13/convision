package mysql

import (
	"errors"
	"strings"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// userCols lists all columns fetched for user records (explicit, no SELECT *).
const userCols = "id, name, last_name, email, identification, phone, password, role, active, created_at, updated_at"

// allowedUserFilters is an allowlist of filter column names to prevent SQL injection.
var allowedUserFilters = map[string]bool{
	"name": true, "last_name": true, "email": true,
	"identification": true, "role": true, "phone": true,
}

// UserRepository is the MySQL-backed implementation of domain.UserRepository.
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetByID(id uint) (*domain.User, error) {
	var u domain.User
	err := r.db.Select(userCols).First(&u, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByEmail(email string) (*domain.User, error) {
	var u domain.User
	err := r.db.Select(userCols).Where("email = ?", email).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) Create(u *domain.User) error {
	err := r.db.Create(u).Error
	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.Constraint, "email") {
				return &domain.ErrConflict{Resource: "user", Field: "email"}
			}
			return &domain.ErrConflict{Resource: "user", Field: "identification"}
		}
		return err
	}
	return nil
}

func (r *UserRepository) Update(u *domain.User) error {
	err := r.db.Model(u).Updates(map[string]any{
		"name":           u.Name,
		"last_name":      u.LastName,
		"email":          u.Email,
		"identification": u.Identification,
		"phone":          u.Phone,
		"password":       u.Password,
		"role":           u.Role,
		"active":         u.Active,
	}).Error
	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.Constraint, "email") {
				return &domain.ErrConflict{Resource: "user", Field: "email"}
			}
			return &domain.ErrConflict{Resource: "user", Field: "identification"}
		}
		return err
	}
	return nil
}

func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&domain.User{}, id).Error
}

func (r *UserRepository) List(filters map[string]any, page, perPage int) ([]*domain.User, int64, error) {
	var users []*domain.User
	var total int64

	q := r.db.Model(&domain.User{}).Select(userCols)
	for field, value := range filters {
		if !allowedUserFilters[field] {
			continue // skip unknown fields to prevent SQL injection
		}
		q = q.Where(field+" LIKE ?", "%"+value.(string)+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := q.Offset(offset).Limit(perPage).Order("id asc").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

