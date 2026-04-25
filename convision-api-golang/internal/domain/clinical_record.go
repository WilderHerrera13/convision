package domain

import (
	"encoding/json"
	"time"
)

// ClinicalRecordType enumerates the valid types for a clinical record.
type ClinicalRecordType string

const (
	ClinicalRecordTypeNewConsultation ClinicalRecordType = "new_consultation"
	ClinicalRecordTypeFollowUp        ClinicalRecordType = "follow_up"
)

// ClinicalRecordStatus enumerates the lifecycle status values for a clinical record.
type ClinicalRecordStatus string

const (
	ClinicalRecordStatusDraft  ClinicalRecordStatus = "draft"
	ClinicalRecordStatusSigned ClinicalRecordStatus = "signed"
)

// DiagnosisType enumerates whether a diagnosis is primary or related.
type DiagnosisType string

const (
	DiagnosisTypeMain    DiagnosisType = "main"
	DiagnosisTypeRelated DiagnosisType = "related"
)

// EvolutionType enumerates how a patient's condition has evolved on follow-up.
type EvolutionType string

const (
	EvolutionTypeStable   EvolutionType = "stable"
	EvolutionTypeImproved EvolutionType = "improved"
	EvolutionTypeWorsened EvolutionType = "worsened"
)

// FormulaDecision enumerates whether to maintain or update the optical formula.
type FormulaDecision string

const (
	FormulaDecisionMaintain FormulaDecision = "maintain"
	FormulaDecisionUpdate   FormulaDecision = "update"
)

// ClinicalRecord is the top-level record grouping all clinical findings for a
// single appointment. It acts as the parent entity for Anamnesis, VisualExam,
// ClinicalDiagnosis, ClinicalPrescription, and FollowUp.
type ClinicalRecord struct {
	ID            uint                 `json:"id"             gorm:"primaryKey;autoIncrement"`
	ClinicID      uint                 `json:"clinic_id"      gorm:"not null;index"`
	AppointmentID uint                 `json:"appointment_id" gorm:"not null;index"`
	PatientID     uint                 `json:"patient_id"     gorm:"not null;index"`
	SpecialistID  uint                 `json:"specialist_id"  gorm:"not null;index"`
	RecordType    ClinicalRecordType   `json:"record_type"    gorm:"type:varchar(30);not null;check:record_type IN ('new_consultation','follow_up')"`
	Status        ClinicalRecordStatus `json:"status"         gorm:"type:varchar(20);not null;default:'draft';check:status IN ('draft','signed')"`
	SignedAt      *time.Time           `json:"signed_at"`
	SignedByID    *uint                `json:"signed_by_id"`
	LegalText     string               `json:"legal_text"     gorm:"type:text"`
	CreatedAt     time.Time            `json:"created_at"`
	UpdatedAt     time.Time            `json:"updated_at"`
	DeletedAt     *time.Time           `json:"deleted_at"     gorm:"index"`
}

