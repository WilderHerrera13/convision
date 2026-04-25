package postgres

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ─── ClinicalRecordRepository ────────────────────────────────────────────────

// ClinicalRecordRepository is the PostgreSQL-backed implementation of domain.ClinicalRecordRepository.
type ClinicalRecordRepository struct {
	db *gorm.DB
}

// NewClinicalRecordRepository creates a new ClinicalRecordRepository.
func NewClinicalRecordRepository(db *gorm.DB) *ClinicalRecordRepository {
	return &ClinicalRecordRepository{db: db}
}

func (r *ClinicalRecordRepository) Create(rec *domain.ClinicalRecord) error {
	return r.db.Create(rec).Error
}

func (r *ClinicalRecordRepository) GetByID(id uint) (*domain.ClinicalRecord, error) {
	var rec domain.ClinicalRecord
	err := r.db.First(&rec, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "clinical_record"}
		}
		return nil, err
	}
	return &rec, nil
}

// GetByAppointmentID returns a ClinicalRecord with all sub-entities preloaded.
func (r *ClinicalRecordRepository) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	var rec domain.ClinicalRecord
	err := r.db.
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

// Update persists status, signing fields, and legal_text on the record.
// Never uses db.Save — uses targeted Updates to avoid overwriting unchanged columns.
func (r *ClinicalRecordRepository) Update(rec *domain.ClinicalRecord) error {
	var signedAt *time.Time
	if rec.SignedAt != nil {
		t := *rec.SignedAt
		signedAt = &t
	}
	return r.db.Model(rec).Updates(map[string]any{
		"status":       rec.Status,
		"signed_at":    signedAt,
		"signed_by_id": rec.SignedByID,
		"legal_text":   rec.LegalText,
	}).Error
}

// Delete soft-deletes a clinical record by setting deleted_at.
func (r *ClinicalRecordRepository) Delete(id uint) error {
	now := time.Now()
	return r.db.Model(&domain.ClinicalRecord{}).Where("id = ?", id).Update("deleted_at", &now).Error
}

// ─── AnamnesisRepository ─────────────────────────────────────────────────────

// AnamnesisRepository is the PostgreSQL-backed implementation of domain.AnamnesisRepository.
type AnamnesisRepository struct {
	db *gorm.DB
}

// NewAnamnesisRepository creates a new AnamnesisRepository.
func NewAnamnesisRepository(db *gorm.DB) *AnamnesisRepository {
	return &AnamnesisRepository{db: db}
}

func (r *AnamnesisRepository) Create(a *domain.Anamnesis) error {
	return r.db.Create(a).Error
}

func (r *AnamnesisRepository) GetByRecordID(clinicalRecordID uint) (*domain.Anamnesis, error) {
	var a domain.Anamnesis
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "anamnesis"}
		}
		return nil, err
	}
	return &a, nil
}

// Update persists all mutable anamnesis fields.
func (r *AnamnesisRepository) Update(a *domain.Anamnesis) error {
	return r.db.Model(a).Updates(map[string]any{
		"chief_complaint":       a.ChiefComplaint,
		"ocular_history":        a.OcularHistory,
		"family_history":        a.FamilyHistory,
		"systemic_history":      a.SystemicHistory,
		"current_correction_od": a.CurrentCorrectionOD,
		"current_correction_oi": a.CurrentCorrectionOI,
	}).Error
}

// Upsert creates or updates the anamnesis for a given clinical record.
func (r *AnamnesisRepository) Upsert(a *domain.Anamnesis) error {
	var existing domain.Anamnesis
	err := r.db.Where("clinical_record_id = ?", a.ClinicalRecordID).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(a).Error
	}
	if err != nil {
		return err
	}
	a.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"chief_complaint":       a.ChiefComplaint,
		"ocular_history":        a.OcularHistory,
		"family_history":        a.FamilyHistory,
		"systemic_history":      a.SystemicHistory,
		"current_correction_od": a.CurrentCorrectionOD,
		"current_correction_oi": a.CurrentCorrectionOI,
	}).Error
}

// ─── VisualExamRepository ────────────────────────────────────────────────────

// VisualExamRepository is the PostgreSQL-backed implementation of domain.VisualExamRepository.
type VisualExamRepository struct {
	db *gorm.DB
}

// NewVisualExamRepository creates a new VisualExamRepository.
func NewVisualExamRepository(db *gorm.DB) *VisualExamRepository {
	return &VisualExamRepository{db: db}
}

func (r *VisualExamRepository) Create(e *domain.VisualExam) error {
	return r.db.Create(e).Error
}

func (r *VisualExamRepository) GetByRecordID(clinicalRecordID uint) (*domain.VisualExam, error) {
	var e domain.VisualExam
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&e).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "visual_exam"}
		}
		return nil, err
	}
	return &e, nil
}

