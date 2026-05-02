package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.ProductRepository = (*MockProductRepository)(nil)
var _ domain.ProductCategoryRepository = (*MockProductCategoryRepository)(nil)

type MockProductRepository struct {
	mock.Mock
}

func (m *MockProductRepository) GetByID(db *gorm.DB, id uint) (*domain.Product, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Product), args.Error(1)
}

func (m *MockProductRepository) Create(db *gorm.DB, p *domain.Product) error {
	return m.Called(db, p).Error(0)
}

func (m *MockProductRepository) Update(db *gorm.DB, p *domain.Product) error {
	return m.Called(db, p).Error(0)
}

func (m *MockProductRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockProductRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Product, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Product), args.Get(1).(int64), args.Error(2)
}

func (m *MockProductRepository) Search(db *gorm.DB, query string, category string, page, perPage int) ([]*domain.Product, int64, error) {
	args := m.Called(db, query, category, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Product), args.Get(1).(int64), args.Error(2)
}

func (m *MockProductRepository) BulkUpdateStatus(db *gorm.DB, ids []uint, status string) (int64, error) {
	args := m.Called(db, ids, status)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProductRepository) ListByCategory(db *gorm.DB, slug string, filters map[string]any, page, perPage int) ([]*domain.Product, int64, error) {
	args := m.Called(db, slug, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Product), args.Get(1).(int64), args.Error(2)
}

func (m *MockProductRepository) ListByPrescription(db *gorm.DB, f domain.PrescriptionFilter) ([]*domain.Product, error) {
	args := m.Called(db, f)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Product), args.Error(1)
}

func (m *MockProductRepository) StockByProduct(db *gorm.DB, productID uint) ([]*domain.ProductStockByWarehouse, error) {
	args := m.Called(db, productID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ProductStockByWarehouse), args.Error(1)
}

func (m *MockProductRepository) ListLensCatalog(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Product, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Product), args.Get(1).(int64), args.Error(2)
}

type MockProductCategoryRepository struct {
	mock.Mock
}

func (m *MockProductCategoryRepository) GetByID(db *gorm.DB, id uint) (*domain.ProductCategory, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductCategory), args.Error(1)
}

func (m *MockProductCategoryRepository) Create(db *gorm.DB, c *domain.ProductCategory) error {
	return m.Called(db, c).Error(0)
}

func (m *MockProductCategoryRepository) Update(db *gorm.DB, c *domain.ProductCategory) error {
	return m.Called(db, c).Error(0)
}

func (m *MockProductCategoryRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockProductCategoryRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.ProductCategory, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ProductCategory), args.Get(1).(int64), args.Error(2)
}

func (m *MockProductCategoryRepository) All(db *gorm.DB) ([]*domain.ProductCategory, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ProductCategory), args.Error(1)
}

func (m *MockProductCategoryRepository) ListWithProductCount(db *gorm.DB) ([]*domain.CategoryWithCount, error) {
	args := m.Called(db)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.CategoryWithCount), args.Error(1)
}

func (m *MockProductCategoryRepository) GetBySlug(db *gorm.DB, slug string) (*domain.ProductCategory, error) {
	args := m.Called(db, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductCategory), args.Error(1)
}
