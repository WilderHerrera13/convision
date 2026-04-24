package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.QuoteRepository = (*MockQuoteRepository)(nil)

type MockQuoteRepository struct {
	mock.Mock
}

func (m *MockQuoteRepository) GetByID(id uint) (*domain.Quote, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Quote), args.Error(1)
}

func (m *MockQuoteRepository) GetByQuoteNumber(number string) (*domain.Quote, error) {
	args := m.Called(number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Quote), args.Error(1)
}

func (m *MockQuoteRepository) Create(q *domain.Quote) error {
	return m.Called(q).Error(0)
}

func (m *MockQuoteRepository) Update(q *domain.Quote) error {
	return m.Called(q).Error(0)
}

func (m *MockQuoteRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockQuoteRepository) List(filters map[string]any, page, perPage int) ([]*domain.Quote, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Quote), args.Get(1).(int64), args.Error(2)
}
