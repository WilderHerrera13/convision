package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.BranchRepository = (*MockBranchRepository)(nil)

type MockBranchRepository struct {
	mock.Mock
}

func (m *MockBranchRepository) GetByID(db *gorm.DB, id uint) (*domain.Branch, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Branch), args.Error(1)
}

func (m *MockBranchRepository) GetActiveByID(db *gorm.DB, id uint) (*domain.Branch, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Branch), args.Error(1)
}

func (m *MockBranchRepository) FindByName(db *gorm.DB, name string) (*domain.Branch, error) {
	args := m.Called(db, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Branch), args.Error(1)
}

func (m *MockBranchRepository) ListAll(db *gorm.DB) ([]*domain.Branch, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Branch), args.Error(1)
}

func (m *MockBranchRepository) ListForUser(db *gorm.DB, userID uint) ([]*domain.Branch, error) {
	args := m.Called(db, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Branch), args.Error(1)
}

func (m *MockBranchRepository) UserHasAccess(db *gorm.DB, userID, branchID uint) (bool, error) {
	args := m.Called(db, userID, branchID)
	return args.Bool(0), args.Error(1)
}

func (m *MockBranchRepository) GetUserBranchPrimaryMap(db *gorm.DB, userID uint) (map[uint]bool, error) {
	args := m.Called(db, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uint]bool), args.Error(1)
}

func (m *MockBranchRepository) ListUserBranchesByUserID(db *gorm.DB, userID uint) ([]domain.UserBranch, error) {
	args := m.Called(db, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.UserBranch), args.Error(1)
}

func (m *MockBranchRepository) Create(db *gorm.DB, b *domain.Branch) error {
	return m.Called(db, b).Error(0)
}

func (m *MockBranchRepository) Update(db *gorm.DB, b *domain.Branch) error {
	return m.Called(db, b).Error(0)
}

func (m *MockBranchRepository) AssignUserBranches(db *gorm.DB, userID uint, assignments []domain.UserBranchInput) error {
	return m.Called(db, userID, assignments).Error(0)
}
