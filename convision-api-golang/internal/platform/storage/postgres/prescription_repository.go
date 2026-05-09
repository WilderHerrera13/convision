package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// PrescriptionRepository is the PostgreSQL-backed implementation of domain.PrescriptionRepository.
type PrescriptionRepository struct{}

// NewPrescriptionRepository creates a new PrescriptionRepository.
func NewPrescriptionRepository() *PrescriptionRepository {
	return &PrescriptionRepository{}
}

func (r *PrescriptionRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.Preload("Appointment").
		Preload("Appointment.Patient").
		Preload("Appointment.Specialist")
}

func (r *PrescriptionRepository) GetByID(db *gorm.DB, id uint) (*domain.Prescription, error) {
	var p domain.Prescription
	err := r.withRelations(db).First(&p, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "prescription"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PrescriptionRepository) GetByAppointmentID(db *gorm.DB, appointmentID uint) (*domain.Prescription, error) {
	var p domain.Prescription
	err := r.withRelations(db).Where("appointment_id = ?", appointmentID).First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "prescription"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PrescriptionRepository) List(db *gorm.DB, f domain.PrescriptionListFilter) ([]*domain.Prescription, int64, error) {
	f.Clamp()
	q := db.Model(&domain.Prescription{})
	if f.AppointmentID != nil {
		q = q.Where("appointment_id = ?", *f.AppointmentID)
	}
	if f.PatientID != nil {
		// Prescription has no patient_id column; resolve via appointments.
		apptSubquery := db.Table("appointments").Select("id").Where("patient_id = ?", *f.PatientID)
		q = q.Where("appointment_id IN (?)", apptSubquery)
	}
	if f.CorrectionType != "" {
		q = q.Where("correction_type = ?", f.CorrectionType)
	}
	if f.UsageType != "" {
		q = q.Where("usage_type = ?", f.UsageType)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var prescriptions []*domain.Prescription
	err := r.withRelations(q).
		Order("appointment_prescriptions.created_at DESC").
		Limit(f.PerPage).Offset(f.Offset()).
		Find(&prescriptions).Error
	return prescriptions, total, err
}

func (r *PrescriptionRepository) ListByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.Prescription, int64, error) {
	apptSubquery := db.Table("appointments").Select("id").Where("patient_id = ?", patientID)
	q := db.Model(&domain.Prescription{}).Where("appointment_id IN (?)", apptSubquery)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var prescriptions []*domain.Prescription
	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Order("appointment_prescriptions.created_at DESC").
		Limit(perPage).Offset(offset).
		Find(&prescriptions).Error
	return prescriptions, total, err
}

func (r *PrescriptionRepository) Create(db *gorm.DB, p *domain.Prescription) error {
	return db.Create(p).Error
}

func (r *PrescriptionRepository) Update(db *gorm.DB, p *domain.Prescription) error {
	return db.Model(p).Updates(map[string]any{
		"appointment_id":           p.AppointmentID,
		"date":                     p.Date,
		"document":                 p.Document,
		"patient_name":             p.PatientName,
		"right_sphere":             p.RightSphere,
		"right_cylinder":           p.RightCylinder,
		"right_axis":               p.RightAxis,
		"right_addition":           p.RightAddition,
		"right_height":             p.RightHeight,
		"right_distance_p":         p.RightDistanceP,
		"right_visual_acuity_far":  p.RightVisualAcuityFar,
		"right_visual_acuity_near": p.RightVisualAcuityNear,
		"left_sphere":              p.LeftSphere,
		"left_cylinder":            p.LeftCylinder,
		"left_axis":                p.LeftAxis,
		"left_addition":            p.LeftAddition,
		"left_height":              p.LeftHeight,
		"left_distance_p":          p.LeftDistanceP,
		"left_visual_acuity_far":   p.LeftVisualAcuityFar,
		"left_visual_acuity_near":  p.LeftVisualAcuityNear,
		"correction_type":          p.CorrectionType,
		"usage_type":               p.UsageType,
		"recommendation":           p.Recommendation,
		"professional":             p.Professional,
		"observation":              p.Observation,
		"attachment":               p.Attachment,
		"annotation_paths":         p.AnnotationPaths,
	}).Error
}

func (r *PrescriptionRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Prescription{}, id).Error
}
