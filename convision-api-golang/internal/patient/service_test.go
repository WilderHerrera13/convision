package patient_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/patient"
	"github.com/convision/api/internal/testutil/mocks"
)

func newPatientSvc(repo *mocks.MockPatientRepository) *patient.Service {
	return patient.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Patient{ID: 1, FirstName: "Ana"}, nil)

	svc := newPatientSvc(repo)
	p, err := svc.Create(patient.CreateInput{
		FirstName:      "Ana",
		LastName:       "Lopez",
		Email:          "ana@example.com",
		Phone:          "1234567",
		Identification: "ID001",
		Gender:         "female",
	})

	require.NoError(t, err)
	assert.NotNil(t, p)
	repo.AssertExpectations(t)
}

func TestCreate_RepoError(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("Create", mock.Anything).Return(errors.New("db error"))

	_, err := newPatientSvc(repo).Create(patient.CreateInput{
		FirstName:      "Ana",
		LastName:       "Lopez",
		Email:          "ana@example.com",
		Phone:          "1234567",
		Identification: "ID001",
		Gender:         "female",
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "db error")
	repo.AssertExpectations(t)
}

func TestGetByID_Found(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Patient{ID: 1, FirstName: "Ana"}, nil)

	p, err := newPatientSvc(repo).GetByID(1)
	require.NoError(t, err)
	assert.Equal(t, "Ana", p.FirstName)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "patient"})

	_, err := newPatientSvc(repo).GetByID(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestList_ReturnsPage(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("List", mock.Anything, 1, 15).Return([]*domain.Patient{{ID: 1}}, int64(1), nil)

	out, err := newPatientSvc(repo).List(nil, 1, 15)
	require.NoError(t, err)
	assert.Equal(t, int64(1), out.Total)
	assert.Len(t, out.Data, 1)
	repo.AssertExpectations(t)
}

func TestDelete_Success(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Patient{ID: 1}, nil)
	repo.On("Delete", uint(1)).Return(nil)

	err := newPatientSvc(repo).Delete(1)
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDelete_NotFound(t *testing.T) {
	repo := &mocks.MockPatientRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "patient"})

	err := newPatientSvc(repo).Delete(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}
