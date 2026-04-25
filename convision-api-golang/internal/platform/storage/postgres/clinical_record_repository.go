package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ClinicalRecordRepository is the PostgreSQL-backed implementation of domain.ClinicalRecordRepository.
type ClinicalRecordRepository struct {
	db *gorm.DB
}

// NewClinicalRecordRepository creates a new ClinicalRecordRepository.
func NewClinicalRecordRepository(db *gorm.DB) *ClinicalRecordRepository {
	return &ClinicalRecordRepository{db: db}
}

func (r *ClinicalRecordRepository) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	var rec domain.ClinicalRecord
	err := r.db.
		Preload("Anamnesis").
		Where("appointment_id = ?", appointmentID).
		First(&rec).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "clinical_record"}
		}
		return nil, err
	}
	return &rec, nil
}

func (r *ClinicalRecordRepository) Create(rec *domain.ClinicalRecord) error {
	return r.db.Create(rec).Error
}

func (r *ClinicalRecordRepository) UpsertAnamnesis(clinicalRecordID uint, clinicID uint, a *domain.Anamnesis) error {
	a.ClinicalRecordID = clinicalRecordID
	a.ClinicID = clinicID

	var existing domain.Anamnesis
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.Create(a).Error
		}
		return err
	}

	a.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"reason_for_visit":             a.ReasonForVisit,
		"onset":                        a.Onset,
		"duration":                     a.Duration,
		"character":                    a.Character,
		"associated_symptoms":          a.AssociatedSymptoms,
		"has_diabetes":                 a.HasDiabetes,
		"diabetes_diagnosis_year":      a.DiabetesDiagnosisYear,
		"diabetes_hba1c":               a.DiabetesHba1c,
		"has_hypertension":             a.HasHypertension,
		"hypertension_diagnosis_year":  a.HypertensionDiagnosisYear,
		"hypertension_medication":      a.HypertensionMedication,
		"allergies":                    a.Allergies,
		"current_medications":          a.CurrentMedications,
		"other_systemic_conditions":    a.OtherSystemicConditions,
		"previous_eye_surgeries":       a.PreviousEyeSurgeries,
		"lens_use":                     a.LensUse,
		"correction_type":              a.CorrectionType,
		"lens_satisfaction":            a.LensSatisfaction,
		"previous_ocular_trauma":       a.PreviousOcularTrauma,
		"previous_ocular_pathologies":  a.PreviousOcularPathologies,
		"family_ophthalmic_conditions": a.FamilyOphthalmicConditions,
		"family_observations":          a.FamilyObservations,
		"takes_corticosteroids":        a.TakesCorticosteroids,
		"takes_hydroxychloroquine":     a.TakesHydroxychloroquine,
		"takes_tamsulosin":             a.TakesTamsulosin,
		"takes_antihistamines":         a.TakesAntihistamines,
		"takes_antihypertensives":      a.TakesAntihypertensives,
		"takes_amiodarone":             a.TakesAmiodarone,
	}).Error
}
