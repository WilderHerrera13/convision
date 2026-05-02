package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.SuperAdminRepository = (*MockSuperAdminRepository)(nil)

type MockSuperAdminRepository struct {
	mock.Mock
}

func (m *MockSuperAdminRepository) GetByID(id uint) (*domain.SuperAdmin, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SuperAdmin), args.Error(1)
}

func (m *MockSuperAdminRepository) GetByEmail(email string) (*domain.SuperAdmin, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SuperAdmin), args.Error(1)
}

func (m *MockSuperAdminRepository) Create(sa *domain.SuperAdmin) error {
	return m.Called(sa).Error(0)
}

func (m *MockSuperAdminRepository) List(page, perPage int) ([]*domain.SuperAdmin, int64, error) {
	args := m.Called(page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.SuperAdmin), args.Get(1).(int64), args.Error(2)
}
