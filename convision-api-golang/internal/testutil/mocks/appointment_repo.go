package mocks

import (
	"time"

	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.AppointmentRepository = (*MockAppointmentRepository)(nil)

type MockAppointmentRepository struct {
	mock.Mock
}

func (m *MockAppointmentRepository) GetByID(db *gorm.DB, id uint) (*domain.Appointment, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Appointment), args.Error(1)
}

func (m *MockAppointmentRepository) GetByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	args := m.Called(db, patientID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Appointment), args.Get(1).(int64), args.Error(2)
}

func (m *MockAppointmentRepository) GetBySpecialistID(db *gorm.DB, specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	args := m.Called(db, specialistID, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Appointment), args.Get(1).(int64), args.Error(2)
}

func (m *MockAppointmentRepository) Create(db *gorm.DB, a *domain.Appointment) error {
	return m.Called(db, a).Error(0)
}

func (m *MockAppointmentRepository) Update(db *gorm.DB, a *domain.Appointment) error {
	return m.Called(db, a).Error(0)
}

func (m *MockAppointmentRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockAppointmentRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Appointment), args.Get(1).(int64), args.Error(2)
}

func (m *MockAppointmentRepository) SaveManagementReport(db *gorm.DB, id uint, consultationType, reportNotes string) error {
	return m.Called(db, id, consultationType, reportNotes).Error(0)
}

func (m *MockAppointmentRepository) GetConsolidatedReport(db *gorm.DB, from, to string, specialistIDs []uint, branchID *uint) ([]*domain.SpecialistReportSummary, error) {
	args := m.Called(db, from, to, specialistIDs, branchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.SpecialistReportSummary), args.Error(1)
}

func (m *MockAppointmentRepository) ExistsByPatientAndDate(db *gorm.DB, patientID uint, specialistID *uint, date time.Time) (bool, error) {
	args := m.Called(db, patientID, specialistID, date)
	return args.Bool(0), args.Error(1)
}

func (m *MockAppointmentRepository) HasConflictForSpecialist(db *gorm.DB, specialistID uint, scheduledAt time.Time, excludeID uint, durationMins int) (bool, error) {
	args := m.Called(db, specialistID, scheduledAt, excludeID, durationMins)
	return args.Bool(0), args.Error(1)
}

func (m *MockAppointmentRepository) GetBookedTimesForSpecialist(db *gorm.DB, specialistID uint, date time.Time) ([]string, error) {
	args := m.Called(db, specialistID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), args.Error(1)
}
