package appointment

import (
	"encoding/json"
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/clock"
)

// Service handles appointment-related use-cases.
type Service struct {
	repo   domain.AppointmentRepository
	logger *zap.Logger
}

// NewService creates a new appointment Service.
func NewService(repo domain.AppointmentRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating an appointment.
type CreateInput struct {
	BranchID          uint   `json:"branch_id"`
	PatientID         uint   `json:"patient_id"          binding:"required"`
	SpecialistID      *uint  `json:"specialist_id"`
	DoctorID          *uint  `json:"doctor_id"`
	ScheduledAt       string `json:"scheduled_at"`
	Date              string `json:"date"`
	Time              string `json:"time"`
	Notes             string `json:"notes"`
	Reason            string `json:"reason"`
	AppointmentTypeID *uint  `json:"appointment_type_id"`
	ConsultationType  string `json:"consultation_type"   binding:"omitempty,oneof=effective formula_sale ineffective follow_up warranty_follow_up"`
}

// UpdateInput holds validated fields for updating an appointment.
type UpdateInput struct {
	PatientID    *uint  `json:"patient_id"`
	SpecialistID *uint  `json:"specialist_id"`
	ScheduledAt  string `json:"scheduled_at"`
	Date         string `json:"date"`
	Time         string `json:"time"`
	Notes        string `json:"notes"`
	Reason       string `json:"reason"`
	Status       string `json:"status" binding:"omitempty,oneof=scheduled in_progress paused completed cancelled"`
}

// AnnotationsInput holds annotation data for an appointment.
type AnnotationsInput struct {
	Notes                   string          `json:"notes"`
	LeftEyeAnnotationPaths  json.RawMessage `json:"left_eye_annotation_paths"`
	RightEyeAnnotationPaths json.RawMessage `json:"right_eye_annotation_paths"`
}

type LensAnnotationInput struct {
	LensAnnotationImage string          `json:"lens_annotation_image" binding:"required"`
	LensAnnotationPaths json.RawMessage `json:"lens_annotation_paths"`
}

// ManagementReportInput holds the fields the specialist captures in the
// management report ("Informe de gestión") form.
type ManagementReportInput struct {
	ConsultationType string `json:"consultation_type" binding:"required,oneof=effective formula_sale ineffective follow_up warranty_follow_up"`
	ReportNotes      string `json:"report_notes"      binding:"required,max=500"`
}

// ListOutput wraps a page of appointments with Laravel-compatible pagination metadata.
type ListOutput struct {
	Data        []*domain.Appointment `json:"data"`
	Total       int64                 `json:"total"`
	CurrentPage int                   `json:"current_page"`
	PerPage     int                   `json:"per_page"`
	LastPage    int                   `json:"last_page"`
}

// parseScheduledAt interprets the front-end's naive datetime payload in the
// clinic timezone. Offset-aware strings (RFC 3339) are honoured as sent.
func parseScheduledAt(scheduledAt, date, timeStr string) *time.Time {
	if scheduledAt != "" {
		if t, err := clock.ParseDateTime(scheduledAt); err == nil {
			return &t
		}
	}
	if date != "" && timeStr != "" {
		if t, err := clock.CombineDateTime(date, timeStr); err == nil {
			return &t
		}
	}
	return nil
}

// List returns a paginated list of appointments, optionally filtered.
func (s *Service) List(db *gorm.DB, f domain.AppointmentFilter) (*ListOutput, error) {
	f.Clamp()

	data, total, err := s.repo.List(db, f)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(f.PerPage)))
	}

	return &ListOutput{
		Data:        data,
		Total:       total,
		CurrentPage: f.Page,
		PerPage:     f.PerPage,
		LastPage:    lastPage,
	}, nil
}

// GetByID returns a single appointment (with relations) or ErrNotFound.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.Appointment, error) {
	return s.repo.GetByID(db, id)
}

const defaultAppointmentDurationMins = 30

