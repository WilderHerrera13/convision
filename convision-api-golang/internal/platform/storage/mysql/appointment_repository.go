package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// appointmentFilterAllowlist prevents SQL injection via column name injection.
var appointmentFilterAllowlist = map[string]bool{
	"status":       true,
	"patient_id":   true,
	"specialist_id": true,
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
		"sale_id":                   a.SaleID,
		"left_eye_annotation_paths":  a.LeftEyeAnnotationPaths,
		"right_eye_annotation_paths": a.RightEyeAnnotationPaths,
		"lens_annotation_paths":     a.LensAnnotationPaths,
	}).Error
}

func (r *AppointmentRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Appointment{}, id).Error
}

func (r *AppointmentRepository) List(filters map[string]any, page, perPage int) ([]*domain.Appointment, int64, error) {
	var appointments []*domain.Appointment
	var total int64

	q := r.db.Model(&domain.Appointment{})
	for field, value := range filters {
		if !appointmentFilterAllowlist[field] {
			continue
		}
		q = q.Where("appointments."+field+" = ?", value)
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
