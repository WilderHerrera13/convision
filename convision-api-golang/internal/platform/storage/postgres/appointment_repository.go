package postgres

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// appointmentFilterAllowlist prevents SQL injection via column name injection.
var appointmentFilterAllowlist = map[string]bool{
	"status":            true,
	"patient_id":        true,
	"specialist_id":     true,
	"taken_by_id":       true,
	"consultation_type": true,
}

// AppointmentRepository is the PostgreSQL-backed implementation of domain.AppointmentRepository.
type AppointmentRepository struct {
	db *gorm.DB
}

// NewAppointmentRepository creates a new AppointmentRepository.
func NewAppointmentRepository(db *gorm.DB) *AppointmentRepository {
	return &AppointmentRepository{db: db}
}

func (r *AppointmentRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Patient").
		Preload("Specialist").
		Preload("Receptionist").
		Preload("TakenBy").
		Preload("Prescription")
}

func (r *AppointmentRepository) GetByID(id uint) (*domain.Appointment, error) {
	var a domain.Appointment
	err := r.withRelations(r.db).First(&a, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "appointment"}
		}
		return nil, err
	}
	return &a, nil
}

func (r *AppointmentRepository) GetByPatientID(patientID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	return r.List(map[string]any{"patient_id": patientID}, page, perPage)
}

func (r *AppointmentRepository) GetBySpecialistID(specialistID uint, page, perPage int) ([]*domain.Appointment, int64, error) {
	return r.List(map[string]any{"specialist_id": specialistID}, page, perPage)
}

func (r *AppointmentRepository) Create(a *domain.Appointment) error {
	return r.db.Create(a).Error
}

func (r *AppointmentRepository) Update(a *domain.Appointment) error {
	return r.db.Model(a).Updates(map[string]any{
		"patient_id":                a.PatientID,
		"specialist_id":             a.SpecialistID,
		"receptionist_id":           a.ReceptionistID,
		"taken_by_id":               a.TakenByID,
		"scheduled_at":              a.ScheduledAt,
		"status":                    a.Status,
		"notes":                     a.Notes,
		"reason":                    a.Reason,
		"is_billed":                 a.IsBilled,
		"billed_at":                 a.BilledAt,
		"sale_id":                   a.SaleID,
		"left_eye_annotation_paths":  a.LeftEyeAnnotationPaths,
		"right_eye_annotation_paths": a.RightEyeAnnotationPaths,
		"lens_annotation_paths":     a.LensAnnotationPaths,
	}).Error
}

func (r *AppointmentRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Appointment{}, id).Error
}

// ExistsByPatientAndDate checks whether an appointment already exists for the
// same patient, same specialist, and same calendar day. Used by the bulk
// importer to skip duplicate rows.
func (r *AppointmentRepository) ExistsByPatientAndDate(patientID uint, specialistID *uint, date time.Time) (bool, error) {
	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	q := r.db.Model(&domain.Appointment{}).
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
func (r *AppointmentRepository) SaveManagementReport(id uint, consultationType, reportNotes string) error {
	res := r.db.Model(&domain.Appointment{}).
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
func (r *AppointmentRepository) GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*domain.SpecialistReportSummary, error) {
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
	if err := r.db.Raw(rawSQL, args...).Scan(&rows).Error; err != nil {
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

// GetActiveBySpecialist returns the single in-progress appointment for the given specialist.
// Returns ErrNotFound if no active appointment exists.
func (r *AppointmentRepository) GetActiveBySpecialist(specialistID uint) (*domain.Appointment, error) {
	var a domain.Appointment
	err := r.withRelations(r.db).
		Where("specialist_id = ? AND status = ?", specialistID, domain.AppointmentStatusInProgress).
		First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "appointment"}
		}
		return nil, err
	}
	return &a, nil
}

func (r *AppointmentRepository) List(filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	var appointments []*domain.Appointment
	var total int64

	q := r.db.Model(&domain.Appointment{})
	needsPatientJoin := false
	for field, value := range filters {
		switch field {
		case "_start_date":
			// When filtering by date range, only include rows that have a scheduled_at value.
			q = q.Where("appointments.scheduled_at IS NOT NULL AND appointments.scheduled_at >= ?", value)
		case "_end_date":
			q = q.Where("appointments.scheduled_at IS NOT NULL AND appointments.scheduled_at <= ?", value.(string)+" 23:59:59")
		case "_patient_search":
			needsPatientJoin = true
			like := "%" + value.(string) + "%"
			q = q.Where(
				"patients.first_name ILIKE ? OR patients.last_name ILIKE ? OR patients.identification ILIKE ?",
				like, like, like,
			)
		case "_attended_by":
			// Appointments handled by a given specialist — either assigned or taken.
			q = q.Where(
				"(appointments.specialist_id = ? OR appointments.taken_by_id = ?)",
				value, value,
			)
		default:
			if !appointmentFilterAllowlist[field] {
				continue
			}
			q = q.Where("appointments."+field+" = ?", value)
		}
	}
	if needsPatientJoin {
		q = q.Joins("LEFT JOIN patients ON patients.id = appointments.patient_id")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("appointments.id desc").
		Find(&appointments).Error
	if err != nil {
		return nil, 0, err
	}

	return appointments, total, nil
}
