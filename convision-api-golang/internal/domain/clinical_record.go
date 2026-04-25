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

	Anamnesis *Anamnesis `json:"anamnesis,omitempty" gorm:"foreignKey:ClinicalRecordID"`
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

// ClinicalRecordRepository defines persistence operations for ClinicalRecord.
type ClinicalRecordRepository interface {
	GetByAppointmentID(appointmentID uint) (*ClinicalRecord, error)
	Create(r *ClinicalRecord) error
	UpsertAnamnesis(clinicalRecordID uint, clinicID uint, a *Anamnesis) error
}
