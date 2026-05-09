package postgres

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/clock"
)

// AppointmentRepository is the PostgreSQL-backed implementation of domain.AppointmentRepository.
type AppointmentRepository struct{}

// NewAppointmentRepository creates a new AppointmentRepository.
func NewAppointmentRepository() *AppointmentRepository {
	return &AppointmentRepository{}
}

func (r *AppointmentRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Branch").
		Preload("Patient").
		Preload("Specialist").
		Preload("Receptionist").
		Preload("TakenBy").
		Preload("Prescription")
}

func (r *AppointmentRepository) GetByID(db *gorm.DB, id uint) (*domain.Appointment, error) {
	var a domain.Appointment
	err := r.withRelations(db).First(&a, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "appointment"}
		}
		return nil, err
	}
	return &a, nil
}

func (r *AppointmentRepository) GetByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	pid := patientID
	return r.List(db, domain.AppointmentFilter{
		Pagination: domain.Pagination{Page: page, PerPage: perPage},
		PatientID:  &pid,
	})
}

func (r *AppointmentRepository) GetBySpecialistID(db *gorm.DB, specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	sid := specialistID
	return r.List(db, domain.AppointmentFilter{
		Pagination:   domain.Pagination{Page: page, PerPage: perPage},
		SpecialistID: &sid,
	})
}

func (r *AppointmentRepository) Create(db *gorm.DB, a *domain.Appointment) error {
	return db.Create(a).Error
}

func (r *AppointmentRepository) Update(db *gorm.DB, a *domain.Appointment) error {
	return db.Model(a).Updates(map[string]any{
		"patient_id":                 a.PatientID,
		"specialist_id":              a.SpecialistID,
		"receptionist_id":            a.ReceptionistID,
		"taken_by_id":                a.TakenByID,
		"scheduled_at":               a.ScheduledAt,
		"status":                     a.Status,
		"notes":                      a.Notes,
		"reason":                     a.Reason,
		"is_billed":                  a.IsBilled,
		"billed_at":                  a.BilledAt,
		"sale_id":                    a.SaleID,
		"left_eye_annotation_paths":  a.LeftEyeAnnotationPaths,
		"right_eye_annotation_paths": a.RightEyeAnnotationPaths,
		"lens_annotation_image":      a.LensAnnotationImage,
		"lens_annotation_paths":      a.LensAnnotationPaths,
	}).Error
}

func (r *AppointmentRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Appointment{}, id).Error
}

