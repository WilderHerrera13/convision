package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// StringSlice is a JSONB-backed string array for PostgreSQL storage.
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	b, err := json.Marshal([]string(s))
	return string(b), err
}

func (s *StringSlice) Scan(src any) error {
	var raw string
	switch v := src.(type) {
	case string:
		raw = v
	case []byte:
		raw = string(v)
	case nil:
		*s = StringSlice{}
		return nil
	default:
		return errors.New("StringSlice: unsupported source type")
	}
	return json.Unmarshal([]byte(raw), s)
}

// ClinicalRecord is the root document for an appointment's clinical session.
type ClinicalRecord struct {
	ID            uint       `json:"id"             gorm:"primaryKey;autoIncrement"`
	ClinicID      uint       `json:"clinic_id"      gorm:"not null;index"`
	AppointmentID uint       `json:"appointment_id" gorm:"not null;uniqueIndex"`
	PatientID     uint       `json:"patient_id"     gorm:"not null;index"`
	SpecialistID  uint       `json:"specialist_id"  gorm:"not null;index"`
	RecordType    string     `json:"record_type"    gorm:"type:varchar(30);not null;default:'new_consultation'"`
	Status        string     `json:"status"         gorm:"type:varchar(20);not null;default:'in_progress'"`
	Cups          string     `json:"cups"           gorm:"type:varchar(20)"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	Anamnesis            *Anamnesis            `json:"anamnesis,omitempty"    gorm:"foreignKey:ClinicalRecordID"`
	VisualExam           *VisualExam           `json:"visual_exam,omitempty"  gorm:"foreignKey:ClinicalRecordID"`
	Diagnosis            *Diagnosis            `json:"diagnosis,omitempty"    gorm:"foreignKey:ClinicalRecordID"`
	ClinicalPrescription *ClinicalPrescription `json:"prescription,omitempty" gorm:"foreignKey:ClinicalRecordID"`
}

// Anamnesis stores the structured anamnesis section of a ClinicalRecord.
type Anamnesis struct {
	ID               uint `json:"id"                gorm:"primaryKey;autoIncrement"`
	ClinicalRecordID uint `json:"clinical_record_id" gorm:"not null;uniqueIndex"`
	ClinicID         uint `json:"clinic_id"          gorm:"not null;index"`

	// Section 1 — chief complaint and current illness
	ReasonForVisit     string      `json:"reason_for_visit"     gorm:"type:text"`
	Onset              string      `json:"onset"                gorm:"type:varchar(100)"`
	Duration           string      `json:"duration"             gorm:"type:varchar(100)"`
	Character          string      `json:"character"            gorm:"type:varchar(50)"`
	AssociatedSymptoms StringSlice `json:"associated_symptoms"  gorm:"type:jsonb"`

	// Section 2 — personal systemic history
	HasDiabetes               string      `json:"has_diabetes"                gorm:"type:varchar(5)"`
	DiabetesDiagnosisYear     string      `json:"diabetes_diagnosis_year"     gorm:"type:varchar(10)"`
	DiabetesHba1c             string      `json:"diabetes_hba1c"              gorm:"type:varchar(50)"`
	HasHypertension           string      `json:"has_hypertension"            gorm:"type:varchar(5)"`
	HypertensionDiagnosisYear string      `json:"hypertension_diagnosis_year" gorm:"type:varchar(10)"`
	HypertensionMedication    string      `json:"hypertension_medication"     gorm:"type:text"`
	Allergies                 string      `json:"allergies"                   gorm:"type:text"`
	CurrentMedications        string      `json:"current_medications"         gorm:"type:text"`
	OtherSystemicConditions   StringSlice `json:"other_systemic_conditions"   gorm:"type:jsonb"`

	// Section 3 — ocular history
	PreviousEyeSurgeries      string `json:"previous_eye_surgeries"      gorm:"type:text"`
	LensUse                   string `json:"lens_use"                    gorm:"type:varchar(20)"`
	CorrectionType            string `json:"correction_type"             gorm:"type:varchar(30)"`
	LensSatisfaction          string `json:"lens_satisfaction"           gorm:"type:varchar(30)"`
	PreviousOcularTrauma      string `json:"previous_ocular_trauma"      gorm:"type:text"`
	PreviousOcularPathologies string `json:"previous_ocular_pathologies" gorm:"type:text"`

	// Section 4 — family ophthalmic history
	FamilyOphthalmicConditions StringSlice `json:"family_ophthalmic_conditions" gorm:"type:jsonb"`
	FamilyObservations         string      `json:"family_observations"          gorm:"type:text"`

	// Section 5 — pharmacological flags with known ocular impact
	TakesCorticosteroids    bool `json:"takes_corticosteroids"`
	TakesHydroxychloroquine bool `json:"takes_hydroxychloroquine"`
	TakesTamsulosin         bool `json:"takes_tamsulosin"`
	TakesAntihistamines     bool `json:"takes_antihistamines"`
	TakesAntihypertensives  bool `json:"takes_antihypertensives"`
	TakesAmiodarone         bool `json:"takes_amiodarone"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// VisualExam stores all visual examination findings for a ClinicalRecord.
type VisualExam struct {
	ID               uint `json:"id"                gorm:"primaryKey;autoIncrement"`
	ClinicalRecordID uint `json:"clinical_record_id" gorm:"not null;uniqueIndex"`
	ClinicID         uint `json:"clinic_id"          gorm:"not null;index"`

	// Agudeza Visual — sin corrección
	AvScOd     string `json:"av_sc_od"      gorm:"column:av_sc_dist_od;type:varchar(20)"`
	AvScOi     string `json:"av_sc_oi"      gorm:"column:av_sc_dist_oi;type:varchar(20)"`
	AvNearScOd string `json:"av_near_sc_od" gorm:"column:av_sc_near_od;type:varchar(20)"`
	AvNearScOi string `json:"av_near_sc_oi" gorm:"column:av_sc_near_oi;type:varchar(20)"`

	// Agudeza Visual — con corrección
	AvCcOd     string `json:"av_cc_od"      gorm:"column:av_cc_dist_od;type:varchar(20)"`
	AvCcOi     string `json:"av_cc_oi"      gorm:"column:av_cc_dist_oi;type:varchar(20)"`
	AvNearCcOd string `json:"av_near_cc_od" gorm:"column:av_cc_near_od;type:varchar(20)"`
	AvNearCcOi string `json:"av_near_cc_oi" gorm:"column:av_cc_near_oi;type:varchar(20)"`

	// Refracción Objetiva — OD
	AutorefSphOd  *float64 `json:"autoref_sph_od"  gorm:"column:ref_obj_sphere_od;type:numeric(10,4)"`
	AutorefCylOd  *float64 `json:"autoref_cyl_od"  gorm:"column:ref_obj_cylinder_od;type:numeric(10,4)"`
	AutorefAxisOd *int     `json:"autoref_axis_od" gorm:"column:ref_obj_axis_od"`

	// Refracción Objetiva — OI
	AutorefSphOi  *float64 `json:"autoref_sph_oi"  gorm:"column:ref_obj_sphere_oi;type:numeric(10,4)"`
	AutorefCylOi  *float64 `json:"autoref_cyl_oi"  gorm:"column:ref_obj_cylinder_oi;type:numeric(10,4)"`
	AutorefAxisOi *int     `json:"autoref_axis_oi" gorm:"column:ref_obj_axis_oi"`

	// Refracción Subjetiva — OD
	SubjSphOd  *float64 `json:"subj_sph_od"  gorm:"column:ref_subj_sphere_od;type:numeric(10,4)"`
	SubjCylOd  *float64 `json:"subj_cyl_od"  gorm:"column:ref_subj_cylinder_od;type:numeric(10,4)"`
	SubjAxisOd *int     `json:"subj_axis_od" gorm:"column:ref_subj_axis_od"`
	SubjAvOd   string   `json:"subj_av_od"   gorm:"type:varchar(20)"`

	// Refracción Subjetiva — OI
	SubjSphOi  *float64 `json:"subj_sph_oi"  gorm:"column:ref_subj_sphere_oi;type:numeric(10,4)"`
	SubjCylOi  *float64 `json:"subj_cyl_oi"  gorm:"column:ref_subj_cylinder_oi;type:numeric(10,4)"`
	SubjAxisOi *int     `json:"subj_axis_oi" gorm:"column:ref_subj_axis_oi"`
	SubjAvOi   string   `json:"subj_av_oi"   gorm:"type:varchar(20)"`
	Addition   *float64 `json:"addition"     gorm:"type:numeric(10,4)"`

	// Queratometría — OD
	KeroK1Od   *float64 `json:"kero_k1_od"   gorm:"type:numeric(10,4)"`
	KeroK2Od   *float64 `json:"kero_k2_od"   gorm:"type:numeric(10,4)"`
	KeroAxisOd *int     `json:"kero_axis_od" gorm:"type:integer"`

	// Queratometría — OI
	KeroK1Oi   *float64 `json:"kero_k1_oi"   gorm:"type:numeric(10,4)"`
	KeroK2Oi   *float64 `json:"kero_k2_oi"   gorm:"type:numeric(10,4)"`
	KeroAxisOi *int     `json:"kero_axis_oi" gorm:"type:integer"`

	// Presión Intraocular
	IopMethod string   `json:"iop_method" gorm:"type:varchar(30)"`
	IopOd     *float64 `json:"iop_od"     gorm:"type:numeric(6,2)"`
	IopOi     *float64 `json:"iop_oi"     gorm:"type:numeric(6,2)"`

	// Biomicroscopía (Segmento Anterior)
	BiomiLidsOd   string `json:"biomi_lids_od"   gorm:"type:text"`
	BiomiLidsOi   string `json:"biomi_lids_oi"   gorm:"type:text"`
	BiomiConjOd   string `json:"biomi_conj_od"   gorm:"type:text"`
	BiomiConjOi   string `json:"biomi_conj_oi"   gorm:"type:text"`
	BiomiCorneaOd string `json:"biomi_cornea_od" gorm:"type:text"`
	BiomiCorneaOi string `json:"biomi_cornea_oi" gorm:"type:text"`
	BiomiAcOd     string `json:"biomi_ac_od"     gorm:"type:text"`
	BiomiAcOi     string `json:"biomi_ac_oi"     gorm:"type:text"`
	BiomiLensOd   string `json:"biomi_lens_od"   gorm:"type:text"`
	BiomiLensOi   string `json:"biomi_lens_oi"   gorm:"type:text"`

	// Fondo de Ojo (Segmento Posterior)
	FundusDiscOd     string `json:"fundus_disc_od"     gorm:"type:text"`
	FundusDiscOi     string `json:"fundus_disc_oi"     gorm:"type:text"`
	FundusMaculaOd   string `json:"fundus_macula_od"   gorm:"type:text"`
	FundusMaculaOi   string `json:"fundus_macula_oi"   gorm:"type:text"`
	FundusVesselsOd  string `json:"fundus_vessels_od"  gorm:"type:text"`
	FundusVesselsOi  string `json:"fundus_vessels_oi"  gorm:"type:text"`
	FundusPeriphOd   string `json:"fundus_periph_od"   gorm:"type:text"`
	FundusPeriphOi   string `json:"fundus_periph_oi"   gorm:"type:text"`

	// Motilidad Ocular
	MotilityVersions  string `json:"motility_versions"  gorm:"type:text"`
	MotilityHirschberg string `json:"motility_hirschberg" gorm:"type:text"`
	MotilityCoverTest  string `json:"motility_cover_test" gorm:"type:text"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Diagnosis stores the ICD-10 diagnosis and care plan for a ClinicalRecord.
type Diagnosis struct {
	ID               uint `json:"id"                 gorm:"primaryKey;autoIncrement"`
	ClinicalRecordID uint `json:"clinical_record_id"  gorm:"not null;uniqueIndex"`
	ClinicID         uint `json:"clinic_id"           gorm:"not null;index"`

	PrimaryCode        string `json:"primary_code"        gorm:"type:varchar(20);not null"`
	PrimaryDescription string `json:"primary_description" gorm:"type:text;not null"`
	DiagnosisType      int    `json:"diagnosis_type"      gorm:"not null;default:1"`

	Related1Code string `json:"related_1_code" gorm:"type:varchar(20)"`
	Related1Desc string `json:"related_1_desc"  gorm:"type:text"`
	Related2Code string `json:"related_2_code" gorm:"type:varchar(20)"`
	Related2Desc string `json:"related_2_desc"  gorm:"type:text"`
	Related3Code string `json:"related_3_code" gorm:"type:varchar(20)"`
	Related3Desc string `json:"related_3_desc"  gorm:"type:text"`

	OpticalCorrectionPlan string     `json:"optical_correction_plan" gorm:"type:varchar(50)"`
	PatientEducation      string     `json:"patient_education"        gorm:"type:text"`
	NextControlDate       *time.Time `json:"next_control_date"        gorm:"type:timestamptz"`
	NextControlReason     string     `json:"next_control_reason"      gorm:"type:varchar(50)"`
	RequiresReferral      bool       `json:"requires_referral"`
	ReferralNotes         string     `json:"referral_notes"           gorm:"type:text"`
	Cups                  string     `json:"cups"                     gorm:"type:varchar(20)"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ClinicalPrescription stores the optical formula issued at the end of a clinical encounter.
// TableName maps this struct to the "prescriptions" table.
func (ClinicalPrescription) TableName() string { return "prescriptions" }

type ClinicalPrescription struct {
	ID               uint `json:"id"                gorm:"primaryKey;autoIncrement"`
	ClinicalRecordID uint `json:"clinical_record_id" gorm:"not null;uniqueIndex"`
	ClinicID         uint `json:"clinic_id"          gorm:"not null;index"`

	SphOd  *float64 `json:"sph_od"  gorm:"type:numeric(10,4)"`
	CylOd  *float64 `json:"cyl_od"  gorm:"type:numeric(10,4)"`
	AxisOd *int     `json:"axis_od"`
	AvccOd string   `json:"avcc_od" gorm:"type:varchar(20)"`
	AddOd  *float64 `json:"add_od"  gorm:"type:numeric(10,4)"`
	DpOd   *float64 `json:"dp_od"   gorm:"type:numeric(6,2)"`

	SphOi  *float64 `json:"sph_oi"  gorm:"type:numeric(10,4)"`
	CylOi  *float64 `json:"cyl_oi"  gorm:"type:numeric(10,4)"`
	AxisOi *int     `json:"axis_oi"`
	AvccOi string   `json:"avcc_oi" gorm:"type:varchar(20)"`
	AddOi  *float64 `json:"add_oi"  gorm:"type:numeric(10,4)"`
	DpOi   *float64 `json:"dp_oi"   gorm:"type:numeric(6,2)"`

	LensType       string      `json:"lens_type"       gorm:"type:varchar(50)"`
	LensMaterial   string      `json:"lens_material"   gorm:"type:varchar(50)"`
	LensUse        string      `json:"lens_use"        gorm:"type:varchar(50)"`
	MountingHeight *float64    `json:"mounting_height" gorm:"type:numeric(6,2)"`
	Treatments     StringSlice `json:"treatments"      gorm:"type:jsonb"`
	ValidityMonths int         `json:"validity_months" gorm:"default:12"`

	ProfessionalTp string     `json:"professional_tp" gorm:"type:varchar(50)"`
	SignedAt        *time.Time `json:"signed_at"       gorm:"type:timestamptz"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ClinicalRecordRepository defines persistence operations for ClinicalRecord.
type ClinicalRecordRepository interface {
	GetByAppointmentID(appointmentID uint) (*ClinicalRecord, error)
	Create(r *ClinicalRecord) error
	UpsertAnamnesis(clinicalRecordID uint, clinicID uint, a *Anamnesis) error
	UpsertVisualExam(clinicalRecordID uint, clinicID uint, v *VisualExam) error
	UpsertDiagnosis(clinicalRecordID uint, clinicID uint, d *Diagnosis) error
	UpsertPrescription(clinicalRecordID uint, clinicID uint, p *ClinicalPrescription) error
	SignClinicalRecord(clinicalRecordID uint, professionalTp string) error
}