// Create adds a new appointment after checking for specialist scheduling conflicts.
func (s *Service) Create(db *gorm.DB, input CreateInput, receptionistID uint) (*domain.Appointment, error) {
	if input.SpecialistID == nil && input.DoctorID != nil {
		input.SpecialistID = input.DoctorID
	}
	scheduledAt := parseScheduledAt(input.ScheduledAt, input.Date, input.Time)

	if scheduledAt != nil && input.SpecialistID != nil {
		conflict, err := s.repo.HasConflictForSpecialist(db, *input.SpecialistID, *scheduledAt, 0, defaultAppointmentDurationMins)
		if err != nil {
			return nil, err
		}
		if conflict {
			return nil, &domain.ErrValidation{
				Field:   "scheduled_at",
				Message: "el especialista ya tiene una cita programada en ese horario",
			}
		}
	}

	a := &domain.Appointment{
		BranchID:          input.BranchID,
		PatientID:         input.PatientID,
		SpecialistID:      input.SpecialistID,
		ReceptionistID:    &receptionistID,
		ScheduledAt:       scheduledAt,
		Notes:             input.Notes,
		Reason:            input.Reason,
		Status:            domain.AppointmentStatusScheduled,
		AppointmentTypeID: input.AppointmentTypeID,
		ConsultationType:  input.ConsultationType,
	}

	if err := s.repo.Create(db, a); err != nil {
		return nil, err
	}

	s.logger.Info("appointment created", zap.Uint("appointment_id", a.ID))
	return s.repo.GetByID(db, a.ID)
}

// Update modifies an existing appointment's mutable fields, checking for scheduling conflicts.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if input.PatientID != nil {
		a.PatientID = *input.PatientID
	}
	if input.SpecialistID != nil {
		a.SpecialistID = input.SpecialistID
	}
	if sa := parseScheduledAt(input.ScheduledAt, input.Date, input.Time); sa != nil {
		a.ScheduledAt = sa
	}
	if input.Notes != "" {
		a.Notes = input.Notes
	}
	if input.Reason != "" {
		a.Reason = input.Reason
	}
	if input.Status != "" {
		a.Status = domain.AppointmentStatus(input.Status)
	}

	skipConflictCheck := input.Status == "cancelled" || input.Status == "completed"
	if a.ScheduledAt != nil && a.SpecialistID != nil && !skipConflictCheck {
		conflict, cerr := s.repo.HasConflictForSpecialist(db, *a.SpecialistID, *a.ScheduledAt, id, defaultAppointmentDurationMins)
		if cerr != nil {
			return nil, cerr
		}
		if conflict {
			return nil, &domain.ErrValidation{
				Field:   "scheduled_at",
				Message: "el especialista ya tiene una cita programada en ese horario",
			}
		}
	}

	if err := s.repo.Update(db, a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, a.ID)
}

// GetBookedSlots returns the list of HH:MM times already booked for a specialist on a given date.
func (s *Service) GetBookedSlots(db *gorm.DB, specialistID uint, date time.Time) ([]string, error) {
	return s.repo.GetBookedTimesForSpecialist(db, specialistID, date)
}

// Delete removes an appointment.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	return s.repo.Delete(db, id)
}

// Take sets appointment to in_progress and assigns taken_by.
// Enforces "one active appointment per specialist": if the specialist already has
// another appointment in progress, returns ErrValidation. Re-taking the same
// appointment is a no-op.
func (s *Service) Take(db *gorm.DB, id uint, specialistID uint) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	active, err := s.repo.GetActiveBySpecialist(db, specialistID)
	if err != nil {
		if _, ok := err.(*domain.ErrNotFound); !ok {
			return nil, err
		}
	} else if active != nil && active.ID != id {
		return nil, &domain.ErrAppointmentInProgress{
			ActiveAppointmentID: active.ID,
			Message:             "Ya tienes una cita en curso. Pausa o finaliza la cita en curso antes de tomar otra.",
		}
	}

	a.Status = domain.AppointmentStatusInProgress
	a.TakenByID = &specialistID

	if err := s.repo.Update(db, a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, a.ID)
}