// ExistsByPatientAndDate checks whether an appointment already exists for the
// same patient, same specialist, and same calendar day. Used by the bulk
// importer to skip duplicate rows.
func (r *AppointmentRepository) ExistsByPatientAndDate(db *gorm.DB, patientID uint, specialistID *uint, date time.Time) (bool, error) {
	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	q := db.Model(&domain.Appointment{}).
		Where("patient_id = ? AND scheduled_at >= ? AND scheduled_at < ?", patientID, dayStart, dayEnd)

	if specialistID != nil {
		q = q.Where("specialist_id = ?", *specialistID)
	} else {
		q = q.Where("specialist_id IS NULL")
	}

	var count int64
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// SaveManagementReport updates only the specialist-report columns on an
// appointment. Intentionally scoped to keep other columns untouched.
func (r *AppointmentRepository) SaveManagementReport(db *gorm.DB, id uint, consultationType, reportNotes string) error {
	res := db.Model(&domain.Appointment{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"consultation_type": consultationType,
			"report_notes":      reportNotes,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return &domain.ErrNotFound{Resource: "appointment"}
	}
	return nil
}

// GetConsolidatedReport returns per-specialist aggregated consultation counts
// for the given date range. specialistIDs restricts results to those IDs when
// non-empty; pass nil/empty for all specialists.
func (r *AppointmentRepository) GetConsolidatedReport(db *gorm.DB, from, to string, specialistIDs []uint, branchID *uint) ([]*domain.SpecialistReportSummary, error) {
	type row struct {
		SpecialistID     uint   `gorm:"column:specialist_id"`
		SpecialistName   string `gorm:"column:specialist_name"`
		Effective        int64  `gorm:"column:effective"`
		FormulaSale      int64  `gorm:"column:formula_sale"`
		Ineffective      int64  `gorm:"column:ineffective"`
		FollowUp         int64  `gorm:"column:follow_up"`
		WarrantyFollowUp int64  `gorm:"column:warranty_follow_up"`
		Total            int64  `gorm:"column:total"`
		Observation      string `gorm:"column:observation"`
	}

	conditions := []string{
		"a.consultation_type IS NOT NULL",
		"a.consultation_type != ''",
	}
	args := []any{}

	if from != "" {
		conditions = append(conditions, "a.scheduled_at >= ?")
		args = append(args, from)
	}
	if to != "" {
		conditions = append(conditions, "a.scheduled_at <= ?")
		args = append(args, to+" 23:59:59")
	}
	if len(specialistIDs) > 0 {
		conditions = append(conditions, "COALESCE(a.taken_by_id, a.specialist_id) IN ?")
		args = append(args, specialistIDs)
	}
	if branchID != nil && *branchID != 0 {
		conditions = append(conditions, "a.branch_id = ?")
		args = append(args, *branchID)
	}

	where := strings.Join(conditions, " AND ")
	rawSQL := `
		SELECT
			COALESCE(a.taken_by_id, a.specialist_id) AS specialist_id,
			(u.name || ' ' || u.last_name) AS specialist_name,
			COUNT(CASE WHEN a.consultation_type = 'effective'          THEN 1 END) AS effective,
			COUNT(CASE WHEN a.consultation_type = 'formula_sale'       THEN 1 END) AS formula_sale,
			COUNT(CASE WHEN a.consultation_type = 'ineffective'        THEN 1 END) AS ineffective,
			COUNT(CASE WHEN a.consultation_type = 'follow_up'          THEN 1 END) AS follow_up,
			COUNT(CASE WHEN a.consultation_type = 'warranty_follow_up' THEN 1 END) AS warranty_follow_up,
			COUNT(*) AS total,
			STRING_AGG(
				CASE WHEN a.report_notes IS NOT NULL AND a.report_notes != ''
				     THEN a.report_notes END,
				' | '
			) AS observation
		FROM appointments a
		JOIN users u ON u.id = COALESCE(a.taken_by_id, a.specialist_id)
		WHERE ` + where + `
		GROUP BY COALESCE(a.taken_by_id, a.specialist_id), u.name, u.last_name
		ORDER BY u.name, u.last_name`

	var rows []row
	if err := db.Raw(rawSQL, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]*domain.SpecialistReportSummary, len(rows))
	for i, rw := range rows {
		result[i] = &domain.SpecialistReportSummary{
			SpecialistID:     rw.SpecialistID,
			SpecialistName:   rw.SpecialistName,
			Effective:        rw.Effective,
			FormulaSale:      rw.FormulaSale,
			Ineffective:      rw.Ineffective,
			FollowUp:         rw.FollowUp,
			WarrantyFollowUp: rw.WarrantyFollowUp,
			Total:            rw.Total,
			Observation:      rw.Observation,
		}
	}
	return result, nil
}

// HasConflictForSpecialist checks whether a specialist already has a non-cancelled
// appointment within durationMins of the proposed scheduledAt.
// excludeID allows skipping the appointment being updated (pass 0 when creating).
func (r *AppointmentRepository) HasConflictForSpecialist(
	db *gorm.DB,
	specialistID uint,
	scheduledAt time.Time,
	excludeID uint,
	durationMins int,
) (bool, error) {
	window := time.Duration(durationMins) * time.Minute
	from := scheduledAt.Add(-window + time.Minute)
	to := scheduledAt.Add(window - time.Minute)

	q := db.Model(&domain.Appointment{}).
		Where("specialist_id = ?", specialistID).
		Where("status NOT IN ?", []string{"cancelled", "completed"}).
		Where("scheduled_at IS NOT NULL").
		Where("scheduled_at BETWEEN ? AND ?", from, to)

	if excludeID > 0 {
		q = q.Where("id != ?", excludeID)
	}

	var count int64
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetBookedTimesForSpecialist returns HH:MM strings (clinic timezone) of all
// booked (non-cancelled) appointments for a given specialist on the given
// calendar day. Day boundaries are computed in the clinic timezone so an
// appointment at 21:00 Bogotá lands in the same calendar bucket the receptionist
// picked, not in the next UTC day.
func (r *AppointmentRepository) GetBookedTimesForSpecialist(db *gorm.DB, specialistID uint, date time.Time) ([]string, error) {
	loc := clock.Location()
	d := date.In(loc)
	dayStart := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, loc)
	dayEnd := dayStart.Add(24 * time.Hour)

	var appointments []*domain.Appointment
	err := db.Model(&domain.Appointment{}).
		Select("scheduled_at").
		Where("specialist_id = ?", specialistID).
		Where("status NOT IN ?", []string{"cancelled"}).
		Where("scheduled_at IS NOT NULL").
		Where("scheduled_at >= ? AND scheduled_at < ?", dayStart, dayEnd).
		Find(&appointments).Error
	if err != nil {
		return nil, err
	}

	times := make([]string, 0, len(appointments))
	for _, a := range appointments {
		if a.ScheduledAt != nil {
			times = append(times, a.ScheduledAt.In(loc).Format("15:04"))
		}
	}
	return times, nil
}

// GetActiveBySpecialist returns the single in-progress appointment for the given specialist.
// Returns ErrNotFound if no active appointment exists.
func (r *AppointmentRepository) GetActiveBySpecialist(db *gorm.DB, specialistID uint) (*domain.Appointment, error) {
	var a domain.Appointment
	err := r.withRelations(db).
		Where("taken_by_id = ? AND status = ?", specialistID, domain.AppointmentStatusInProgress).
		First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "appointment"}
		}
		return nil, err
	}
	return &a, nil
}

