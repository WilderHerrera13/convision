package sale_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/sale"
	"github.com/convision/api/internal/testutil/mocks"
)

func newSaleSvc(
	saleRepo *mocks.MockSaleRepository,
	adjRepo *mocks.MockSaleLensPriceAdjustmentRepository,
	productRepo *mocks.MockProductRepository,
) *sale.Service {
	return sale.NewService(saleRepo, adjRepo, productRepo, zap.NewNop())
}

func TestCreate_NoPriorPayments_StatusPending(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("Create", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(0)).Return(&domain.Sale{ID: 1, Total: 100.0, PaymentStatus: "pending"}, nil)

	s, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).Create(
		sale.CreateInput{PatientID: 1, Total: 100.0},
		1,
	)

	require.NoError(t, err)
	assert.Equal(t, "pending", s.PaymentStatus)
	saleRepo.AssertExpectations(t)
}

func TestCreate_FullPayment_StatusPaid(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("Create", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(0)).Return(&domain.Sale{ID: 1, Total: 100.0, PaymentStatus: "paid"}, nil)

	s, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).Create(
		sale.CreateInput{
			PatientID: 1,
			Total:     100.0,
			Payments: []sale.PaymentInput{
				{PaymentMethodID: 1, Amount: 100.0},
			},
		},
		1,
	)

	require.NoError(t, err)
	assert.Equal(t, "paid", s.PaymentStatus)
	saleRepo.AssertExpectations(t)
}

func TestCreate_PartialPayment_StatusPartial(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("Create", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(0)).Return(&domain.Sale{ID: 1, Total: 100.0, PaymentStatus: "partial"}, nil)

	s, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).Create(
		sale.CreateInput{
			PatientID: 1,
			Total:     100.0,
			Payments: []sale.PaymentInput{
				{PaymentMethodID: 1, Amount: 50.0},
			},
		},
		1,
	)

	require.NoError(t, err)
	assert.Equal(t, "partial", s.PaymentStatus)
	saleRepo.AssertExpectations(t)
}

func TestAddPayment_UpdatesPaymentStatus(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Total: 100.0, AmountPaid: 0}, nil).Once()
	saleRepo.On("AddPayment", mock.Anything).Return(nil)
	saleRepo.On("Update", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Total: 100.0, AmountPaid: 100.0, PaymentStatus: "paid"}, nil).Once()

	s, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).AddPayment(
		1,
		sale.AddPaymentInput{PaymentMethodID: 1, Amount: 100.0},
		1,
	)

	require.NoError(t, err)
	assert.Equal(t, "paid", s.PaymentStatus)
	saleRepo.AssertExpectations(t)
}

func TestAddPayment_SaleNotFound(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "sale"})

	_, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).AddPayment(
		99,
		sale.AddPaymentInput{PaymentMethodID: 1, Amount: 50.0},
		1,
	)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	saleRepo.AssertExpectations(t)
}

func TestCancel_SetsStatusCancelled(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Status: domain.SaleStatusPending}, nil).Once()
	saleRepo.On("Update", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Status: domain.SaleStatusCancelled}, nil).Once()

	s, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).Cancel(1)

	require.NoError(t, err)
	assert.Equal(t, domain.SaleStatusCancelled, s.Status)
	saleRepo.AssertExpectations(t)
}

func TestCancel_SaleNotFound(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "sale"})

	_, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).Cancel(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	saleRepo.AssertExpectations(t)
}

func TestCreateLensPriceAdjustment_PriceTooLow(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	productRepo := &mocks.MockProductRepository{}
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1}, nil)
	productRepo.On("GetByID", uint(5)).Return(&domain.Product{ID: 5, Price: 100.0}, nil)

	_, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, productRepo).CreateLensPriceAdjustment(
		1,
		sale.LensPriceAdjInput{LensID: 5, AdjustedPrice: 80.0},
		1,
	)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "adjusted_price", valErr.Field)
	saleRepo.AssertExpectations(t)
	productRepo.AssertExpectations(t)
}

func TestRemovePayment_Success(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{
		ID:         1,
		Total:      100.0,
		AmountPaid: 50.0,
		Payments:   []domain.SalePayment{{ID: 5, Amount: 50.0}},
	}, nil).Once()
	saleRepo.On("RemovePayment", uint(1), uint(5)).Return(nil)
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{
		ID:         1,
		Total:      100.0,
		AmountPaid: 0.0,
		Payments:   []domain.SalePayment{},
	}, nil).Once()
	saleRepo.On("Update", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{
		ID:            1,
		Total:         100.0,
		AmountPaid:    0.0,
		PaymentStatus: "pending",
	}, nil).Once()

	s, err := newSaleSvc(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}).RemovePayment(1, 5)

	require.NoError(t, err)
	assert.NotNil(t, s)
	saleRepo.AssertExpectations(t)
}
