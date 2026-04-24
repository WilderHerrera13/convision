package v1_test

import (
	"net/http"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	appointmentsvc "github.com/convision/api/internal/appointment"
	authsvc "github.com/convision/api/internal/auth"
	cashclosesvc "github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/domain"
	inventorysvc "github.com/convision/api/internal/inventory"
	labsvc "github.com/convision/api/internal/laboratory"
	"github.com/convision/api/internal/patient"
	jwtauth "github.com/convision/api/internal/platform/auth"
	"github.com/convision/api/internal/product"
	salesvc "github.com/convision/api/internal/sale"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
	v1 "github.com/convision/api/internal/transport/http/v1"
)

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-handler-tests")
	os.Setenv("JWT_TTL_HOURS", "1")
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

// tokenFor generates a real JWT for a given role and userID.
// JWT_SECRET must be set before calling (done in TestMain).
func tokenFor(userID uint, role domain.Role) string {
	user := &domain.User{ID: userID, Role: role}
	token, _, _, _ := jwtauth.GenerateToken(user)
	return token
}

// authedRequest creates a JSON request with a real Bearer JWT for the given role.
func authedRequest(method, path string, body any, userID uint, role domain.Role) *http.Request {
	req := testutil.NewRequest(method, path, body)
	req.Header.Set("Authorization", "Bearer "+tokenFor(userID, role))
	return req
}

// buildHandler assembles a v1.Handler with the minimum services needed for tests.
// Pass non-nil only for the services exercised by the test group.
func buildHandler(
	authSvc *authsvc.Service,
	patientSvc *patient.Service,
	appointmentSvc *appointmentsvc.Service,
	productSvc *product.Service,
	saleSvc *salesvc.Service,
	laboratorySvc *labsvc.Service,
	inventorySvc *inventorysvc.Service,
	cashCloseSvc *cashclosesvc.Service,
) *v1.Handler {
	return v1.NewHandler(
		authSvc,
		patientSvc,
		nil, // clinic
		nil, // user
		appointmentSvc,
		nil, // prescription
		nil, // catalog
		nil, // location
		productSvc,
		nil, // category
		inventorySvc,
		nil, // discount
		nil, // quote
		saleSvc,
		nil, // order
		laboratorySvc,
		nil, // supplier
		nil, // purchase
		nil, // expense
		nil, // payroll
		nil, // serviceOrder
		nil, // cashTransfer
		cashCloseSvc,
		nil, // notification
		nil, // note
		nil, // dailyActivity
		nil, // dashboard
		nil, // bulkImport
		nil, // bulkImportLog
		nil, // revokedTokens — nil disables revocation check in Authenticate
		nil, // storage
	)
}

// plainRouter creates a gin.Engine with all handler routes registered but
// no InjectClaims — requests must carry a real Authorization header.
func plainRouter(h *v1.Handler) *gin.Engine {
	r := gin.New()
	api := r.Group("/api")
	h.RegisterRoutes(api)
	return r
}

// ---------- Auth handler tests ----------

func TestLogin_Success(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.MinCost)
	userRepo := &mocks.MockUserRepository{}
	userRepo.On("GetByEmail", "admin@test.com").Return(&domain.User{
		ID:       1,
		Email:    "admin@test.com",
		Password: string(hash),
		Role:     domain.RoleAdmin,
		Active:   true,
	}, nil)

	revokedRepo := &mocks.MockRevokedTokenRepository{}
	authSvc := authsvc.NewService(userRepo, revokedRepo, zap.NewNop())
	h := buildHandler(authSvc, nil, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := testutil.NewRequest(http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email":    "admin@test.com",
		"password": "password",
	})
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
	testutil.AssertJSONHasKey(t, w, "access_token")
}

func TestLogin_InvalidCredentials(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	userRepo.On("GetByEmail", "unknown@test.com").Return(nil, &domain.ErrNotFound{Resource: "user"})

	revokedRepo := &mocks.MockRevokedTokenRepository{}
	authSvc := authsvc.NewService(userRepo, revokedRepo, zap.NewNop())
	h := buildHandler(authSvc, nil, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := testutil.NewRequest(http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email":    "unknown@test.com",
		"password": "wrongpass",
	})
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusUnauthorized)
}

func TestMe_Returns200(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	userRepo.On("GetByID", uint(1)).Return(&domain.User{
		ID:   1,
		Role: domain.RoleAdmin,
	}, nil)

	revokedRepo := &mocks.MockRevokedTokenRepository{}
	authSvc := authsvc.NewService(userRepo, revokedRepo, zap.NewNop())
	h := buildHandler(authSvc, nil, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/auth/me", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}

func TestLogout_Success(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	revokedRepo := &mocks.MockRevokedTokenRepository{}
	revokedRepo.On("Revoke", mock.Anything).Return(nil)
	revokedRepo.On("IsRevoked", mock.Anything).Return(false, nil)

	authSvc := authsvc.NewService(userRepo, revokedRepo, zap.NewNop())
	// wire revokedRepo into handler so Authenticate can check revocation
	h := v1.NewHandler(
		authSvc,
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
		revokedRepo,
		nil,
	)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/auth/logout", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}