// Pause sets appointment to paused (must be in_progress).
func (s *Service) Pause(db *gorm.DB, id uint) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if a.Status != domain.AppointmentStatusInProgress {
		return nil, &domain.ErrValidation{Field: "status", Message: "appointment is not in progress"}
	}

	a.Status = domain.AppointmentStatusPaused
	if err := s.repo.Update(db, a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, a.ID)
}

// Resume sets appointment to in_progress (must be paused).
func (s *Service) Resume(db *gorm.DB, id uint) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if a.Status != domain.AppointmentStatusPaused {
		return nil, &domain.ErrValidation{Field: "status", Message: "appointment is not paused"}
	}

	a.Status = domain.AppointmentStatusInProgress
	if err := s.repo.Update(db, a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, a.ID)
}

// ListManagementReport returns a page of appointments filtered to those
// handled by the given specialist (either assigned or taken). When
// specialistID is 0 no attended-by constraint is applied (admin view).
// When pendingReport is true only appointments without a saved report are returned.
func (s *Service) ListManagementReport(
	db *gorm.DB,
	specialistID uint,
	search, startDate, endDate, status, consultationType string,
	branchID *uint,
	pendingReport bool,
	page, perPage int,
) (*ListOutput, error) {
	f := domain.AppointmentFilter{
		Pagination:       domain.Pagination{Page: page, PerPage: perPage},
		Status:           status,
		ConsultationType: consultationType,
		StartDate:        startDate,
		EndDate:          endDate,
		PatientSearch:    search,
		PendingReport:    pendingReport,
	}
	if specialistID != 0 {
		sid := specialistID
		f.AttendedBy = &sid
	}
	if branchID != nil && *branchID != 0 {
		bid := *branchID
		f.BranchID = &bid
	}
	return s.List(db, f)
}

// GetConsolidatedReport returns per-specialist aggregated consultation counts
// for the given date range. specialistIDs restricts to those IDs when non-empty.
func (s *Service) GetConsolidatedReport(db *gorm.DB, from, to string, specialistIDs []uint, branchID *uint) ([]*domain.SpecialistReportSummary, error) {
	return s.repo.GetConsolidatedReport(db, from, to, specialistIDs, branchID)
}

// SaveManagementReport validates the report input and persists the
// consultation_type + report_notes columns on the target appointment.
func (s *Service) SaveManagementReport(db *gorm.DB, id uint, input ManagementReportInput) (*domain.Appointment, error) {
	if !domain.IsValidConsultationType(input.ConsultationType) {
		return nil, &domain.ErrValidation{
			Field:   "consultation_type",
			Message: "valor no válido",
		}
	}
	if _, err := s.repo.GetByID(db, id); err != nil {
		return nil, err
	}
	if err := s.repo.SaveManagementReport(db, id, input.ConsultationType, input.ReportNotes); err != nil {
		return nil, err
	}
	s.logger.Info("management report saved",
		zap.Uint("appointment_id", id),
		zap.String("consultation_type", input.ConsultationType),
	)
	return s.repo.GetByID(db, id)
}

// SaveAnnotations updates annotation paths/notes on an appointment.
func (s *Service) SaveAnnotations(db *gorm.DB, id uint, input AnnotationsInput) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if input.Notes != "" {
		a.Notes = input.Notes
	}
	if len(input.LeftEyeAnnotationPaths) > 0 {
		a.LeftEyeAnnotationPaths = string(input.LeftEyeAnnotationPaths)
	}
	if len(input.RightEyeAnnotationPaths) > 0 {
		a.RightEyeAnnotationPaths = string(input.RightEyeAnnotationPaths)
	}

	if err := s.repo.Update(db, a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, a.ID)
}

func (s *Service) SaveLensAnnotation(db *gorm.DB, id uint, input LensAnnotationInput) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if input.LensAnnotationImage != "" {
		a.LensAnnotationImage = input.LensAnnotationImage
	}
	if len(input.LensAnnotationPaths) > 0 {
		a.LensAnnotationPaths = string(input.LensAnnotationPaths)
	}

	if err := s.repo.Update(db, a); err != nil {
		return nil, err
	}

	s.logger.Info("lens annotation saved",
		zap.Uint("appointment_id", id),
	)
	return s.repo.GetByID(db, a.ID)
}
