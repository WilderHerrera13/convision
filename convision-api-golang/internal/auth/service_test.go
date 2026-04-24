package auth_test

import (
	"errors"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/convision/api/internal/auth"
	"github.com/convision/api/internal/domain"
)

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-for-auth-tests")
	os.Setenv("JWT_TTL_HOURS", "1")
	os.Exit(m.Run())
}

// --- local function-field mocks ---

type mockUserRepo struct {
	getByEmailFn func(string) (*domain.User, error)
	getByIDFn    func(uint) (*domain.User, error)
	createFn     func(*domain.User) error
	updateFn     func(*domain.User) error
	deleteFn     func(uint) error
	listFn       func(map[string]any, int, int) ([]*domain.User, int64, error)
}

func (m *mockUserRepo) GetByEmail(email string) (*domain.User, error) {
	if m.getByEmailFn != nil {
		return m.getByEmailFn(email)
	}
	return nil, nil
}
func (m *mockUserRepo) GetByID(id uint) (*domain.User, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(id)
	}
	return nil, nil
}
func (m *mockUserRepo) Create(u *domain.User) error {
	if m.createFn != nil {
		return m.createFn(u)
	}
	return nil
}
func (m *mockUserRepo) Update(u *domain.User) error {
	if m.updateFn != nil {
		return m.updateFn(u)
	}
	return nil
}
func (m *mockUserRepo) Delete(id uint) error {
	if m.deleteFn != nil {
		return m.deleteFn(id)
	}
	return nil
}
func (m *mockUserRepo) List(filters map[string]any, page, perPage int) ([]*domain.User, int64, error) {
	if m.listFn != nil {
		return m.listFn(filters, page, perPage)
	}
	return nil, 0, nil
}

type mockRevokedTokenRepo struct {
	revokeFn    func(string) error
	isRevokedFn func(string) (bool, error)
}

func (m *mockRevokedTokenRepo) Revoke(jti string) error {
	if m.revokeFn != nil {
		return m.revokeFn(jti)
	}
	return nil
}
func (m *mockRevokedTokenRepo) IsRevoked(jti string) (bool, error) {
	if m.isRevokedFn != nil {
		return m.isRevokedFn(jti)
	}
	return false, nil
}

// --- helpers ---

func hashedPassword(t *testing.T, plain string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.MinCost)
	require.NoError(t, err)
	return string(h)
}

func newSvc(users domain.UserRepository, revoked domain.RevokedTokenRepository) *auth.Service {
	return auth.NewService(users, revoked, zap.NewNop())
}

// --- tests ---

func TestLogin_ValidCredentials(t *testing.T) {
	user := &domain.User{ID: 42, Email: "test@example.com", Password: hashedPassword(t, "password"), Active: true, Role: domain.RoleAdmin}
	svc := newSvc(
		&mockUserRepo{getByEmailFn: func(string) (*domain.User, error) { return user, nil }},
		&mockRevokedTokenRepo{},
	)

	out, err := svc.Login(auth.LoginInput{Email: "test@example.com", Password: "password"})

	require.NoError(t, err)
	assert.NotEmpty(t, out.AccessToken)
	assert.Equal(t, uint(42), out.User.ID)
}

func TestLogin_WrongPassword(t *testing.T) {
	user := &domain.User{ID: 1, Email: "test@example.com", Password: hashedPassword(t, "correct"), Active: true}
	svc := newSvc(
		&mockUserRepo{getByEmailFn: func(string) (*domain.User, error) { return user, nil }},
		&mockRevokedTokenRepo{},
	)

	_, err := svc.Login(auth.LoginInput{Email: "test@example.com", Password: "wrong"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid credentials")
}

func TestLogin_InactiveUser(t *testing.T) {
	user := &domain.User{ID: 1, Email: "test@example.com", Password: hashedPassword(t, "password"), Active: false}
	svc := newSvc(
		&mockUserRepo{getByEmailFn: func(string) (*domain.User, error) { return user, nil }},
		&mockRevokedTokenRepo{},
	)

	_, err := svc.Login(auth.LoginInput{Email: "test@example.com", Password: "password"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "account is disabled")
}

func TestLogin_UserNotFound(t *testing.T) {
	svc := newSvc(
		&mockUserRepo{getByEmailFn: func(string) (*domain.User, error) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}},
		&mockRevokedTokenRepo{},
	)

	_, err := svc.Login(auth.LoginInput{Email: "nobody@example.com", Password: "x"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid credentials")
}

func TestLogout_Success(t *testing.T) {
	svc := newSvc(&mockUserRepo{}, &mockRevokedTokenRepo{
		revokeFn: func(jti string) error { return nil },
	})

	err := svc.Logout("some-jti")
	assert.NoError(t, err)
}

func TestLogout_RepoError(t *testing.T) {
	svc := newSvc(&mockUserRepo{}, &mockRevokedTokenRepo{
		revokeFn: func(jti string) error { return errors.New("db error") },
	})

	err := svc.Logout("some-jti")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "db error")
}

func TestMe_Success(t *testing.T) {
	svc := newSvc(
		&mockUserRepo{getByIDFn: func(id uint) (*domain.User, error) { return &domain.User{ID: id}, nil }},
		&mockRevokedTokenRepo{},
	)

	u, err := svc.Me(1)
	require.NoError(t, err)
	assert.Equal(t, uint(1), u.ID)
}

func TestMe_UserNotFound(t *testing.T) {
	svc := newSvc(
		&mockUserRepo{getByIDFn: func(id uint) (*domain.User, error) {
			return nil, &domain.ErrNotFound{Resource: "user"}
		}},
		&mockRevokedTokenRepo{},
	)

	_, err := svc.Me(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
}

func TestRefresh_Success(t *testing.T) {
	user := &domain.User{ID: 7, Email: "refresh@example.com", Active: true, Role: domain.RoleAdmin}
	revoked := false
	svc := newSvc(
		&mockUserRepo{getByIDFn: func(id uint) (*domain.User, error) { return user, nil }},
		&mockRevokedTokenRepo{
			revokeFn: func(jti string) error { revoked = true; return nil },
		},
	)

	out, err := svc.Refresh("old-jti", 7)
	require.NoError(t, err)
	assert.True(t, revoked)
	assert.NotEmpty(t, out.AccessToken)
}