// Update persists all mutable visual exam fields.
func (r *VisualExamRepository) Update(e *domain.VisualExam) error {
	return r.db.Model(e).Updates(map[string]any{
		"av_sc_dist_od":       e.AVSCDistOD,
		"av_sc_dist_oi":       e.AVSCDistOI,
		"av_sc_near_od":       e.AVSCNearOD,
		"av_sc_near_oi":       e.AVSCNearOI,
		"av_cc_dist_od":       e.AVCCDistOD,
		"av_cc_dist_oi":       e.AVCCDistOI,
		"av_cc_near_od":       e.AVCCNearOD,
		"av_cc_near_oi":       e.AVCCNearOI,
		"ref_obj_sphere_od":   e.RefObjSphereOD,
		"ref_obj_cylinder_od": e.RefObjCylinderOD,
		"ref_obj_axis_od":     e.RefObjAxisOD,
		"ref_obj_sphere_oi":   e.RefObjSphereOI,
		"ref_obj_cylinder_oi": e.RefObjCylinderOI,
		"ref_obj_axis_oi":     e.RefObjAxisOI,
		"ref_subj_sphere_od":   e.RefSubjSphereOD,
		"ref_subj_cylinder_od": e.RefSubjCylinderOD,
		"ref_subj_axis_od":     e.RefSubjAxisOD,
		"ref_subj_sphere_oi":   e.RefSubjSphereOI,
		"ref_subj_cylinder_oi": e.RefSubjCylinderOI,
		"ref_subj_axis_oi":     e.RefSubjAxisOI,
		"keratometry_od": e.KeratometryOD,
		"keratometry_oi": e.KeratometryOI,
		"iop_od":         e.IOPOD,
		"iop_oi":         e.IOPOI,
		"biomicroscopy":  e.Biomicroscopy,
		"motility":       e.Motility,
	}).Error
}

// Upsert creates or updates the visual exam for a given clinical record.
func (r *VisualExamRepository) Upsert(e *domain.VisualExam) error {
	var existing domain.VisualExam
	err := r.db.Where("clinical_record_id = ?", e.ClinicalRecordID).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(e).Error
	}
	if err != nil {
		return err
	}
	e.ID = existing.ID
	return r.db.Model(&existing).Updates(e).Error
}

// ─── ClinicalDiagnosisRepository ─────────────────────────────────────────────

// ClinicalDiagnosisRepository is the PostgreSQL-backed implementation of domain.ClinicalDiagnosisRepository.
type ClinicalDiagnosisRepository struct {
	db *gorm.DB
}

// NewClinicalDiagnosisRepository creates a new ClinicalDiagnosisRepository.
func NewClinicalDiagnosisRepository(db *gorm.DB) *ClinicalDiagnosisRepository {
	return &ClinicalDiagnosisRepository{db: db}
}

func (r *ClinicalDiagnosisRepository) Create(d *domain.ClinicalDiagnosis) error {
	return r.db.Create(d).Error
}

// GetByRecordID returns all diagnoses for a clinical record.
func (r *ClinicalDiagnosisRepository) GetByRecordID(clinicalRecordID uint) ([]*domain.ClinicalDiagnosis, error) {
	var diagnoses []*domain.ClinicalDiagnosis
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).Find(&diagnoses).Error
	if err != nil {
		return nil, err
	}
	return diagnoses, nil
}

// Update persists all mutable diagnosis fields.
func (r *ClinicalDiagnosisRepository) Update(d *domain.ClinicalDiagnosis) error {
	return r.db.Model(d).Updates(map[string]any{
		"primary_cie10_code":  d.PrimaryCIE10Code,
		"primary_description": d.PrimaryDescription,
		"diagnosis_type":      d.DiagnosisType,
		"related_codes":       d.RelatedCodes,
		"care_plan":           d.CarePlan,
	}).Error
}

// Delete removes a diagnosis record by ID.
func (r *ClinicalDiagnosisRepository) Delete(id uint) error {
	return r.db.Delete(&domain.ClinicalDiagnosis{}, id).Error
}

// Upsert creates or updates a diagnosis for a given clinical record.
// For diagnosis, upsert targets the primary (main) diagnosis.
func (r *ClinicalDiagnosisRepository) Upsert(d *domain.ClinicalDiagnosis) error {
	var existing domain.ClinicalDiagnosis
	err := r.db.Where("clinical_record_id = ? AND diagnosis_type = ?", d.ClinicalRecordID, d.DiagnosisType).
		First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(d).Error
	}
	if err != nil {
		return err
	}
	d.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"primary_cie10_code":  d.PrimaryCIE10Code,
		"primary_description": d.PrimaryDescription,
		"related_codes":       d.RelatedCodes,
		"care_plan":           d.CarePlan,
	}).Error
}

// ─── ClinicalPrescriptionRepository ──────────────────────────────────────────

// ClinicalPrescriptionRepository is the PostgreSQL-backed implementation of domain.ClinicalPrescriptionRepository.
type ClinicalPrescriptionRepository struct {
	db *gorm.DB
}

// NewClinicalPrescriptionRepository creates a new ClinicalPrescriptionRepository.
func NewClinicalPrescriptionRepository(db *gorm.DB) *ClinicalPrescriptionRepository {
	return &ClinicalPrescriptionRepository{db: db}
}

