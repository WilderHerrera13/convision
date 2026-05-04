package postgres

import (
	"errors"
	"strings"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// userCols lists all columns fetched for user records (explicit, no SELECT *).
const userCols = "id, name, last_name, email, identification, phone, password_hash, role, active, must_change_password, created_at, updated_at"

// allowedUserFilters maps allowed column names to their match type:
// "LIKE" for partial text match, "=" for exact match.
var allowedUserFilters = map[string]string{
	"name":           "LIKE",
	"last_name":      "LIKE",
	"email":          "LIKE",
	"identification": "LIKE",
	"phone":          "LIKE",
	"role":           "=",
}

// UserRepository is the PostgreSQL-backed implementation of domain.UserRepository.
type UserRepository struct{}

// NewUserRepository creates a new UserRepository.
func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) GetByID(db *gorm.DB, id uint) (*domain.User, error) {
	var u domain.User
	err := db.Select(userCols).First(&u, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByEmail(db *gorm.DB, email string) (*domain.User, error) {
	var u domain.User
	err := db.Select(userCols).Where("email = ?", email).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByIdentification(db *gorm.DB, identification string) (*domain.User, error) {
	var u domain.User
	err := db.Select(userCols).Where("identification = ?", identification).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) Create(db *gorm.DB, u *domain.User) error {
	err := db.Create(u).Error
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

func (r *UserRepository) UpdatePassword(db *gorm.DB, userID uint, hashedPassword string) error {
	return db.Model(&domain.User{}).Where("id = ?", userID).Updates(map[string]any{
		"password_hash":        hashedPassword,
		"must_change_password": false,
	}).Error
}

func (r *UserRepository) Update(db *gorm.DB, u *domain.User) error {
	err := db.Model(u).Updates(map[string]any{
		"name":           u.Name,
		"last_name":      u.LastName,
		"email":          u.Email,
		"identification": u.Identification,
		"phone":          u.Phone,
		"password_hash":  u.Password,
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

func (r *UserRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.User{}, id).Error
}

func (r *UserRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.User, int64, error) {
	var users []*domain.User
	var total int64

	q := db.Model(&domain.User{}).Select(userCols)
	for field, value := range filters {
		matchType, ok := allowedUserFilters[field]
		if !ok {
			continue // skip unknown fields to prevent SQL injection
		}
		strVal, _ := value.(string)
		if matchType == "=" {
			q = q.Where(field+" = ?", strVal)
		} else {
			q = q.Where(field+" LIKE ?", "%"+strVal+"%")
		}
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

func (r *UserRepository) GetSpecialistsByBranch(db *gorm.DB, branchID uint) ([]*domain.User, error) {
	var users []*domain.User
	err := db.Model(&domain.User{}).Select(userCols).
		Joins("JOIN user_branches ON user_branches.user_id = users.id").
		Where("users.role = ? AND users.active = true AND user_branches.branch_id = ?",
			string(domain.RoleSpecialist), branchID).
		Distinct().
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) GetAdvisorsByBranch(db *gorm.DB, branchID uint) ([]*domain.User, error) {
	var users []*domain.User
	err := db.Model(&domain.User{}).
		Select("users.id, users.name, users.last_name, users.email, users.identification, users.phone, users.password_hash, users.role, users.active, users.must_change_password, users.created_at, users.updated_at").
		Joins("JOIN user_branches ON user_branches.user_id = users.id").
		Where("users.role IN (?, ?) AND users.active = true AND user_branches.branch_id = ?",
			string(domain.RoleSpecialist), string(domain.RoleReceptionist), branchID).
		Distinct().
		Order("users.name ASC").
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}
