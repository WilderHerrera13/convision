package prescription_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/prescription"
	"github.com/convision/api/internal/testutil/mocks"
)

func newPrescriptionSvc(repo *mocks.MockPrescriptionRepository) *prescription.Service {
	return prescription.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockPrescriptionRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Prescription{ID: 1, PatientName: "Juan"}, nil)

	p, err := newPrescriptionSvc(repo).Create(prescription.CreateInput{PatientName: "Juan"})
	require.NoError(t, err)
	assert.NotNil(t, p)
	repo.AssertExpectations(t)
}

func TestCreate_RepoError(t *testing.T) {
	repo := &mocks.MockPrescriptionRepository{}
	repo.On("Create", mock.Anything).Return(errors.New("db error"))

	_, err := newPrescriptionSvc(repo).Create(prescription.CreateInput{PatientName: "Juan"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "db error")
	repo.AssertExpectations(t)
}

func TestGetByID_Found(t *testing.T) {
	repo := &mocks.MockPrescriptionRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Prescription{ID: 1, PatientName: "Juan"}, nil)

	p, err := newPrescriptionSvc(repo).GetByID(1)
	require.NoError(t, err)
	assert.Equal(t, "Juan", p.PatientName)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockPrescriptionRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "prescription"})

	_, err := newPrescriptionSvc(repo).GetByID(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestListByPatient_ReturnsResults(t *testing.T) {
	repo := &mocks.MockPrescriptionRepository{}
	repo.On("ListByPatientID", uint(5), 1, 15).Return(
		[]*domain.Prescription{{ID: 1}},
		int64(1),
		nil,
	)

	out, err := newPrescriptionSvc(repo).ListByPatient(5, 1, 15)
	require.NoError(t, err)
	assert.Equal(t, int64(1), out.Total)
	assert.Len(t, out.Data, 1)
	repo.AssertExpectations(t)
}

func TestDelete_NotFound(t *testing.T) {
	repo := &mocks.MockPrescriptionRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "prescription"})

	err := newPrescriptionSvc(repo).Delete(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}
