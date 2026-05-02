package domain

import (
	"time"

	"gorm.io/gorm"
)

// ClinicalHistory represents a patient's full clinical history record.
type ClinicalHistory struct {
	ID                              uint      `json:"id"                                gorm:"primaryKey;autoIncrement"`
	PatientID                       uint      `json:"patient_id"                        gorm:"not null;index"`
	CreatedBy                       *uint     `json:"created_by"                        gorm:"column:created_by"`
	UpdatedBy                       *uint     `json:"updated_by"                        gorm:"column:updated_by"`
	ReasonForConsultation           string    `json:"reason_for_consultation"           gorm:"type:text"`
	CurrentIllness                  string    `json:"current_illness"                   gorm:"type:text"`
	PersonalHistory                 string    `json:"personal_history"                  gorm:"type:text"`
	FamilyHistory                   string    `json:"family_history"                    gorm:"type:text"`
	OccupationalHistory             string    `json:"occupational_history"              gorm:"type:text"`
	UsesOpticalCorrection           bool      `json:"uses_optical_correction"`
	OpticalCorrectionType           string    `json:"optical_correction_type"`
	LastControlDetail               string    `json:"last_control_detail"               gorm:"type:text"`
	OphthalmologicalDiagnosis       string    `json:"ophthalmological_diagnosis"        gorm:"type:text"`
	EyeSurgery                      string    `json:"eye_surgery"                       gorm:"type:text"`
	HasSystemicDisease              bool      `json:"has_systemic_disease"`
	SystemicDiseaseDetail           string    `json:"systemic_disease_detail"           gorm:"type:text"`
	Medications                     string    `json:"medications"                       gorm:"type:text"`
	Allergies                       string    `json:"allergies"                         gorm:"type:text"`
	RightFarVisionNoCorrection      string    `json:"right_far_vision_no_correction"`
	LeftFarVisionNoCorrection       string    `json:"left_far_vision_no_correction"`
	RightNearVisionNoCorrection     string    `json:"right_near_vision_no_correction"`
	LeftNearVisionNoCorrection      string    `json:"left_near_vision_no_correction"`
	RightFarVisionWithCorrection    string    `json:"right_far_vision_with_correction"`
	LeftFarVisionWithCorrection     string    `json:"left_far_vision_with_correction"`
	RightNearVisionWithCorrection   string    `json:"right_near_vision_with_correction"`
	LeftNearVisionWithCorrection    string    `json:"left_near_vision_with_correction"`
	RightEyeExternalExam            string    `json:"right_eye_external_exam"           gorm:"type:text"`
	LeftEyeExternalExam             string    `json:"left_eye_external_exam"            gorm:"type:text"`
	RightEyeOphthalmoscopy          string    `json:"right_eye_ophthalmoscopy"          gorm:"type:text"`
	LeftEyeOphthalmoscopy           string    `json:"left_eye_ophthalmoscopy"           gorm:"type:text"`
	RightEyeHorizontalK             string    `json:"right_eye_horizontal_k"`
	RightEyeVerticalK               string    `json:"right_eye_vertical_k"`
	LeftEyeHorizontalK              string    `json:"left_eye_horizontal_k"`
	LeftEyeVerticalK                string    `json:"left_eye_vertical_k"`
	RefractionTechnique             string    `json:"refraction_technique"`
	RightEyeStaticSphere            string    `json:"right_eye_static_sphere"`
	RightEyeStaticCylinder          string    `json:"right_eye_static_cylinder"`
	RightEyeStaticAxis              string    `json:"right_eye_static_axis"`
	RightEyeStaticVisualAcuity      string    `json:"right_eye_static_visual_acuity"`
	LeftEyeStaticSphere             string    `json:"left_eye_static_sphere"`
	LeftEyeStaticCylinder           string    `json:"left_eye_static_cylinder"`
	LeftEyeStaticAxis               string    `json:"left_eye_static_axis"`
	LeftEyeStaticVisualAcuity       string    `json:"left_eye_static_visual_acuity"`
	RightEyeSubjectiveSphere        string    `json:"right_eye_subjective_sphere"`
	RightEyeSubjectiveCylinder      string    `json:"right_eye_subjective_cylinder"`
	RightEyeSubjectiveAxis          string    `json:"right_eye_subjective_axis"`
	RightEyeSubjectiveVisualAcuity  string    `json:"right_eye_subjective_visual_acuity"`
	LeftEyeSubjectiveSphere         string    `json:"left_eye_subjective_sphere"`
	LeftEyeSubjectiveCylinder       string    `json:"left_eye_subjective_cylinder"`
	LeftEyeSubjectiveAxis           string    `json:"left_eye_subjective_axis"`
	LeftEyeSubjectiveVisualAcuity   string    `json:"left_eye_subjective_visual_acuity"`
	Diagnostic                      string    `json:"diagnostic"                        gorm:"type:text"`
	TreatmentPlan                   string    `json:"treatment_plan"                    gorm:"type:text"`
	Observations                    string    `json:"observations"                      gorm:"type:text"`
	CreatedAt                       time.Time `json:"created_at"`
	UpdatedAt                       time.Time `json:"updated_at"`

	// Associations
	Patient    *Patient `json:"patient,omitempty"    gorm:"foreignKey:PatientID"`
	Creator    *User    `json:"creator,omitempty"    gorm:"foreignKey:CreatedBy"`
	Updater    *User    `json:"updater,omitempty"    gorm:"foreignKey:UpdatedBy"`
	Evolutions []ClinicalEvolution `json:"evolutions,omitempty" gorm:"foreignKey:ClinicalHistoryID"`
}

