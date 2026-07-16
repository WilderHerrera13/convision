package cashclose_test

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

type fakeNotifier struct {
	called       bool
	gotUserID    uint
	gotKind      domain.NotificationKind
	gotTitle     string
	gotActionURL string
}

func (f *fakeNotifier) Emit(db *gorm.DB, userID uint, kind domain.NotificationKind, title, body, actionURL string) error {
	f.called = true
	f.gotUserID = userID
	f.gotKind = kind
	f.gotTitle = title
	f.gotActionURL = actionURL
	return nil
}

func newAdjustSvc(repo *mocks.MockCashRegisterCloseRepository, adjRepo *mocks.MockCashRegisterCloseAdjustmentRepository, notifier cashclose.Notifier) *cashclose.Service {
	return cashclose.NewService(repo, adjRepo, notifier, zap.NewNop())
}

func TestAdjustAndApprove_Success(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	adjRepo := &mocks.MockCashRegisterCloseAdjustmentRepository{}
	notifier := &fakeNotifier{}

	submitted := &domain.CashRegisterClose{
		ID:           10,
		UserID:       7, // advisor / receptionist
		Status:       domain.CashRegisterCloseStatusSubmitted,
		TotalCounted: 100.0,
		Payments: []domain.CashRegisterClosePayment{
			{PaymentMethodName: "efectivo", CountedAmount: 100.0},
		},
	}
	repo.On("GetByID", mock.Anything, uint(10)).Return(submitted, nil).Once()

	var capturedAdj *domain.CashRegisterCloseAdjustment
	repo.On("AdjustAndApprove", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) {
			capturedAdj = args.Get(4).(*domain.CashRegisterCloseAdjustment)
		}).Return(nil).Once()

	repo.On("GetByID", mock.Anything, uint(10)).
		Return(&domain.CashRegisterClose{ID: 10, UserID: 7, Status: domain.CashRegisterCloseStatusApproved, TotalCounted: 250.0}, nil).Once()

	svc := newAdjustSvc(repo, adjRepo, notifier)
	out, err := svc.AdjustAndApprove(nil, 10, 99 /* admin */, cashclose.AdjustInput{
		PaymentMethods: []cashclose.PaymentMethodInput{{Name: "efectivo", CountedAmount: 250.0}},
		Reason:         "Efectivo mal contado",
	})

	require.NoError(t, err)
	assert.Equal(t, domain.CashRegisterCloseStatusApproved, out.Status)

	// Adjustment audit row captured with correct actors + non-empty before/after snapshots.
	require.NotNil(t, capturedAdj)
	assert.Equal(t, uint(7), capturedAdj.AdvisorUserID)
	assert.Equal(t, uint(99), capturedAdj.AdminUserID)
	assert.Equal(t, "Efectivo mal contado", capturedAdj.Reason)

	var before, after domain.CashCloseSnapshot
	require.NoError(t, json.Unmarshal(capturedAdj.BeforeSnapshot, &before))
	require.NoError(t, json.Unmarshal(capturedAdj.AfterSnapshot, &after))
	assert.Equal(t, 100.0, before.TotalCounted)
	assert.Equal(t, 250.0, after.TotalCounted)
	assert.Equal(t, string(domain.CashRegisterCloseStatusApproved), after.Status)

	// Advisor was warned via a notification.
	assert.True(t, notifier.called)
	assert.Equal(t, uint(7), notifier.gotUserID)
	assert.Equal(t, domain.NotificationKindOperational, notifier.gotKind)

	repo.AssertExpectations(t)
}

func TestAdjustAndApprove_NonSubmittedRejected(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("GetByID", mock.Anything, uint(1)).
		Return(&domain.CashRegisterClose{ID: 1, UserID: 7, Status: domain.CashRegisterCloseStatusApproved}, nil)

	notifier := &fakeNotifier{}
	_, err := newAdjustSvc(repo, &mocks.MockCashRegisterCloseAdjustmentRepository{}, notifier).
		AdjustAndApprove(nil, 1, 99, cashclose.AdjustInput{
			PaymentMethods: []cashclose.PaymentMethodInput{{Name: "efectivo", CountedAmount: 250.0}},
			Reason:         "motivo",
		})

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.False(t, notifier.called)
	repo.AssertExpectations(t)
}

func TestAdjustAndApprove_RequiresReason(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	notifier := &fakeNotifier{}

	_, err := newAdjustSvc(repo, &mocks.MockCashRegisterCloseAdjustmentRepository{}, notifier).
		AdjustAndApprove(nil, 1, 99, cashclose.AdjustInput{
			PaymentMethods: []cashclose.PaymentMethodInput{{Name: "efectivo", CountedAmount: 250.0}},
			Reason:         "   ",
		})

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.False(t, notifier.called)
	// GetByID must not even be reached when the reason is empty.
	repo.AssertNotCalled(t, "GetByID", mock.Anything, mock.Anything)
}

func TestAcknowledgeAdjustment_WrongUserForbidden(t *testing.T) {
	adjRepo := &mocks.MockCashRegisterCloseAdjustmentRepository{}
	adjRepo.On("GetByID", mock.Anything, uint(5)).
		Return(&domain.CashRegisterCloseAdjustment{ID: 5, AdvisorUserID: 7}, nil)

	_, err := newAdjustSvc(&mocks.MockCashRegisterCloseRepository{}, adjRepo, &fakeNotifier{}).
		AcknowledgeAdjustment(nil, 5, domain.RoleReceptionist, 8)

	require.Error(t, err)
	var unauthorized *domain.ErrUnauthorized
	assert.True(t, errors.As(err, &unauthorized))
	adjRepo.AssertExpectations(t)
}

func TestAcknowledgeAdjustment_OwnerSuccess(t *testing.T) {
	adjRepo := &mocks.MockCashRegisterCloseAdjustmentRepository{}
	adjRepo.On("GetByID", mock.Anything, uint(5)).
		Return(&domain.CashRegisterCloseAdjustment{ID: 5, AdvisorUserID: 7}, nil).Once()
	adjRepo.On("Acknowledge", mock.Anything, uint(5)).Return(nil).Once()
	adjRepo.On("GetByID", mock.Anything, uint(5)).
		Return(&domain.CashRegisterCloseAdjustment{ID: 5, AdvisorUserID: 7}, nil).Once()

	out, err := newAdjustSvc(&mocks.MockCashRegisterCloseRepository{}, adjRepo, &fakeNotifier{}).
		AcknowledgeAdjustment(nil, 5, domain.RoleReceptionist, 7)

	require.NoError(t, err)
	assert.Equal(t, uint(5), out.ID)
	adjRepo.AssertExpectations(t)
}
