package appointment

import (
	"encoding/json"
	"math"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
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
	BranchID          uint            `json:"branch_id"`
	PatientID         uint            `json:"patient_id"          binding:"required"`
	SpecialistID      *uint           `json:"specialist_id"`
	ScheduledAt       string          `json:"scheduled_at"`
	Date              string          `json:"date"`
	Time              string          `json:"time"`
	Notes             string          `json:"notes"`
	Reason            string          `json:"reason"`
	AppointmentTypeID *uint           `json:"appointment_type_id"`
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

func parseScheduledAt(scheduledAt, date, timeStr string) *time.Time {
	if scheduledAt != "" {
		for _, layout := range []string{
			"2006-01-02 15:04:05",
			"2006-01-02 15:04",
			"2006-01-02T15:04:05Z07:00",
			time.RFC3339,
		} {
			if t, err := time.Parse(layout, scheduledAt); err == nil {
				return &t
			}
		}
	}
	if date != "" && timeStr != "" {
		for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02 15:04"} {
			if t, err := time.Parse(layout, date+" "+timeStr); err == nil {
				return &t
			}
		}
	}
	return nil
}

// List returns a paginated list of appointments, optionally filtered.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}

	return &ListOutput{
		Data:        data,
		Total:       total,
		CurrentPage: page,
		PerPage:     perPage,
		LastPage:    lastPage,
	}, nil
}

// GetByID returns a single appointment (with relations) or ErrNotFound.
func (s *Service) GetByID(id uint) (*domain.Appointment, error) {
	return s.repo.GetByID(id)
}

const defaultAppointmentDurationMins = 30

// Create adds a new appointment after checking for specialist scheduling conflicts.
func (s *Service) Create(input CreateInput, receptionistID uint) (*domain.Appointment, error) {
	scheduledAt := parseScheduledAt(input.ScheduledAt, input.Date, input.Time)

	if scheduledAt != nil && input.SpecialistID != nil {
		conflict, err := s.repo.HasConflictForSpecialist(*input.SpecialistID, *scheduledAt, 0, defaultAppointmentDurationMins)
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
	}

	if err := s.repo.Create(a); err != nil {
		return nil, err
	}

	s.logger.Info("appointment created", zap.Uint("appointment_id", a.ID))
	return s.repo.GetByID(a.ID)
}

// Update modifies an existing appointment's mutable fields, checking for scheduling conflicts.
func (s *Service) Update(id uint, input UpdateInput) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(id)
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

	if a.ScheduledAt != nil && a.SpecialistID != nil &&
		input.Status == "" || (input.Status != "cancelled" && input.Status != "completed") {
		conflict, cerr := s.repo.HasConflictForSpecialist(*a.SpecialistID, *a.ScheduledAt, id, defaultAppointmentDurationMins)
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

	if err := s.repo.Update(a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(a.ID)
}

// GetBookedSlots returns the list of HH:MM times already booked for a specialist on a given date.
func (s *Service) GetBookedSlots(specialistID uint, date time.Time) ([]string, error) {
	return s.repo.GetBookedTimesForSpecialist(specialistID, date)
}

// Delete removes an appointment.
func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

// Take sets appointment to in_progress and assigns taken_by.
func (s *Service) Take(id uint, specialistID uint) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	a.Status = domain.AppointmentStatusInProgress
	a.TakenByID = &specialistID

	if err := s.repo.Update(a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(a.ID)
}

// Pause sets appointment to paused (must be in_progress).
func (s *Service) Pause(id uint) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if a.Status != domain.AppointmentStatusInProgress {
		return nil, &domain.ErrValidation{Field: "status", Message: "appointment is not in progress"}
	}

	a.Status = domain.AppointmentStatusPaused
	if err := s.repo.Update(a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(a.ID)
}

// Resume sets appointment to in_progress (must be paused).
func (s *Service) Resume(id uint) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if a.Status != domain.AppointmentStatusPaused {
		return nil, &domain.ErrValidation{Field: "status", Message: "appointment is not paused"}
	}

	a.Status = domain.AppointmentStatusInProgress
	if err := s.repo.Update(a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(a.ID)
}

// ListManagementReport returns a page of appointments filtered to those
// handled by the given specialist (either assigned or taken). When
// specialistID is 0 no attended-by constraint is applied (admin view).
// When pendingReport is true only appointments without a saved report are returned.
func (s *Service) ListManagementReport(
	specialistID uint,
	search, startDate, endDate, status, consultationType string,
	pendingReport bool,
	page, perPage int,
) (*ListOutput, error) {
	filters := make(map[string]any)
	if specialistID != 0 {
		filters["_attended_by"] = specialistID
	}
	if s := search; s != "" {
		filters["_patient_search"] = s
	}
	if startDate != "" {
		filters["_start_date"] = startDate
	}
	if endDate != "" {
		filters["_end_date"] = endDate
	}
	if status != "" {
		filters["status"] = status
	}
	if consultationType != "" {
		filters["consultation_type"] = consultationType
	}
	if pendingReport {
		filters["_pending_report"] = true
	}
	return s.List(filters, page, perPage)
}

// GetConsolidatedReport returns per-specialist aggregated consultation counts
// for the given date range. specialistIDs restricts to those IDs when non-empty.
func (s *Service) GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*domain.SpecialistReportSummary, error) {
	return s.repo.GetConsolidatedReport(from, to, specialistIDs)
}

// SaveManagementReport validates the report input and persists the
// consultation_type + report_notes columns on the target appointment.
func (s *Service) SaveManagementReport(id uint, input ManagementReportInput) (*domain.Appointment, error) {
	if !domain.IsValidConsultationType(input.ConsultationType) {
		return nil, &domain.ErrValidation{
			Field:   "consultation_type",
			Message: "valor no válido",
		}
	}
	if _, err := s.repo.GetByID(id); err != nil {
		return nil, err
	}
	if err := s.repo.SaveManagementReport(id, input.ConsultationType, input.ReportNotes); err != nil {
		return nil, err
	}
	s.logger.Info("management report saved",
		zap.Uint("appointment_id", id),
		zap.String("consultation_type", input.ConsultationType),
	)
	return s.repo.GetByID(id)
}

// SaveAnnotations updates annotation paths/notes on an appointment.
func (s *Service) SaveAnnotations(id uint, input AnnotationsInput) (*domain.Appointment, error) {
	a, err := s.repo.GetByID(id)
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

	if err := s.repo.Update(a); err != nil {
		return nil, err
	}
	return s.repo.GetByID(a.ID)
}
