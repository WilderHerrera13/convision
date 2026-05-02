package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.UserRepository = (*MockUserRepository)(nil)

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetByID(db *gorm.DB, id uint) (*domain.User, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(db *gorm.DB, email string) (*domain.User, error) {
	args := m.Called(db, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByIdentification(db *gorm.DB, identification string) (*domain.User, error) {
	args := m.Called(db, identification)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) UpdatePassword(db *gorm.DB, userID uint, hashedPassword string) error {
	return m.Called(db, userID, hashedPassword).Error(0)
}

func (m *MockUserRepository) Create(db *gorm.DB, u *domain.User) error {
	return m.Called(db, u).Error(0)
}

func (m *MockUserRepository) Update(db *gorm.DB, u *domain.User) error {
	return m.Called(db, u).Error(0)
}

func (m *MockUserRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockUserRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.User, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.User), args.Get(1).(int64), args.Error(2)
}

func (m *MockUserRepository) GetSpecialistsByBranch(db *gorm.DB, branchID uint) ([]*domain.User, error) {
	args := m.Called(db, branchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.User), args.Error(1)
}
