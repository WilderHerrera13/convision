package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.UserRepository = (*MockUserRepository)(nil)

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetByID(id uint) (*domain.User, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(email string) (*domain.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) Create(u *domain.User) error {
	return m.Called(u).Error(0)
}

func (m *MockUserRepository) Update(u *domain.User) error {
	return m.Called(u).Error(0)
}

func (m *MockUserRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockUserRepository) List(filters map[string]any, page, perPage int) ([]*domain.User, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.User), args.Get(1).(int64), args.Error(2)
}
