package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.ProductRepository = (*MockProductRepository)(nil)
var _ domain.ProductCategoryRepository = (*MockProductCategoryRepository)(nil)

type MockProductRepository struct {
	mock.Mock
}

func (m *MockProductRepository) GetByID(id uint) (*domain.Product, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepository) Create(p *domain.Product) error {
	return m.Called(p).Error(0)
}

func (m *MockProductRepository) Update(p *domain.Product) error {
	return m.Called(p).Error(0)
}

func (m *MockProductRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockProductRepository) List(filters map[string]any, page, perPage int) ([]*domain.Product, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Product), args.Get(1).(int64), args.Error(2)
}

func (m *MockProductRepository) Search(query string, category string, page, perPage int) ([]*domain.Product, int64, error) {
	args := m.Called(query, category, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Product), args.Get(1).(int64), args.Error(2)
}

func (m *MockProductRepository) BulkUpdateStatus(ids []uint, status string) (int64, error) {
	args := m.Called(ids, status)
	return args.Get(0).(int64), args.Error(1)
}

type MockProductCategoryRepository struct {
	mock.Mock
}

func (m *MockProductCategoryRepository) GetByID(id uint) (*domain.ProductCategory, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductCategory), args.Error(1)
}

func (m *MockProductCategoryRepository) Create(c *domain.ProductCategory) error {
	return m.Called(c).Error(0)
}

func (m *MockProductCategoryRepository) Update(c *domain.ProductCategory) error {
	return m.Called(c).Error(0)
}

func (m *MockProductCategoryRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockProductCategoryRepository) List(filters map[string]any, page, perPage int) ([]*domain.ProductCategory, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ProductCategory), args.Get(1).(int64), args.Error(2)
}