// ClinicalEvolution represents a follow-up evolution note for a clinical history.
type ClinicalEvolution struct {
	ID                    uint       `json:"id"                     gorm:"primaryKey;autoIncrement"`
	ClinicalHistoryID     uint       `json:"clinical_history_id"    gorm:"not null;index"`
	AppointmentID         *uint      `json:"appointment_id"         gorm:"column:appointment_id"`
	CreatedBy             *uint      `json:"created_by"             gorm:"column:created_by"`
	UpdatedBy             *uint      `json:"updated_by"             gorm:"column:updated_by"`
	EvolutionDate         *time.Time `json:"evolution_date"`
	Subjective            string     `json:"subjective"             gorm:"type:text"`
	Objective             string     `json:"objective"              gorm:"type:text"`
	Assessment            string     `json:"assessment"             gorm:"type:text"`
	Plan                  string     `json:"plan"                   gorm:"type:text"`
	Recommendations       string     `json:"recommendations"        gorm:"type:text"`
	RightFarVision        string     `json:"right_far_vision"`
	LeftFarVision         string     `json:"left_far_vision"`
	RightNearVision       string     `json:"right_near_vision"`
	LeftNearVision        string     `json:"left_near_vision"`
	RightEyeSphere        string     `json:"right_eye_sphere"`
	RightEyeCylinder      string     `json:"right_eye_cylinder"`
	RightEyeAxis          string     `json:"right_eye_axis"`
	RightEyeVisualAcuity  string     `json:"right_eye_visual_acuity"`
	LeftEyeSphere         string     `json:"left_eye_sphere"`
	LeftEyeCylinder       string     `json:"left_eye_cylinder"`
	LeftEyeAxis           string     `json:"left_eye_axis"`
	LeftEyeVisualAcuity   string     `json:"left_eye_visual_acuity"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`

	// Associations
	ClinicalHistory *ClinicalHistory `json:"clinical_history,omitempty" gorm:"foreignKey:ClinicalHistoryID"`
	Creator         *User            `json:"creator,omitempty"          gorm:"foreignKey:CreatedBy"`
	Updater         *User            `json:"updater,omitempty"          gorm:"foreignKey:UpdatedBy"`
}

// ClinicalHistoryRepository defines persistence operations for ClinicalHistory.
type ClinicalHistoryRepository interface {
	GetByID(db *gorm.DB, id uint) (*ClinicalHistory, error)
	GetByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*ClinicalHistory, int64, error)
	GetSingleByPatientID(db *gorm.DB, patientID uint) (*ClinicalHistory, error)
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*ClinicalHistory, int64, error)
	Create(db *gorm.DB, h *ClinicalHistory) error
	Update(db *gorm.DB, h *ClinicalHistory) error
	Delete(db *gorm.DB, id uint) error
}

// ClinicalEvolutionRepository defines persistence operations for ClinicalEvolution.
type ClinicalEvolutionRepository interface {
	GetByID(db *gorm.DB, id uint) (*ClinicalEvolution, error)
	GetByClinicalHistoryID(db *gorm.DB, historyID uint, page, perPage int) ([]*ClinicalEvolution, int64, error)
	Create(db *gorm.DB, e *ClinicalEvolution) error
	Update(db *gorm.DB, e *ClinicalEvolution) error
	Delete(db *gorm.DB, id uint) error
}
