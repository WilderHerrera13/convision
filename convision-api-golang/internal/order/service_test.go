package order_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/order"
	"github.com/convision/api/internal/testutil/mocks"
)

func newOrderSvc(repo *mocks.MockOrderRepository) *order.Service {
	return order.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockOrderRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Order{ID: 1, Status: "pending", PaymentStatus: "pending"}, nil)

	o, err := newOrderSvc(repo).Create(order.CreateInput{
		PatientID: 1,
		Items: []order.ItemInput{
			{Name: "Lens", Quantity: 1, Price: 100.0},
		},
	}, 1)

	require.NoError(t, err)
	assert.Equal(t, domain.OrderStatus("pending"), o.Status)
	repo.AssertExpectations(t)
}

func TestCreate_InvalidStatus(t *testing.T) {
	repo := &mocks.MockOrderRepository{}

	_, err := newOrderSvc(repo).Create(order.CreateInput{
		PatientID: 1,
		Status:    "invalid_status",
	}, 1)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "status", valErr.Field)
}

func TestGetByID_WithExistingTokens(t *testing.T) {
	repo := &mocks.MockOrderRepository{}
	// Order already has tokens — service returns it directly without Update
	repo.On("GetByID", uint(1)).Return(&domain.Order{
		ID:                 1,
		PdfToken:           "existing-token",
		LaboratoryPdfToken: "existing-lab-token",
	}, nil)

	o, err := newOrderSvc(repo).GetByID(1)

	require.NoError(t, err)
	assert.Equal(t, "existing-token", o.PdfToken)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockOrderRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "order"})

	_, err := newOrderSvc(repo).GetByID(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestUpdateStatus_Success(t *testing.T) {
	repo := &mocks.MockOrderRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Order{ID: 1, Status: "pending"}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.Order{ID: 1, Status: "in_progress"}, nil).Once()

	o, err := newOrderSvc(repo).UpdateStatus(1, order.StatusInput{Status: "in_progress"})

	require.NoError(t, err)
	assert.Equal(t, domain.OrderStatus("in_progress"), o.Status)
	repo.AssertExpectations(t)
}

func TestUpdatePaymentStatus_Success(t *testing.T) {
	repo := &mocks.MockOrderRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Order{ID: 1, PaymentStatus: "pending"}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.Order{ID: 1, PaymentStatus: "paid"}, nil).Once()

	o, err := newOrderSvc(repo).UpdatePaymentStatus(1, order.PaymentStatusInput{PaymentStatus: "paid"})

	require.NoError(t, err)
	assert.Equal(t, "paid", o.PaymentStatus)
	repo.AssertExpectations(t)
}
