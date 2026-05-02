package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ClinicalHistoryRepository is the PostgreSQL-backed implementation of domain.ClinicalHistoryRepository.
type ClinicalHistoryRepository struct{}

// NewClinicalHistoryRepository creates a new ClinicalHistoryRepository.
func NewClinicalHistoryRepository() *ClinicalHistoryRepository {
	return &ClinicalHistoryRepository{}
}

func (r *ClinicalHistoryRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Patient").
		Preload("Creator").
		Preload("Updater")
}

func (r *ClinicalHistoryRepository) withEvolutions(q *gorm.DB) *gorm.DB {
	return r.withRelations(q).
		Preload("Evolutions").
		Preload("Evolutions.Creator").
		Preload("Evolutions.Updater")
}

func (r *ClinicalHistoryRepository) GetByID(db *gorm.DB, id uint) (*domain.ClinicalHistory, error) {
	var h domain.ClinicalHistory
	err := r.withEvolutions(db).First(&h, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "clinical_history"}
		}
		return nil, err
	}
	return &h, nil
}

func (r *ClinicalHistoryRepository) GetByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	q := db.Model(&domain.ClinicalHistory{}).Where("patient_id = ?", patientID)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var histories []*domain.ClinicalHistory
	offset := (page - 1) * perPage
	err := r.withRelations(q).Order("created_at DESC").Limit(perPage).Offset(offset).Find(&histories).Error
	return histories, total, err
}

func (r *ClinicalHistoryRepository) GetSingleByPatientID(db *gorm.DB, patientID uint) (*domain.ClinicalHistory, error) {
	var h domain.ClinicalHistory
	err := r.withEvolutions(db).Where("patient_id = ?", patientID).First(&h).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "clinical_history"}
		}
		return nil, err
	}
	return &h, nil
}

func (r *ClinicalHistoryRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	allowedFilters := map[string]bool{"patient_id": true, "created_by": true}

	q := db.Model(&domain.ClinicalHistory{})
	for k, v := range filters {
		if allowedFilters[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var histories []*domain.ClinicalHistory
	offset := (page - 1) * perPage
	err := r.withRelations(q).Order("created_at DESC").Limit(perPage).Offset(offset).Find(&histories).Error
	return histories, total, err
}

func (r *ClinicalHistoryRepository) Create(db *gorm.DB, h *domain.ClinicalHistory) error {
	return db.Create(h).Error
}

func (r *ClinicalHistoryRepository) Update(db *gorm.DB, h *domain.ClinicalHistory) error {
	return db.Model(h).Updates(map[string]any{
		"updated_by":                         h.UpdatedBy,
		"reason_for_consultation":            h.ReasonForConsultation,
		"current_illness":                    h.CurrentIllness,
		"personal_history":                   h.PersonalHistory,
		"family_history":                     h.FamilyHistory,
		"occupational_history":               h.OccupationalHistory,
		"uses_optical_correction":            h.UsesOpticalCorrection,
		"optical_correction_type":            h.OpticalCorrectionType,
		"last_control_detail":                h.LastControlDetail,
		"ophthalmological_diagnosis":         h.OphthalmologicalDiagnosis,
		"eye_surgery":                        h.EyeSurgery,
		"has_systemic_disease":               h.HasSystemicDisease,
		"systemic_disease_detail":            h.SystemicDiseaseDetail,
		"medications":                        h.Medications,
		"allergies":                          h.Allergies,
		"right_far_vision_no_correction":     h.RightFarVisionNoCorrection,
		"left_far_vision_no_correction":      h.LeftFarVisionNoCorrection,
		"right_near_vision_no_correction":    h.RightNearVisionNoCorrection,
		"left_near_vision_no_correction":     h.LeftNearVisionNoCorrection,
		"right_far_vision_with_correction":   h.RightFarVisionWithCorrection,
		"left_far_vision_with_correction":    h.LeftFarVisionWithCorrection,
		"right_near_vision_with_correction":  h.RightNearVisionWithCorrection,
		"left_near_vision_with_correction":   h.LeftNearVisionWithCorrection,
		"right_eye_external_exam":            h.RightEyeExternalExam,
		"left_eye_external_exam":             h.LeftEyeExternalExam,
		"right_eye_ophthalmoscopy":           h.RightEyeOphthalmoscopy,
		"left_eye_ophthalmoscopy":            h.LeftEyeOphthalmoscopy,
		"right_eye_horizontal_k":             h.RightEyeHorizontalK,
		"right_eye_vertical_k":               h.RightEyeVerticalK,
		"left_eye_horizontal_k":              h.LeftEyeHorizontalK,
		"left_eye_vertical_k":                h.LeftEyeVerticalK,
		"refraction_technique":               h.RefractionTechnique,
		"right_eye_static_sphere":            h.RightEyeStaticSphere,
		"right_eye_static_cylinder":          h.RightEyeStaticCylinder,
		"right_eye_static_axis":              h.RightEyeStaticAxis,
		"right_eye_static_visual_acuity":     h.RightEyeStaticVisualAcuity,
		"left_eye_static_sphere":             h.LeftEyeStaticSphere,
		"left_eye_static_cylinder":           h.LeftEyeStaticCylinder,
		"left_eye_static_axis":               h.LeftEyeStaticAxis,
		"left_eye_static_visual_acuity":      h.LeftEyeStaticVisualAcuity,
		"right_eye_subjective_sphere":        h.RightEyeSubjectiveSphere,
		"right_eye_subjective_cylinder":      h.RightEyeSubjectiveCylinder,
		"right_eye_subjective_axis":          h.RightEyeSubjectiveAxis,
		"right_eye_subjective_visual_acuity": h.RightEyeSubjectiveVisualAcuity,
		"left_eye_subjective_sphere":         h.LeftEyeSubjectiveSphere,
		"left_eye_subjective_cylinder":       h.LeftEyeSubjectiveCylinder,
		"left_eye_subjective_axis":           h.LeftEyeSubjectiveAxis,
		"left_eye_subjective_visual_acuity":  h.LeftEyeSubjectiveVisualAcuity,
		"diagnostic":                         h.Diagnostic,
		"treatment_plan":                     h.TreatmentPlan,
		"observations":                       h.Observations,
	}).Error
}

func (r *ClinicalHistoryRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.ClinicalHistory{}, id).Error
}

// ClinicalEvolutionRepository is the PostgreSQL-backed implementation of domain.ClinicalEvolutionRepository.
type ClinicalEvolutionRepository struct{}

// NewClinicalEvolutionRepository creates a new ClinicalEvolutionRepository.
func NewClinicalEvolutionRepository() *ClinicalEvolutionRepository {
	return &ClinicalEvolutionRepository{}
}

func (r *ClinicalEvolutionRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Creator").
		Preload("Updater").
		Preload("ClinicalHistory")
}

func (r *ClinicalEvolutionRepository) GetByID(db *gorm.DB, id uint) (*domain.ClinicalEvolution, error) {
	var e domain.ClinicalEvolution
	err := r.withRelations(db).First(&e, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "clinical_evolution"}
		}
		return nil, err
	}
	return &e, nil
}