func (r *AppointmentRepository) List(db *gorm.DB, f domain.AppointmentFilter) ([]*domain.Appointment, int64, error) {
	f.Clamp()
	var appointments []*domain.Appointment
	var total int64

	q := db.Model(&domain.Appointment{})

	if f.BranchID != nil {
		q = q.Where("appointments.branch_id = ?", *f.BranchID)
	}
	if f.Status != "" {
		q = q.Where("appointments.status = ?", f.Status)
	}
	if f.SpecialistID != nil {
		q = q.Where("appointments.specialist_id = ?", *f.SpecialistID)
	}
	if f.PatientID != nil {
		q = q.Where("appointments.patient_id = ?", *f.PatientID)
	}
	if f.TakenByID != nil {
		q = q.Where("appointments.taken_by_id = ?", *f.TakenByID)
	}
	if f.ConsultationType != "" {
		q = q.Where("appointments.consultation_type = ?", f.ConsultationType)
	}

	// StartDate maps to legacy _start_date — only rows with a scheduled_at value.
	if f.StartDate != "" {
		q = q.Where("appointments.scheduled_at IS NOT NULL AND appointments.scheduled_at >= ?", f.StartDate)
	}
	// EndDate maps to legacy _end_date — inclusive end-of-day.
	if f.EndDate != "" {
		q = q.Where("appointments.scheduled_at IS NOT NULL AND appointments.scheduled_at <= ?", f.EndDate+" 23:59:59")
	}
	// PatientSearch maps to legacy _patient_search — JOIN patients ILIKE.
	if f.PatientSearch != "" {
		like := "%" + f.PatientSearch + "%"
		q = q.Joins("LEFT JOIN patients ON patients.id = appointments.patient_id").
			Where(
				"patients.first_name ILIKE ? OR patients.last_name ILIKE ? OR patients.identification ILIKE ?",
				like, like, like,
			)
	}
	// AttendedBy maps to legacy _attended_by — assigned OR taken.
	if f.AttendedBy != nil {
		q = q.Where(
			"(appointments.specialist_id = ? OR appointments.taken_by_id = ?)",
			*f.AttendedBy, *f.AttendedBy,
		)
	}
	// PendingReport maps to legacy _pending_report.
	if f.PendingReport {
		q = q.Where("(appointments.consultation_type IS NULL OR appointments.consultation_type = '')")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("appointments.id desc").
		Find(&appointments).Error
	if err != nil {
		return nil, 0, err
	}

	return appointments, total, nil
}
