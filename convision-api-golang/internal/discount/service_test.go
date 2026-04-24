package discount_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/discount"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

func newDiscountSvc(repo *mocks.MockDiscountRepository) *discount.Service {
	return discount.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.DiscountRequest{ID: 0, Status: domain.DiscountRequestStatusPending}, nil)

	d, err := newDiscountSvc(repo).Create(discount.CreateInput{
		DiscountPercentage: 10.0,
		UserID:             1,
	})

	require.NoError(t, err)
	assert.Equal(t, domain.DiscountRequestStatusPending, d.Status)
	repo.AssertExpectations(t)
}

func TestApprove_Success(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.DiscountRequest{ID: 1, Status: domain.DiscountRequestStatusPending}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.DiscountRequest{ID: 1, Status: domain.DiscountRequestStatusApproved}, nil).Once()

	d, err := newDiscountSvc(repo).Approve(1, 2, discount.ApproveInput{})

	require.NoError(t, err)
	assert.Equal(t, domain.DiscountRequestStatusApproved, d.Status)
	repo.AssertExpectations(t)
}

func TestApprove_NonPendingRejected(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.DiscountRequest{ID: 1, Status: domain.DiscountRequestStatusApproved}, nil)

	_, err := newDiscountSvc(repo).Approve(1, 2, discount.ApproveInput{})

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "status", valErr.Field)
	repo.AssertExpectations(t)
}

func TestReject_Success(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.DiscountRequest{ID: 1, Status: domain.DiscountRequestStatusPending}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.DiscountRequest{ID: 1, Status: domain.DiscountRequestStatusRejected}, nil).Once()

	d, err := newDiscountSvc(repo).Reject(1, "too high")

	require.NoError(t, err)
	assert.Equal(t, domain.DiscountRequestStatusRejected, d.Status)
	repo.AssertExpectations(t)
}

func TestReject_NonPending(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.DiscountRequest{ID: 1, Status: domain.DiscountRequestStatusRejected}, nil)

	_, err := newDiscountSvc(repo).Reject(1, "reason")

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	repo.AssertExpectations(t)
}

func TestGetBestDiscount_Active(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	lensID := uint(1)
	repo.On("GetActiveForProduct", uint(1)).Return(
		[]*domain.DiscountRequest{{ID: 1, DiscountPercentage: 15.0}},
		nil,
	)

	d, err := newDiscountSvc(repo).GetBestDiscount(&lensID, nil)

	require.NoError(t, err)
	assert.InDelta(t, 15.0, d.DiscountPercentage, 0.001)
	repo.AssertExpectations(t)
}

func TestGetBestDiscount_NoneAvailable(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	lensID := uint(1)
	repo.On("GetActiveForProduct", uint(1)).Return([]*domain.DiscountRequest{}, nil)

	d, err := newDiscountSvc(repo).GetBestDiscount(&lensID, nil)

	require.NoError(t, err)
	assert.Nil(t, d)
	repo.AssertExpectations(t)
}

func TestList_Paginated(t *testing.T) {
	repo := &mocks.MockDiscountRepository{}
	repo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.DiscountRequest{{ID: 1}},
		int64(1),
		nil,
	)

	out, err := newDiscountSvc(repo).List(nil, 1, 15)
	require.NoError(t, err)
	assert.Equal(t, int64(1), out.Total)
	repo.AssertExpectations(t)
}
