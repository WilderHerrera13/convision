package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.OpticaRepository = (*MockOpticaRepository)(nil)

type MockOpticaRepository struct {
	mock.Mock
}

func (m *MockOpticaRepository) GetByID(id uint) (*domain.Optica, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Optica), args.Error(1)
}

func (m *MockOpticaRepository) GetBySlug(slug string) (*domain.Optica, error) {
	args := m.Called(slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Optica), args.Error(1)
}

func (m *MockOpticaRepository) Create(o *domain.Optica) error {
	return m.Called(o).Error(0)
}

func (m *MockOpticaRepository) Update(o *domain.Optica) error {
	return m.Called(o).Error(0)
}

func (m *MockOpticaRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockOpticaRepository) List(page, perPage int) ([]*domain.Optica, int64, error) {
	args := m.Called(page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Optica), args.Get(1).(int64), args.Error(2)
}

func (m *MockOpticaRepository) ListAllActive() ([]*domain.Optica, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Optica), args.Error(1)
}
