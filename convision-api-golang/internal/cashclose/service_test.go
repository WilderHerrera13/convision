package cashclose_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

func newCashCloseSvc(repo *mocks.MockCashRegisterCloseRepository) *cashclose.Service {
	return cashclose.NewService(repo, zap.NewNop())
}

func TestCreate_NewClose_Success(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("GetByUserAndDate", uint(1), "2026-04-24").Return(nil, &domain.ErrNotFound{Resource: "cash_register_close"})
	repo.On("Create", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.CashRegisterClose{ID: 0, Status: domain.CashRegisterCloseStatusDraft}, nil)

	svc := newCashCloseSvc(repo)
	c, err := svc.Create(cashclose.CreateInput{
		CloseDate:      "2026-04-24",
		PaymentMethods: []cashclose.PaymentMethodInput{{Name: "efectivo", CountedAmount: 500.0}},
	}, 1)

	require.NoError(t, err)
	assert.Equal(t, domain.CashRegisterCloseStatusDraft, c.Status)
	repo.AssertExpectations(t)
}

func TestCreate_DraftUpsert(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	existing := &domain.CashRegisterClose{ID: 5, UserID: 1, Status: domain.CashRegisterCloseStatusDraft}
	repo.On("GetByUserAndDate", uint(1), "2026-04-24").Return(existing, nil)
	repo.On("Update", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	repo.On("GetByID", uint(5)).Return(&domain.CashRegisterClose{ID: 5, Status: domain.CashRegisterCloseStatusDraft}, nil)

	c, err := newCashCloseSvc(repo).Create(cashclose.CreateInput{
		CloseDate:      "2026-04-24",
		PaymentMethods: []cashclose.PaymentMethodInput{{Name: "efectivo", CountedAmount: 300.0}},
	}, 1)

	require.NoError(t, err)
	assert.Equal(t, domain.CashRegisterCloseStatusDraft, c.Status)
	repo.AssertExpectations(t)
}

func TestCreate_ConflictWithSubmitted(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	existing := &domain.CashRegisterClose{ID: 5, UserID: 1, Status: domain.CashRegisterCloseStatusSubmitted}
	repo.On("GetByUserAndDate", uint(1), "2026-04-24").Return(existing, nil)

	_, err := newCashCloseSvc(repo).Create(cashclose.CreateInput{
		CloseDate:      "2026-04-24",
		PaymentMethods: []cashclose.PaymentMethodInput{{Name: "efectivo", CountedAmount: 300.0}},
	}, 1)

	require.Error(t, err)
	var conflict *domain.ErrConflict
	assert.True(t, errors.As(err, &conflict))
	repo.AssertExpectations(t)
}

func TestSubmit_Success(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	draftClose := &domain.CashRegisterClose{
		ID:     1,
		UserID: 1,
		Status: domain.CashRegisterCloseStatusDraft,
		Payments: []domain.CashRegisterClosePayment{
			{PaymentMethodName: "efectivo", CountedAmount: 500.0},
		},
	}
	repo.On("GetByID", uint(1)).Return(draftClose, nil).Once()
	repo.On("Update", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.CashRegisterClose{ID: 1, Status: domain.CashRegisterCloseStatusSubmitted}, nil).Once()

	c, err := newCashCloseSvc(repo).Submit(1, domain.RoleReceptionist, 1)

	require.NoError(t, err)
	assert.Equal(t, domain.CashRegisterCloseStatusSubmitted, c.Status)
	repo.AssertExpectations(t)
}

func TestSubmit_NonDraftRejected(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.CashRegisterClose{ID: 1, UserID: 1, Status: domain.CashRegisterCloseStatusSubmitted}, nil)

	_, err := newCashCloseSvc(repo).Submit(1, domain.RoleReceptionist, 1)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	repo.AssertExpectations(t)
}

func TestApprove_SubmittedSuccess(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.CashRegisterClose{ID: 1, Status: domain.CashRegisterCloseStatusSubmitted}, nil).Once()
	repo.On("Update", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.CashRegisterClose{ID: 1, Status: domain.CashRegisterCloseStatusApproved}, nil).Once()

	c, err := newCashCloseSvc(repo).Approve(1, 2, cashclose.ApproveInput{})

	require.NoError(t, err)
	assert.Equal(t, domain.CashRegisterCloseStatusApproved, c.Status)
	repo.AssertExpectations(t)
}

func TestApprove_NonSubmittedRejected(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.CashRegisterClose{ID: 1, Status: domain.CashRegisterCloseStatusDraft}, nil)

	_, err := newCashCloseSvc(repo).Approve(1, 2, cashclose.ApproveInput{})

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	repo.AssertExpectations(t)
}

func TestGetByID_WrongUserForbidden(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.CashRegisterClose{ID: 1, UserID: 1, Status: domain.CashRegisterCloseStatusDraft}, nil)

	_, err := newCashCloseSvc(repo).GetByID(1, domain.RoleReceptionist, 2)

	require.Error(t, err)
	var unauthorized *domain.ErrUnauthorized
	assert.True(t, errors.As(err, &unauthorized))
	repo.AssertExpectations(t)
}
