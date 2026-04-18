package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// prescriptionFilterAllowlist prevents SQL injection via column name injection.
var prescriptionFilterAllowlist = map[string]bool{
	"appointment_id": true,
	"correction_type": true,
	"usage_type":    true,
}

// PrescriptionRepository is the PostgreSQL-backed implementation of domain.PrescriptionRepository.
type PrescriptionRepository struct {
	db *gorm.DB
}

// NewPrescriptionRepository creates a new PrescriptionRepository.
func NewPrescriptionRepository(db *gorm.DB) *PrescriptionRepository {
	return &PrescriptionRepository{db: db}
}

func (r *PrescriptionRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.Preload("Appointment").
		Preload("Appointment.Patient").
		Preload("Appointment.Specialist")
}

func (r *PrescriptionRepository) GetByID(id uint) (*domain.Prescription, error) {
	var p domain.Prescription
	err := r.withRelations(r.db).First(&p, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "prescription"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PrescriptionRepository) GetByAppointmentID(appointmentID uint) (*domain.Prescription, error) {
	var p domain.Prescription
	err := r.withRelations(r.db).Where("appointment_id = ?", appointmentID).First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "prescription"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PrescriptionRepository) List(filters map[string]any, page, perPage int) ([]*domain.Prescription, int64, error) {
	q := r.db.Model(&domain.Prescription{})
	for k, v := range filters {
		if prescriptionFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var prescriptions []*domain.Prescription
	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Select("prescriptions.id, prescriptions.appointment_id, prescriptions.date, prescriptions.document, "+
			"prescriptions.patient_name, prescriptions.right_sphere, prescriptions.right_cylinder, "+
			"prescriptions.right_axis, prescriptions.right_addition, prescriptions.right_height, "+
			"prescriptions.right_distance_p, prescriptions.right_visual_acuity_far, prescriptions.right_visual_acuity_near, "+
			"prescriptions.left_sphere, prescriptions.left_cylinder, prescriptions.left_axis, "+
			"prescriptions.left_addition, prescriptions.left_height, prescriptions.left_distance_p, "+
			"prescriptions.left_visual_acuity_far, prescriptions.left_visual_acuity_near, "+
			"prescriptions.correction_type, prescriptions.usage_type, prescriptions.recommendation, "+
			"prescriptions.professional, prescriptions.observation, prescriptions.attachment, "+
			"prescriptions.annotation_paths, prescriptions.created_at, prescriptions.updated_at").
		Order("prescriptions.created_at DESC").
		Limit(perPage).Offset(offset).
		Find(&prescriptions).Error
	return prescriptions, total, err
}

func (r *PrescriptionRepository) ListByPatientID(patientID uint, page, perPage int) ([]*domain.Prescription, int64, error) {
	// Build base query for counting
	q := r.db.Model(&domain.Prescription{}).
		Joins("JOIN appointments ON appointments.id = prescriptions.appointment_id").
		Where("appointments.patient_id = ?", patientID)

	// Count total BEFORE applying select/preload
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Now apply relations and select for fetch
	var prescriptions []*domain.Prescription
	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Select("prescriptions.id, prescriptions.appointment_id, prescriptions.date, prescriptions.document, "+
			"prescriptions.patient_name, prescriptions.right_sphere, prescriptions.right_cylinder, "+
			"prescriptions.right_axis, prescriptions.right_addition, prescriptions.right_height, "+
			"prescriptions.right_distance_p, prescriptions.right_visual_acuity_far, prescriptions.right_visual_acuity_near, "+
			"prescriptions.left_sphere, prescriptions.left_cylinder, prescriptions.left_axis, "+
			"prescriptions.left_addition, prescriptions.left_height, prescriptions.left_distance_p, "+
			"prescriptions.left_visual_acuity_far, prescriptions.left_visual_acuity_near, "+
			"prescriptions.correction_type, prescriptions.usage_type, prescriptions.recommendation, "+
			"prescriptions.professional, prescriptions.observation, prescriptions.attachment, "+
			"prescriptions.annotation_paths, prescriptions.created_at, prescriptions.updated_at").
		Order("prescriptions.created_at DESC").
		Limit(perPage).Offset(offset).
		Find(&prescriptions).Error
	return prescriptions, total, err
}

func (r *PrescriptionRepository) Create(p *domain.Prescription) error {
	return r.db.Create(p).Error
}

func (r *PrescriptionRepository) Update(p *domain.Prescription) error {
	return r.db.Model(p).Updates(map[string]any{
		"appointment_id":         p.AppointmentID,
		"date":                   p.Date,
		"document":               p.Document,
		"patient_name":           p.PatientName,
		"right_sphere":           p.RightSphere,
		"right_cylinder":         p.RightCylinder,
		"right_axis":             p.RightAxis,
		"right_addition":         p.RightAddition,
		"right_height":           p.RightHeight,
		"right_distance_p":       p.RightDistanceP,
		"right_visual_acuity_far":  p.RightVisualAcuityFar,
		"right_visual_acuity_near": p.RightVisualAcuityNear,
		"left_sphere":            p.LeftSphere,
		"left_cylinder":          p.LeftCylinder,
		"left_axis":              p.LeftAxis,
		"left_addition":          p.LeftAddition,
		"left_height":            p.LeftHeight,
		"left_distance_p":        p.LeftDistanceP,
		"left_visual_acuity_far":  p.LeftVisualAcuityFar,
		"left_visual_acuity_near": p.LeftVisualAcuityNear,
		"correction_type":        p.CorrectionType,
		"usage_type":             p.UsageType,
		"recommendation":         p.Recommendation,
		"professional":           p.Professional,
		"observation":            p.Observation,
		"attachment":             p.Attachment,
		"annotation_paths":       p.AnnotationPaths,
	}).Error
}

func (r *PrescriptionRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Prescription{}, id).Error
}
