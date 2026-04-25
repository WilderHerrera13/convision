package mocks

import (
	"time"

	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.AppointmentRepository = (*MockAppointmentRepository)(nil)

type MockAppointmentRepository struct {
	mock.Mock
}

func (m *MockAppointmentRepository) GetByID(id uint) (*domain.Appointment, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Appointment), args.Error(1)
}

func (m *MockAppointmentRepository) GetByPatientID(patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	args := m.Called(patientID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Appointment), args.Get(1).(int64), args.Error(2)
}

func (m *MockAppointmentRepository) GetBySpecialistID(specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	args := m.Called(specialistID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Appointment), args.Get(1).(int64), args.Error(2)
}

func (m *MockAppointmentRepository) Create(a *domain.Appointment) error {
	return m.Called(a).Error(0)
}

func (m *MockAppointmentRepository) Update(a *domain.Appointment) error {
	return m.Called(a).Error(0)
}

func (m *MockAppointmentRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockAppointmentRepository) List(filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Appointment), args.Get(1).(int64), args.Error(2)
}

func (m *MockAppointmentRepository) SaveManagementReport(id uint, consultationType, reportNotes string) error {
	return m.Called(id, consultationType, reportNotes).Error(0)
}

func (m *MockAppointmentRepository) GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*domain.SpecialistReportSummary, error) {
	args := m.Called(from, to, specialistIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.SpecialistReportSummary), args.Error(1)
}

func (m *MockAppointmentRepository) ExistsByPatientAndDate(patientID uint, specialistID *uint, date time.Time) (bool, error) {
	args := m.Called(patientID, specialistID, date)
	return args.Bool(0), args.Error(1)
}

func (m *MockAppointmentRepository) HasConflictForSpecialist(specialistID uint, scheduledAt time.Time, excludeID uint, durationMins int) (bool, error) {
	args := m.Called(specialistID, scheduledAt, excludeID, durationMins)
	return args.Bool(0), args.Error(1)
}

func (m *MockAppointmentRepository) GetBookedTimesForSpecialist(specialistID uint, date time.Time) ([]string, error) {
	args := m.Called(specialistID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), args.Error(1)
}
