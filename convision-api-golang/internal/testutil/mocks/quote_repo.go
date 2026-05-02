package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.QuoteRepository = (*MockQuoteRepository)(nil)

type MockQuoteRepository struct {
	mock.Mock
}

func (m *MockQuoteRepository) GetByID(db *gorm.DB, id uint) (*domain.Quote, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Quote), args.Error(1)
}

func (m *MockQuoteRepository) GetByQuoteNumber(db *gorm.DB, number string) (*domain.Quote, error) {
	args := m.Called(db, number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Quote), args.Error(1)
}

func (m *MockQuoteRepository) Create(db *gorm.DB, q *domain.Quote) error {
	return m.Called(db, q).Error(0)
}

func (m *MockQuoteRepository) Update(db *gorm.DB, q *domain.Quote) error {
	return m.Called(db, q).Error(0)
}

func (m *MockQuoteRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockQuoteRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Quote, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Quote), args.Get(1).(int64), args.Error(2)
}
