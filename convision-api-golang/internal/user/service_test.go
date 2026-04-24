package user_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
	"github.com/convision/api/internal/user"
)

func newUserSvc(repo *mocks.MockUserRepository) *user.Service {
	return user.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockUserRepository{}
	repo.On("Create", mock.Anything).Return(nil)

	svc := newUserSvc(repo)
	u, err := svc.Create(user.CreateInput{
		Name:           "Carlos",
		LastName:       "Ruiz",
		Email:          "carlos@example.com",
		Identification: "ID123",
		Password:       "securepass",
		Role:           domain.RoleAdmin,
	})

	require.NoError(t, err)
	assert.NotNil(t, u)
	assert.Equal(t, "carlos@example.com", u.Email)
	repo.AssertExpectations(t)
}

func TestCreate_EmailConflict(t *testing.T) {
	repo := &mocks.MockUserRepository{}
	repo.On("Create", mock.Anything).Return(&domain.ErrConflict{Resource: "user", Field: "email"})

	_, err := newUserSvc(repo).Create(user.CreateInput{
		Name:           "Carlos",
		LastName:       "Ruiz",
		Email:          "carlos@example.com",
		Identification: "ID123",
		Password:       "securepass",
		Role:           domain.RoleAdmin,
	})

	require.Error(t, err)
	var conflict *domain.ErrConflict
	assert.True(t, errors.As(err, &conflict))
	repo.AssertExpectations(t)
}

func TestGetByID_Found(t *testing.T) {
	repo := &mocks.MockUserRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.User{ID: 1, Name: "Carlos"}, nil)

	u, err := newUserSvc(repo).GetByID(1)
	require.NoError(t, err)
	assert.Equal(t, "Carlos", u.Name)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockUserRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "user"})

	_, err := newUserSvc(repo).GetByID(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestGetSpecialists_ReturnsList(t *testing.T) {
	repo := &mocks.MockUserRepository{}
	repo.On("List", map[string]any{"role": string(domain.RoleSpecialist)}, 1, 200).Return(
		[]*domain.User{{ID: 1, Role: domain.RoleSpecialist}},
		int64(1),
		nil,
	)

	specialists, err := newUserSvc(repo).GetSpecialists()
	require.NoError(t, err)
	assert.Len(t, specialists, 1)
	repo.AssertExpectations(t)
}

func TestDelete_Success(t *testing.T) {
	repo := &mocks.MockUserRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.User{ID: 1}, nil)
	repo.On("Delete", uint(1)).Return(nil)

	err := newUserSvc(repo).Delete(1)
	require.NoError(t, err)
	repo.AssertExpectations(t)
}
