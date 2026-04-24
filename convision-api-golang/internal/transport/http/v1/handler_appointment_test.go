package v1_test

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	appointmentsvc "github.com/convision/api/internal/appointment"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestListAppointments_Success(t *testing.T) {
	apptRepo := &mocks.MockAppointmentRepository{}
	apptRepo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.Appointment{{ID: 1}},
		int64(1),
		nil,
	)

	apptSvc := appointmentsvc.NewService(apptRepo, zap.NewNop())
	h := buildHandler(nil, nil, apptSvc, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/appointments", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
	testutil.AssertJSONHasKey(t, w, "data")
}

func TestCreateAppointment_Success(t *testing.T) {
	apptRepo := &mocks.MockAppointmentRepository{}
	apptRepo.On("Create", mock.Anything).Return(nil)
	apptRepo.On("GetByID", uint(0)).Return(&domain.Appointment{ID: 1}, nil)

	apptSvc := appointmentsvc.NewService(apptRepo, zap.NewNop())
	h := buildHandler(nil, nil, apptSvc, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/appointments", map[string]any{
		"patient_id": 1,
	}, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusCreated)
}

func TestCreateAppointment_ValidationError(t *testing.T) {
	// appointment.Create with no patient_id — binding: required
	apptRepo := &mocks.MockAppointmentRepository{}
	apptSvc := appointmentsvc.NewService(apptRepo, zap.NewNop())
	h := buildHandler(nil, nil, apptSvc, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	// Missing required patient_id field
	req := authedRequest(http.MethodPost, "/api/v1/appointments", map[string]any{
		"notes": "only notes, no patient_id",
	}, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusUnprocessableEntity)
}

func TestTakeAppointment_RoleGuard(t *testing.T) {
	// POST /appointments/:id/take requires RoleSpecialist only
	apptRepo := &mocks.MockAppointmentRepository{}
	apptSvc := appointmentsvc.NewService(apptRepo, zap.NewNop())
	h := buildHandler(nil, nil, apptSvc, nil, nil, nil, nil, nil)

	router := plainRouter(h)
	// Receptionist should get 403 on the take endpoint
	req := authedRequest(http.MethodPost, "/api/v1/appointments/1/take", nil, 3, domain.RoleReceptionist)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusForbidden)
}
