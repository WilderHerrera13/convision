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
		Preload("VisualExam").
		Preload("Diagnosis").
		Preload("ClinicalPrescription").
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

func (r *ClinicalRecordRepository) UpsertVisualExam(clinicalRecordID uint, branchID uint, v *domain.VisualExam) error {
	v.ClinicalRecordID = clinicalRecordID
	v.BranchID = branchID

	var existing domain.VisualExam
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.Create(v).Error
		}
		return err
	}

	v.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"av_sc_dist_od":        v.AvScOd,
		"av_sc_dist_oi":        v.AvScOi,
		"av_sc_near_od":        v.AvNearScOd,
		"av_sc_near_oi":        v.AvNearScOi,
		"av_cc_dist_od":        v.AvCcOd,
		"av_cc_dist_oi":        v.AvCcOi,
		"av_cc_near_od":        v.AvNearCcOd,
		"av_cc_near_oi":        v.AvNearCcOi,
		"ref_obj_sphere_od":    v.AutorefSphOd,
		"ref_obj_cylinder_od":  v.AutorefCylOd,
		"ref_obj_axis_od":      v.AutorefAxisOd,
		"ref_obj_sphere_oi":    v.AutorefSphOi,
		"ref_obj_cylinder_oi":  v.AutorefCylOi,
		"ref_obj_axis_oi":      v.AutorefAxisOi,
		"ref_subj_sphere_od":   v.SubjSphOd,
		"ref_subj_cylinder_od": v.SubjCylOd,
		"ref_subj_axis_od":     v.SubjAxisOd,
		"subj_av_od":           v.SubjAvOd,
		"ref_subj_sphere_oi":   v.SubjSphOi,
		"ref_subj_cylinder_oi": v.SubjCylOi,
		"ref_subj_axis_oi":     v.SubjAxisOi,
		"subj_av_oi":           v.SubjAvOi,
		"addition":             v.Addition,
		"kero_k1_od":           v.KeroK1Od,
		"kero_k2_od":           v.KeroK2Od,
		"kero_axis_od":         v.KeroAxisOd,
		"kero_k1_oi":           v.KeroK1Oi,
		"kero_k2_oi":           v.KeroK2Oi,
		"kero_axis_oi":         v.KeroAxisOi,
		"iop_method":           v.IopMethod,
		"iop_od":               v.IopOd,
		"iop_oi":               v.IopOi,
		"biomi_lids_od":        v.BiomiLidsOd,
		"biomi_lids_oi":        v.BiomiLidsOi,
		"biomi_conj_od":        v.BiomiConjOd,
		"biomi_conj_oi":        v.BiomiConjOi,
		"biomi_cornea_od":      v.BiomiCorneaOd,
		"biomi_cornea_oi":      v.BiomiCorneaOi,
		"biomi_ac_od":          v.BiomiAcOd,
		"biomi_ac_oi":          v.BiomiAcOi,
		"biomi_lens_od":        v.BiomiLensOd,
		"biomi_lens_oi":        v.BiomiLensOi,
		"fundus_disc_od":       v.FundusDiscOd,
		"fundus_disc_oi":       v.FundusDiscOi,
		"fundus_macula_od":     v.FundusMaculaOd,
		"fundus_macula_oi":     v.FundusMaculaOi,
		"fundus_vessels_od":    v.FundusVesselsOd,
		"fundus_vessels_oi":    v.FundusVesselsOi,
		"fundus_periph_od":     v.FundusPeriphOd,
		"fundus_periph_oi":     v.FundusPeriphOi,
		"motility_versions":    v.MotilityVersions,
		"motility_hirschberg":  v.MotilityHirschberg,
		"motility_cover_test":  v.MotilityCoverTest,
	}).Error
}

func (r *ClinicalRecordRepository) UpsertDiagnosis(clinicalRecordID uint, branchID uint, d *domain.Diagnosis) error {
	d.ClinicalRecordID = clinicalRecordID
	d.BranchID = branchID

	var existing domain.Diagnosis
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.Create(d).Error
		}
		return err
	}

	d.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"primary_code":            d.PrimaryCode,
		"primary_description":     d.PrimaryDescription,
		"diagnosis_type":          d.DiagnosisType,
		"related_1_code":          d.Related1Code,
		"related_1_desc":          d.Related1Desc,
		"related_2_code":          d.Related2Code,
		"related_2_desc":          d.Related2Desc,
		"related_3_code":          d.Related3Code,
		"related_3_desc":          d.Related3Desc,
		"optical_correction_plan": d.OpticalCorrectionPlan,
		"patient_education":       d.PatientEducation,
		"next_control_date":       d.NextControlDate,
		"next_control_reason":     d.NextControlReason,
		"requires_referral":       d.RequiresReferral,
		"referral_notes":          d.ReferralNotes,
		"cups":                    d.Cups,
	}).Error
}

func (r *ClinicalRecordRepository) UpsertPrescription(clinicalRecordID uint, branchID uint, p *domain.ClinicalPrescription) error {
	p.ClinicalRecordID = clinicalRecordID
	p.BranchID = branchID

	var existing domain.ClinicalPrescription
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.Create(p).Error
		}
		return err
	}

	p.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"sph_od":          p.SphOd,
		"cyl_od":          p.CylOd,
		"axis_od":         p.AxisOd,
		"avcc_od":         p.AvccOd,
		"add_od":          p.AddOd,
		"dp_od":           p.DpOd,
		"sph_oi":          p.SphOi,
		"cyl_oi":          p.CylOi,
		"axis_oi":         p.AxisOi,
		"avcc_oi":         p.AvccOi,
		"add_oi":          p.AddOi,
		"dp_oi":           p.DpOi,
		"lens_type":       p.LensType,
		"lens_material":   p.LensMaterial,
		"lens_use":        p.LensUse,
		"mounting_height": p.MountingHeight,
		"treatments":      p.Treatments,
		"validity_months": p.ValidityMonths,
		"professional_tp": p.ProfessionalTp,
	}).Error
}

func (r *ClinicalRecordRepository) SignClinicalRecord(clinicalRecordID uint, professionalTp string) error {
	now := r.db.NowFunc()
	if err := r.db.Model(&domain.ClinicalRecord{}).
		Where("id = ?", clinicalRecordID).
		Updates(map[string]any{"status": "signed"}).Error; err != nil {
		return err
	}
	return r.db.Model(&domain.ClinicalPrescription{}).
		Where("clinical_record_id = ?", clinicalRecordID).
		Updates(map[string]any{
			"professional_tp": professionalTp,
			"signed_at":       now,
		}).Error
}

func (r *ClinicalRecordRepository) UpsertAnamnesis(clinicalRecordID uint, branchID uint, a *domain.Anamnesis) error {
	a.ClinicalRecordID = clinicalRecordID
	a.BranchID = branchID

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
