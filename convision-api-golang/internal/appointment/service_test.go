package appointment_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/appointment"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

func newAppointmentSvc(repo *mocks.MockAppointmentRepository) *appointment.Service {
	return appointment.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Appointment{ID: 1}, nil)

	svc := newAppointmentSvc(repo)
	a, err := svc.Create(appointment.CreateInput{
		PatientID:   1,
		ScheduledAt: "2099-12-31 10:00",
	}, 3)

	require.NoError(t, err)
	assert.NotNil(t, a)
	repo.AssertExpectations(t)
}

// TestCreate_ScheduledInPast documents that the service does NOT validate past dates —
// it creates the appointment regardless of scheduled_at value.
func TestCreate_ScheduledInPast(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Appointment{ID: 1}, nil)

	svc := newAppointmentSvc(repo)
	a, err := svc.Create(appointment.CreateInput{
		PatientID:   1,
		ScheduledAt: "2000-01-01 09:00",
	}, 3)

	require.NoError(t, err)
	assert.NotNil(t, a)
	repo.AssertExpectations(t)
}

func TestCreate_ConflictExists(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("Create", mock.Anything).Return(errors.New("duplicate appointment"))

	_, err := newAppointmentSvc(repo).Create(appointment.CreateInput{PatientID: 1}, 3)
	require.Error(t, err)
	repo.AssertExpectations(t)
}

func TestTakeAppointment_Success(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusScheduled}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusInProgress}, nil).Once()

	a, err := newAppointmentSvc(repo).Take(1, 2)
	require.NoError(t, err)
	assert.Equal(t, domain.AppointmentStatusInProgress, a.Status)
	repo.AssertExpectations(t)
}

// TestTakeAppointment_AlreadyInProgress documents that Take has no state guard —
// taking an already in_progress appointment succeeds (status just gets set again).
func TestTakeAppointment_AlreadyInProgress(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusInProgress}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusInProgress}, nil).Once()

	_, err := newAppointmentSvc(repo).Take(1, 2)
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestPauseAppointment_Success(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusInProgress}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusPaused}, nil).Once()

	a, err := newAppointmentSvc(repo).Pause(1)
	require.NoError(t, err)
	assert.Equal(t, domain.AppointmentStatusPaused, a.Status)
	repo.AssertExpectations(t)
}

func TestPauseAppointment_NotInProgress(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusScheduled}, nil)

	_, err := newAppointmentSvc(repo).Pause(1)
	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	repo.AssertExpectations(t)
}

func TestResumeAppointment_Success(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusPaused}, nil).Once()
	repo.On("Update", mock.Anything).Return(nil)
	repo.On("GetByID", uint(1)).Return(&domain.Appointment{ID: 1, Status: domain.AppointmentStatusInProgress}, nil).Once()

	a, err := newAppointmentSvc(repo).Resume(1)
	require.NoError(t, err)
	assert.Equal(t, domain.AppointmentStatusInProgress, a.Status)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockAppointmentRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "appointment"})

	_, err := newAppointmentSvc(repo).GetByID(99)
	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}