func (r *ClinicalPrescriptionRepository) Create(p *domain.ClinicalPrescription) error {
	return r.db.Create(p).Error
}

func (r *ClinicalPrescriptionRepository) GetByRecordID(clinicalRecordID uint) (*domain.ClinicalPrescription, error) {
	var p domain.ClinicalPrescription
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "clinical_prescription"}
		}
		return nil, err
	}
	return &p, nil
}

// Update persists all mutable prescription fields.
func (r *ClinicalPrescriptionRepository) Update(p *domain.ClinicalPrescription) error {
	return r.db.Model(p).Updates(map[string]any{
		"sphere_od":    p.SphereOD,
		"cylinder_od":  p.CylinderOD,
		"axis_od":      p.AxisOD,
		"add_od":       p.AddOD,
		"sphere_oi":    p.SphereOI,
		"cylinder_oi":  p.CylinderOI,
		"axis_oi":      p.AxisOI,
		"add_oi":       p.AddOI,
		"lens_type":    p.LensType,
		"lens_material": p.LensMaterial,
		"lens_use":     p.LensUse,
		"treatments":   p.Treatments,
		"valid_until":  p.ValidUntil,
		"cups_code":    p.CUPSCode,
	}).Error
}

// Upsert creates or updates the prescription for a given clinical record.
func (r *ClinicalPrescriptionRepository) Upsert(p *domain.ClinicalPrescription) error {
	var existing domain.ClinicalPrescription
	err := r.db.Where("clinical_record_id = ?", p.ClinicalRecordID).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(p).Error
	}
	if err != nil {
		return err
	}
	p.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"sphere_od":    p.SphereOD,
		"cylinder_od":  p.CylinderOD,
		"axis_od":      p.AxisOD,
		"add_od":       p.AddOD,
		"sphere_oi":    p.SphereOI,
		"cylinder_oi":  p.CylinderOI,
		"axis_oi":      p.AxisOI,
		"add_oi":       p.AddOI,
		"lens_type":    p.LensType,
		"lens_material": p.LensMaterial,
		"lens_use":     p.LensUse,
		"treatments":   p.Treatments,
		"valid_until":  p.ValidUntil,
		"cups_code":    p.CUPSCode,
	}).Error
}

// ─── FollowUpRepository ───────────────────────────────────────────────────────

// FollowUpRepository is the PostgreSQL-backed implementation of domain.FollowUpRepository.
type FollowUpRepository struct {
	db *gorm.DB
}

// NewFollowUpRepository creates a new FollowUpRepository.
func NewFollowUpRepository(db *gorm.DB) *FollowUpRepository {
	return &FollowUpRepository{db: db}
}

func (r *FollowUpRepository) Create(f *domain.FollowUp) error {
	return r.db.Create(f).Error
}

func (r *FollowUpRepository) GetByRecordID(clinicalRecordID uint) (*domain.FollowUp, error) {
	var f domain.FollowUp
	err := r.db.Where("clinical_record_id = ?", clinicalRecordID).First(&f).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "follow_up"}
		}
		return nil, err
	}
	return &f, nil
}

// Update persists all mutable follow-up fields.
func (r *FollowUpRepository) Update(f *domain.FollowUp) error {
	return r.db.Model(f).Updates(map[string]any{
		"control_reason":          f.ControlReason,
		"correction_satisfaction": f.CorrectionSatisfaction,
		"subjective_changes":      f.SubjectiveChanges,
		"medications":             f.Medications,
		"systemic_changes":        f.SystemicChanges,
		"correction_use":          f.CorrectionUse,
		"daily_hours":             f.DailyHours,
		"observations":            f.Observations,
		"evolution_type":          f.EvolutionType,
		"evolution_description":   f.EvolutionDescription,
		"new_diagnosis":           f.NewDiagnosis,
		"continuity_plan":         f.ContinuityPlan,
		"formula_decision":        f.FormulaDecision,
	}).Error
}

// Upsert creates or updates the follow-up record for a given clinical record.
func (r *FollowUpRepository) Upsert(f *domain.FollowUp) error {
	var existing domain.FollowUp
	err := r.db.Where("clinical_record_id = ?", f.ClinicalRecordID).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(f).Error
	}
	if err != nil {
		return err
	}
	f.ID = existing.ID
	return r.db.Model(&existing).Updates(map[string]any{
		"control_reason":          f.ControlReason,
		"correction_satisfaction": f.CorrectionSatisfaction,
		"subjective_changes":      f.SubjectiveChanges,
		"medications":             f.Medications,
		"systemic_changes":        f.SystemicChanges,
		"correction_use":          f.CorrectionUse,
		"daily_hours":             f.DailyHours,
		"observations":            f.Observations,
		"evolution_type":          f.EvolutionType,
		"evolution_description":   f.EvolutionDescription,
		"new_diagnosis":           f.NewDiagnosis,
		"continuity_plan":         f.ContinuityPlan,
		"formula_decision":        f.FormulaDecision,
	}).Error
}