func (r *ClinicalEvolutionRepository) GetByClinicalHistoryID(db *gorm.DB, historyID uint, page, perPage int) ([]*domain.ClinicalEvolution, int64, error) {
	q := db.Model(&domain.ClinicalEvolution{}).Where("clinical_history_id = ?", historyID)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var evolutions []*domain.ClinicalEvolution
	offset := (page - 1) * perPage
	err := r.withRelations(q).Order("created_at DESC").Limit(perPage).Offset(offset).Find(&evolutions).Error
	return evolutions, total, err
}

func (r *ClinicalEvolutionRepository) Create(db *gorm.DB, e *domain.ClinicalEvolution) error {
	return db.Create(e).Error
}

func (r *ClinicalEvolutionRepository) Update(db *gorm.DB, e *domain.ClinicalEvolution) error {
	return db.Model(e).Updates(map[string]any{
		"updated_by":              e.UpdatedBy,
		"appointment_id":          e.AppointmentID,
		"evolution_date":          e.EvolutionDate,
		"subjective":              e.Subjective,
		"objective":               e.Objective,
		"assessment":              e.Assessment,
		"plan":                    e.Plan,
		"recommendations":         e.Recommendations,
		"right_far_vision":        e.RightFarVision,
		"left_far_vision":         e.LeftFarVision,
		"right_near_vision":       e.RightNearVision,
		"left_near_vision":        e.LeftNearVision,
		"right_eye_sphere":        e.RightEyeSphere,
		"right_eye_cylinder":      e.RightEyeCylinder,
		"right_eye_axis":          e.RightEyeAxis,
		"right_eye_visual_acuity": e.RightEyeVisualAcuity,
		"left_eye_sphere":         e.LeftEyeSphere,
		"left_eye_cylinder":       e.LeftEyeCylinder,
		"left_eye_axis":           e.LeftEyeAxis,
		"left_eye_visual_acuity":  e.LeftEyeVisualAcuity,
	}).Error
}

func (r *ClinicalEvolutionRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.ClinicalEvolution{}, id).Error
}
