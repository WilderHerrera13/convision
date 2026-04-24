package product_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/product"
	"github.com/convision/api/internal/testutil/mocks"
)

func newProductSvc(repo *mocks.MockProductRepository, discountRepo *mocks.MockDiscountRepository) *product.Service {
	return product.NewService(repo, discountRepo, zap.NewNop())
}

func ptr[T any](v T) *T { return &v }

func TestGetByID_Found(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Product{ID: 1, Description: "Lens A"}, nil)

	p, err := newProductSvc(repo, &mocks.MockDiscountRepository{}).GetByID(1)
	require.NoError(t, err)
	assert.Equal(t, "Lens A", p.Description)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "product"})

	_, err := newProductSvc(repo, &mocks.MockDiscountRepository{}).GetByID(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Product{ID: 1, Description: "Lens A", Price: 150.0}, nil)

	p, err := newProductSvc(repo, &mocks.MockDiscountRepository{}).Create(product.CreateInput{
		Name:  "Lens A",
		Price: ptr(150.0),
	})

	require.NoError(t, err)
	assert.NotNil(t, p)
	repo.AssertExpectations(t)
}

func TestCreate_ZeroPrice(t *testing.T) {
	repo := &mocks.MockProductRepository{}

	_, err := newProductSvc(repo, &mocks.MockDiscountRepository{}).Create(product.CreateInput{
		Name: "Lens A",
	})

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "price", valErr.Field)
}

func TestCalculatePrice_NoDiscount(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	discountRepo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Product{ID: 1, Price: 100.0}, nil)
	discountRepo.On("GetBestForProduct", uint(1), (*uint)(nil)).Return(nil, &domain.ErrNotFound{Resource: "discount"})

	out, err := newProductSvc(repo, discountRepo).CalculatePrice(1, nil)

	require.NoError(t, err)
	assert.InDelta(t, 100.0, out.DiscountedPrice, 0.001)
	assert.False(t, out.HasDiscount)
	repo.AssertExpectations(t)
	discountRepo.AssertExpectations(t)
}

func TestCalculatePrice_WithActiveDiscount(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	discountRepo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Product{ID: 1, Price: 100.0}, nil)
	discountRepo.On("GetBestForProduct", uint(1), (*uint)(nil)).Return(
		&domain.DiscountRequest{DiscountPercentage: 20.0, Status: domain.DiscountRequestStatusApproved},
		nil,
	)

	out, err := newProductSvc(repo, discountRepo).CalculatePrice(1, nil)

	require.NoError(t, err)
	assert.InDelta(t, 80.0, out.DiscountedPrice, 0.001)
	assert.True(t, out.HasDiscount)
	assert.InDelta(t, 20.0, out.DiscountPercentage, 0.001)
	repo.AssertExpectations(t)
	discountRepo.AssertExpectations(t)
}

func TestGetDiscountInfo_NoDiscount(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	discountRepo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Product{ID: 1, Price: 50.0}, nil)
	discountRepo.On("GetBestForProduct", uint(1), (*uint)(nil)).Return(nil, &domain.ErrNotFound{Resource: "discount"})

	out, err := newProductSvc(repo, discountRepo).GetDiscountInfo(1, nil)

	require.NoError(t, err)
	assert.False(t, out.HasDiscounts)
	assert.InDelta(t, 50.0, out.OriginalPrice, 0.001)
	repo.AssertExpectations(t)
	discountRepo.AssertExpectations(t)
}

func TestSearch_ReturnsResults(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	repo.On("Search", "lens", "", 1, 15).Return(
		[]*domain.Product{{ID: 1}},
		int64(1),
		nil,
	)

	out, err := newProductSvc(repo, &mocks.MockDiscountRepository{}).Search("lens", "", 1, 15)
	require.NoError(t, err)
	assert.Len(t, out.Data, 1)
	repo.AssertExpectations(t)
}

func TestBulkUpdateStatus_Success(t *testing.T) {
	repo := &mocks.MockProductRepository{}
	repo.On("BulkUpdateStatus", []uint{1, 2}, "disabled").Return(int64(2), nil)

	n, err := newProductSvc(repo, &mocks.MockDiscountRepository{}).BulkUpdateStatus([]uint{1, 2}, "disabled")
	require.NoError(t, err)
	assert.Equal(t, int64(2), n)
	repo.AssertExpectations(t)
}