// Anamnesis captures the patient history and chief complaint at the start of
// a clinical encounter.
type Anamnesis struct {
	ID               uint      `json:"id"                   gorm:"primaryKey;autoIncrement"`
	ClinicID         uint      `json:"clinic_id"            gorm:"not null;index"`
	ClinicalRecordID uint      `json:"clinical_record_id"   gorm:"not null;index"`
	ChiefComplaint   string    `json:"chief_complaint"      gorm:"type:text"`
	OcularHistory    string    `json:"ocular_history"       gorm:"type:text"`
	FamilyHistory    string    `json:"family_history"       gorm:"type:text"`
	SystemicHistory  string    `json:"systemic_history"     gorm:"type:text"`
	// Current correction for right eye (OD = oculus dexter)
	CurrentCorrectionOD string `json:"current_correction_od" gorm:"type:varchar(100)"`
	// Current correction for left eye (OI = oculus inferior/sinister)
	CurrentCorrectionOI string    `json:"current_correction_oi" gorm:"type:varchar(100)"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// VisualExam stores all visual acuity, refraction, keratometry, IOP, and
// biomicroscopy findings recorded during the appointment.
//
// Naming conventions:
//   - SC = sine correctione (without correction)
//   - CC = cum correctione (with correction)
//   - Dist = distance, Near = near
//   - OD = oculus dexter (right eye), OI = oculus sinister (left eye)
//   - RefObj = objective refraction, RefSubj = subjective refraction
//   - IOP = intraocular pressure
type VisualExam struct {
	ID               uint    `json:"id"                  gorm:"primaryKey;autoIncrement"`
	ClinicID         uint    `json:"clinic_id"           gorm:"not null;index"`
	ClinicalRecordID uint    `json:"clinical_record_id"  gorm:"not null;index"`
	// Visual acuity without correction — distance
	AVSCDistOD string `json:"av_sc_dist_od" gorm:"type:varchar(20)"`
	AVSCDistOI string `json:"av_sc_dist_oi" gorm:"type:varchar(20)"`
	// Visual acuity without correction — near
	AVSCNearOD string `json:"av_sc_near_od" gorm:"type:varchar(20)"`
	AVSCNearOI string `json:"av_sc_near_oi" gorm:"type:varchar(20)"`
	// Visual acuity with correction — distance
	AVCCDistOD string `json:"av_cc_dist_od" gorm:"type:varchar(20)"`
	AVCCDistOI string `json:"av_cc_dist_oi" gorm:"type:varchar(20)"`
	// Visual acuity with correction — near
	AVCCNearOD string `json:"av_cc_near_od" gorm:"type:varchar(20)"`
	AVCCNearOI string `json:"av_cc_near_oi" gorm:"type:varchar(20)"`
	// Objective refraction — right eye
	RefObjSphereOD   *float64 `json:"ref_obj_sphere_od"   gorm:"type:numeric(10,4)"`
	RefObjCylinderOD *float64 `json:"ref_obj_cylinder_od" gorm:"type:numeric(10,4)"`
	RefObjAxisOD     *int     `json:"ref_obj_axis_od"`
	// Objective refraction — left eye
	RefObjSphereOI   *float64 `json:"ref_obj_sphere_oi"   gorm:"type:numeric(10,4)"`
	RefObjCylinderOI *float64 `json:"ref_obj_cylinder_oi" gorm:"type:numeric(10,4)"`
	RefObjAxisOI     *int     `json:"ref_obj_axis_oi"`
	// Subjective refraction — right eye
	RefSubjSphereOD   *float64 `json:"ref_subj_sphere_od"   gorm:"type:numeric(10,4)"`
	RefSubjCylinderOD *float64 `json:"ref_subj_cylinder_od" gorm:"type:numeric(10,4)"`
	RefSubjAxisOD     *int     `json:"ref_subj_axis_od"`
	// Subjective refraction — left eye
	RefSubjSphereOI   *float64 `json:"ref_subj_sphere_oi"   gorm:"type:numeric(10,4)"`
	RefSubjCylinderOI *float64 `json:"ref_subj_cylinder_oi" gorm:"type:numeric(10,4)"`
	RefSubjAxisOI     *int     `json:"ref_subj_axis_oi"`
	// Keratometry readings
	KeratometryOD string `json:"keratometry_od" gorm:"type:varchar(50)"`
	KeratometryOI string `json:"keratometry_oi" gorm:"type:varchar(50)"`
	// Intraocular pressure (mmHg)
	IOPOD *float64 `json:"iop_od" gorm:"type:numeric(6,2)"`
	IOPOI *float64 `json:"iop_oi" gorm:"type:numeric(6,2)"`
	// Slit-lamp biomicroscopy and ocular motility findings
	Biomicroscopy string    `json:"biomicroscopy" gorm:"type:text"`
	Motility      string    `json:"motility"      gorm:"type:text"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ClinicalDiagnosis stores ICD-10 (CIE-10) diagnostic codes and the care plan
// associated with a clinical record.
type ClinicalDiagnosis struct {
	ID               uint          `json:"id"                  gorm:"primaryKey;autoIncrement"`
	ClinicID         uint          `json:"clinic_id"           gorm:"not null;index"`
	ClinicalRecordID uint          `json:"clinical_record_id"  gorm:"not null;index"`
	PrimaryCIE10Code string        `json:"primary_cie10_code"  gorm:"type:varchar(20)"`
	PrimaryDescription string      `json:"primary_description" gorm:"type:text"`
	DiagnosisType    DiagnosisType `json:"diagnosis_type"      gorm:"type:varchar(20);not null;check:diagnosis_type IN ('main','related')"`
	// RelatedCodes holds additional CIE-10 codes stored as a JSON array.
	RelatedCodes json.RawMessage `json:"related_codes" gorm:"type:jsonb"`
	CarePlan     string          `json:"care_plan"     gorm:"type:text"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// ClinicalPrescription stores the optical formula prescribed at the end of a
// clinical encounter.
type ClinicalPrescription struct {
	ID               uint      `json:"id"                  gorm:"primaryKey;autoIncrement"`
	ClinicID         uint      `json:"clinic_id"           gorm:"not null;index"`
	ClinicalRecordID uint      `json:"clinical_record_id"  gorm:"not null;index"`
	// Right eye (OD) values
	SphereOD   *float64 `json:"sphere_od"   gorm:"type:numeric(10,4)"`
	CylinderOD *float64 `json:"cylinder_od" gorm:"type:numeric(10,4)"`
	AxisOD     *int     `json:"axis_od"`
	AddOD      *float64 `json:"add_od"      gorm:"type:numeric(10,4)"`
	// Left eye (OI) values
	SphereOI   *float64 `json:"sphere_oi"   gorm:"type:numeric(10,4)"`
	CylinderOI *float64 `json:"cylinder_oi" gorm:"type:numeric(10,4)"`
	AxisOI     *int     `json:"axis_oi"`
	AddOI      *float64 `json:"add_oi"      gorm:"type:numeric(10,4)"`
	// Lens specifications
	LensType     string `json:"lens_type"     gorm:"type:varchar(50)"`
	LensMaterial string `json:"lens_material" gorm:"type:varchar(50)"`
	LensUse      string `json:"lens_use"      gorm:"type:varchar(50)"`
	// Treatments holds a JSON array of applied lens treatments (e.g. anti-reflective).
	Treatments json.RawMessage `json:"treatments"  gorm:"type:jsonb"`
	ValidUntil *time.Time      `json:"valid_until" gorm:"type:date"`
	// CUPSCode is the Colombian health service billing code for this prescription.
	CUPSCode  string    `json:"cups_code"  gorm:"type:varchar(20)"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FollowUp records patient evolution data captured during a follow-up visit
// linked to an existing clinical record.
type FollowUp struct {
	ID               uint            `json:"id"                    gorm:"primaryKey;autoIncrement"`
	ClinicID         uint            `json:"clinic_id"             gorm:"not null;index"`
	ClinicalRecordID uint            `json:"clinical_record_id"    gorm:"not null;index"`
	ControlReason    string          `json:"control_reason"        gorm:"type:text"`
	// Patient-reported satisfaction with current correction (1–10 or free text).
	CorrectionSatisfaction string `json:"correction_satisfaction" gorm:"type:varchar(50)"`
	SubjectiveChanges      string `json:"subjective_changes"      gorm:"type:text"`
	Medications            string `json:"medications"             gorm:"type:text"`
	SystemicChanges        string `json:"systemic_changes"        gorm:"type:text"`
	CorrectionUse          string `json:"correction_use"          gorm:"type:varchar(50)"`
	// DailyHours is the average number of hours per day the patient wears their correction.
	DailyHours           *int            `json:"daily_hours"`
	Observations         string          `json:"observations"          gorm:"type:text"`
	EvolutionType        EvolutionType   `json:"evolution_type"        gorm:"type:varchar(20);not null;check:evolution_type IN ('stable','improved','worsened')"`
	EvolutionDescription string          `json:"evolution_description" gorm:"type:text"`
	NewDiagnosis         bool            `json:"new_diagnosis"         gorm:"not null;default:false"`
	ContinuityPlan       string          `json:"continuity_plan"       gorm:"type:text"`
	FormulaDecision      FormulaDecision `json:"formula_decision"      gorm:"type:varchar(20);not null;check:formula_decision IN ('maintain','update')"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
}

// ClinicalRecordRepository defines persistence operations for ClinicalRecord.
type ClinicalRecordRepository interface {
	Create(r *ClinicalRecord) error
	GetByID(id uint) (*ClinicalRecord, error)
	GetByAppointmentID(appointmentID uint) (*ClinicalRecord, error)
	Update(r *ClinicalRecord) error
	Delete(id uint) error
}

// AnamnesisRepository defines persistence operations for Anamnesis.
type AnamnesisRepository interface {
	Create(a *Anamnesis) error
	GetByRecordID(clinicalRecordID uint) (*Anamnesis, error)
	Update(a *Anamnesis) error
}

// VisualExamRepository defines persistence operations for VisualExam.
type VisualExamRepository interface {
	Create(e *VisualExam) error
	GetByRecordID(clinicalRecordID uint) (*VisualExam, error)
	Update(e *VisualExam) error
}

// ClinicalDiagnosisRepository defines persistence operations for ClinicalDiagnosis.
type ClinicalDiagnosisRepository interface {
	Create(d *ClinicalDiagnosis) error
	GetByRecordID(clinicalRecordID uint) ([]*ClinicalDiagnosis, error)
	Update(d *ClinicalDiagnosis) error
	Delete(id uint) error
}

// ClinicalPrescriptionRepository defines persistence operations for ClinicalPrescription.
type ClinicalPrescriptionRepository interface {
	Create(p *ClinicalPrescription) error
	GetByRecordID(clinicalRecordID uint) (*ClinicalPrescription, error)
	Update(p *ClinicalPrescription) error
}

// FollowUpRepository defines persistence operations for FollowUp.
type FollowUpRepository interface {
	Create(f *FollowUp) error
	GetByRecordID(clinicalRecordID uint) (*FollowUp, error)
	Update(f *FollowUp) error
}
