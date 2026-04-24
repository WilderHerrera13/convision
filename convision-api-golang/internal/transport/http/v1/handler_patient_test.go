package v1_test

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/patient"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestListPatients_AdminOK(t *testing.T) {
	patientRepo := &mocks.MockPatientRepository{}
	patientRepo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.Patient{{ID: 1, FirstName: "Ana"}},
		int64(1),
		nil,
	)

	patientSvc := patient.NewService(patientRepo, zap.NewNop())
	h := buildHandler(nil, patientSvc, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/patients", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
	testutil.AssertJSONHasKey(t, w, "data")
}

func TestListPatients_RoleGuard(t *testing.T) {
	// GET /patients is open to all authenticated roles — Laboratory cannot list
	// Actually looking at routes.go: GET /patients has no RequireRole, so all authenticated roles can access.
	// Instead test that a route with role restriction (DELETE) denies wrong role.
	patientRepo := &mocks.MockPatientRepository{}
	patientSvc := patient.NewService(patientRepo, zap.NewNop())
	h := buildHandler(nil, patientSvc, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	// DELETE /patients/:id requires admin only — specialist should get 403
	req := authedRequest(http.MethodDelete, "/api/v1/patients/1", nil, 2, domain.RoleSpecialist)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusForbidden)
}

func TestCreatePatient_Success(t *testing.T) {
	patientRepo := &mocks.MockPatientRepository{}
	patientRepo.On("Create", mock.Anything).Return(nil)
	patientRepo.On("GetByID", uint(0)).Return(&domain.Patient{ID: 1, FirstName: "Ana"}, nil)

	patientSvc := patient.NewService(patientRepo, zap.NewNop())
	h := buildHandler(nil, patientSvc, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/patients", map[string]any{
		"first_name":     "Ana",
		"last_name":      "García",
		"email":          "ana@test.com",
		"phone":          "555-1234",
		"identification": "12345678",
		"gender":         "female",
	}, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusCreated)
}

func TestCreatePatient_Missing_RequiredField(t *testing.T) {
	patientRepo := &mocks.MockPatientRepository{}
	patientSvc := patient.NewService(patientRepo, zap.NewNop())
	h := buildHandler(nil, patientSvc, nil, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	// Missing first_name, last_name, etc.
	req := authedRequest(http.MethodPost, "/api/v1/patients", map[string]any{
		"email": "incomplete@test.com",
	}, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusUnprocessableEntity)
}
