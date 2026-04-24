package quote_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/quote"
	"github.com/convision/api/internal/testutil/mocks"
)

func newQuoteSvc(quoteRepo *mocks.MockQuoteRepository, saleRepo *mocks.MockSaleRepository) *quote.Service {
	return quote.NewService(quoteRepo, saleRepo, zap.NewNop())
}

func minimalItem() quote.ItemInput {
	return quote.ItemInput{Name: "Lens", Quantity: 1, Price: 100.0}
}

func TestCreate_Success(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	saleRepo := &mocks.MockSaleRepository{}
	quoteRepo.On("Create", mock.Anything).Return(nil)
	quoteRepo.On("GetByID", uint(0)).Return(&domain.Quote{ID: 1, Total: 100.0}, nil)

	q, err := newQuoteSvc(quoteRepo, saleRepo).Create(quote.CreateInput{
		PatientID: 1,
		Items:     []quote.ItemInput{minimalItem()},
	}, 1)

	require.NoError(t, err)
	assert.True(t, q.Total > 0)
	quoteRepo.AssertExpectations(t)
}

func TestCreate_InvalidDate(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	saleRepo := &mocks.MockSaleRepository{}

	_, err := newQuoteSvc(quoteRepo, saleRepo).Create(quote.CreateInput{
		PatientID:      1,
		ExpirationDate: "not-a-date",
		Items:          []quote.ItemInput{minimalItem()},
	}, 1)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "expiration_date", valErr.Field)
}

func TestGetByID_NotFound(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	quoteRepo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "quote"})

	_, err := newQuoteSvc(quoteRepo, &mocks.MockSaleRepository{}).GetByID(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	quoteRepo.AssertExpectations(t)
}

func TestConvertToSale_Success(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	saleRepo := &mocks.MockSaleRepository{}

	quoteRepo.On("GetByID", uint(1)).Return(&domain.Quote{
		ID:        1,
		PatientID: 2,
		Total:     200.0,
		Status:    domain.QuoteStatusPending,
		Items:     []domain.QuoteItem{{Name: "Lens", Price: 200.0, Quantity: 1, Total: 200.0}},
	}, nil)
	saleRepo.On("Create", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(0)).Return(&domain.Sale{ID: 0, Total: 200.0}, nil)
	quoteRepo.On("Update", mock.Anything).Return(nil)

	svc := newQuoteSvc(quoteRepo, saleRepo)
	sale, err := svc.ConvertToSale(1, 1, quote.ConvertInput{})

	require.NoError(t, err)
	assert.True(t, sale.Total > 0)
	quoteRepo.AssertExpectations(t)
	saleRepo.AssertExpectations(t)
}

func TestConvertToSale_QuoteNotFound(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	quoteRepo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "quote"})

	_, err := newQuoteSvc(quoteRepo, &mocks.MockSaleRepository{}).ConvertToSale(99, 1, quote.ConvertInput{})
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	quoteRepo.AssertExpectations(t)
}

func TestUpdateStatus_ValidTransition(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	quoteRepo.On("GetByID", uint(1)).Return(&domain.Quote{ID: 1, Status: domain.QuoteStatusPending}, nil).Once()
	quoteRepo.On("Update", mock.Anything).Return(nil)
	quoteRepo.On("GetByID", uint(1)).Return(&domain.Quote{ID: 1, Status: domain.QuoteStatusApproved}, nil).Once()

	q, err := newQuoteSvc(quoteRepo, &mocks.MockSaleRepository{}).UpdateStatus(1, "approved")
	require.NoError(t, err)
	assert.Equal(t, domain.QuoteStatusApproved, q.Status)
	quoteRepo.AssertExpectations(t)
}

func TestCalcTotals_WithDiscount(t *testing.T) {
	quoteRepo := &mocks.MockQuoteRepository{}
	saleRepo := &mocks.MockSaleRepository{}
	quoteRepo.On("Create", mock.Anything).Return(nil)
	quoteRepo.On("GetByID", uint(0)).Return(&domain.Quote{ID: 1, Total: 80.0, Subtotal: 100.0}, nil)

	q, err := newQuoteSvc(quoteRepo, saleRepo).Create(quote.CreateInput{
		PatientID: 1,
		Items: []quote.ItemInput{
			{Name: "Lens", Quantity: 1, Price: 100.0, DiscountPercentage: 20.0},
		},
	}, 1)

	require.NoError(t, err)
	assert.True(t, q.Total < q.Subtotal)
	quoteRepo.AssertExpectations(t)
}
