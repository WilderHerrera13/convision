package clinic

import (
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles clinical history use-cases.
type Service struct {
	histories  domain.ClinicalHistoryRepository
	evolutions domain.ClinicalEvolutionRepository
	patients   domain.PatientRepository
	logger     *zap.Logger
}

// NewService creates a new clinical history Service.
func NewService(
	histories domain.ClinicalHistoryRepository,
	evolutions domain.ClinicalEvolutionRepository,
	patients domain.PatientRepository,
	logger *zap.Logger,
) *Service {
	return &Service{histories: histories, evolutions: evolutions, patients: patients, logger: logger}
}

// --- DTOs ---

// CreateInput holds validated fields for creating a clinical history.
type CreateInput struct {
	PatientID                       uint   `json:"patient_id"                        binding:"required"`
	CreatedBy                       *uint  `json:"created_by"`
	ReasonForConsultation           string `json:"reason_for_consultation"`
	CurrentIllness                  string `json:"current_illness"`
	PersonalHistory                 string `json:"personal_history"`
	FamilyHistory                   string `json:"family_history"`
	OccupationalHistory             string `json:"occupational_history"`
	UsesOpticalCorrection           bool   `json:"uses_optical_correction"`
	OpticalCorrectionType           string `json:"optical_correction_type"`
	LastControlDetail               string `json:"last_control_detail"`
	OphthalmologicalDiagnosis       string `json:"ophthalmological_diagnosis"`
	EyeSurgery                      string `json:"eye_surgery"`
	HasSystemicDisease              bool   `json:"has_systemic_disease"`
	SystemicDiseaseDetail           string `json:"systemic_disease_detail"`
	Medications                     string `json:"medications"`
	Allergies                       string `json:"allergies"`
	RightFarVisionNoCorrection      string `json:"right_far_vision_no_correction"`
	LeftFarVisionNoCorrection       string `json:"left_far_vision_no_correction"`
	RightNearVisionNoCorrection     string `json:"right_near_vision_no_correction"`
	LeftNearVisionNoCorrection      string `json:"left_near_vision_no_correction"`
	RightFarVisionWithCorrection    string `json:"right_far_vision_with_correction"`
	LeftFarVisionWithCorrection     string `json:"left_far_vision_with_correction"`
	RightNearVisionWithCorrection   string `json:"right_near_vision_with_correction"`
	LeftNearVisionWithCorrection    string `json:"left_near_vision_with_correction"`
	RightEyeExternalExam            string `json:"right_eye_external_exam"`
	LeftEyeExternalExam             string `json:"left_eye_external_exam"`
	RightEyeOphthalmoscopy          string `json:"right_eye_ophthalmoscopy"`
	LeftEyeOphthalmoscopy           string `json:"left_eye_ophthalmoscopy"`
	RightEyeHorizontalK             string `json:"right_eye_horizontal_k"`
	RightEyeVerticalK               string `json:"right_eye_vertical_k"`
	LeftEyeHorizontalK              string `json:"left_eye_horizontal_k"`
	LeftEyeVerticalK                string `json:"left_eye_vertical_k"`
	RefractionTechnique             string `json:"refraction_technique"`
	RightEyeStaticSphere            string `json:"right_eye_static_sphere"`
	RightEyeStaticCylinder          string `json:"right_eye_static_cylinder"`
	RightEyeStaticAxis              string `json:"right_eye_static_axis"`
	RightEyeStaticVisualAcuity      string `json:"right_eye_static_visual_acuity"`
	LeftEyeStaticSphere             string `json:"left_eye_static_sphere"`
	LeftEyeStaticCylinder           string `json:"left_eye_static_cylinder"`
	LeftEyeStaticAxis               string `json:"left_eye_static_axis"`
	LeftEyeStaticVisualAcuity       string `json:"left_eye_static_visual_acuity"`
	RightEyeSubjectiveSphere        string `json:"right_eye_subjective_sphere"`
	RightEyeSubjectiveCylinder      string `json:"right_eye_subjective_cylinder"`
	RightEyeSubjectiveAxis          string `json:"right_eye_subjective_axis"`
	RightEyeSubjectiveVisualAcuity  string `json:"right_eye_subjective_visual_acuity"`
	LeftEyeSubjectiveSphere         string `json:"left_eye_subjective_sphere"`
	LeftEyeSubjectiveCylinder       string `json:"left_eye_subjective_cylinder"`
	LeftEyeSubjectiveAxis           string `json:"left_eye_subjective_axis"`
	LeftEyeSubjectiveVisualAcuity   string `json:"left_eye_subjective_visual_acuity"`
	Diagnostic                      string `json:"diagnostic"`
	TreatmentPlan                   string `json:"treatment_plan"`
	Observations                    string `json:"observations"`
}

// UpdateInput holds validated fields for updating a clinical history (all optional).
type UpdateInput struct {
	UpdatedBy                       *uint  `json:"updated_by"`
	ReasonForConsultation           string `json:"reason_for_consultation"`
	CurrentIllness                  string `json:"current_illness"`
	PersonalHistory                 string `json:"personal_history"`
	FamilyHistory                   string `json:"family_history"`
	OccupationalHistory             string `json:"occupational_history"`
	UsesOpticalCorrection           *bool  `json:"uses_optical_correction"`
	OpticalCorrectionType           string `json:"optical_correction_type"`
	LastControlDetail               string `json:"last_control_detail"`
	OphthalmologicalDiagnosis       string `json:"ophthalmological_diagnosis"`
	EyeSurgery                      string `json:"eye_surgery"`
	HasSystemicDisease              *bool  `json:"has_systemic_disease"`
	SystemicDiseaseDetail           string `json:"systemic_disease_detail"`
	Medications                     string `json:"medications"`
	Allergies                       string `json:"allergies"`
	RightFarVisionNoCorrection      string `json:"right_far_vision_no_correction"`
	LeftFarVisionNoCorrection       string `json:"left_far_vision_no_correction"`
	RightNearVisionNoCorrection     string `json:"right_near_vision_no_correction"`
	LeftNearVisionNoCorrection      string `json:"left_near_vision_no_correction"`
	RightFarVisionWithCorrection    string `json:"right_far_vision_with_correction"`
	LeftFarVisionWithCorrection     string `json:"left_far_vision_with_correction"`
	RightNearVisionWithCorrection   string `json:"right_near_vision_with_correction"`
	LeftNearVisionWithCorrection    string `json:"left_near_vision_with_correction"`
	RightEyeExternalExam            string `json:"right_eye_external_exam"`
	LeftEyeExternalExam             string `json:"left_eye_external_exam"`
	RightEyeOphthalmoscopy          string `json:"right_eye_ophthalmoscopy"`
	LeftEyeOphthalmoscopy           string `json:"left_eye_ophthalmoscopy"`
	RightEyeHorizontalK             string `json:"right_eye_horizontal_k"`
	RightEyeVerticalK               string `json:"right_eye_vertical_k"`
	LeftEyeHorizontalK              string `json:"left_eye_horizontal_k"`
	LeftEyeVerticalK                string `json:"left_eye_vertical_k"`
	RefractionTechnique             string `json:"refraction_technique"`
	RightEyeStaticSphere            string `json:"right_eye_static_sphere"`
	RightEyeStaticCylinder          string `json:"right_eye_static_cylinder"`
	RightEyeStaticAxis              string `json:"right_eye_static_axis"`
	RightEyeStaticVisualAcuity      string `json:"right_eye_static_visual_acuity"`
	LeftEyeStaticSphere             string `json:"left_eye_static_sphere"`
	LeftEyeStaticCylinder           string `json:"left_eye_static_cylinder"`
	LeftEyeStaticAxis               string `json:"left_eye_static_axis"`
	LeftEyeStaticVisualAcuity       string `json:"left_eye_static_visual_acuity"`
	RightEyeSubjectiveSphere        string `json:"right_eye_subjective_sphere"`
	RightEyeSubjectiveCylinder      string `json:"right_eye_subjective_cylinder"`
	RightEyeSubjectiveAxis          string `json:"right_eye_subjective_axis"`
	RightEyeSubjectiveVisualAcuity  string `json:"right_eye_subjective_visual_acuity"`
	LeftEyeSubjectiveSphere         string `json:"left_eye_subjective_sphere"`
	LeftEyeSubjectiveCylinder       string `json:"left_eye_subjective_cylinder"`
	LeftEyeSubjectiveAxis           string `json:"left_eye_subjective_axis"`
	LeftEyeSubjectiveVisualAcuity   string `json:"left_eye_subjective_visual_acuity"`
	Diagnostic                      string `json:"diagnostic"`
	TreatmentPlan                   string `json:"treatment_plan"`
	Observations                    string `json:"observations"`
}

// CreateEvolutionInput holds validated fields for creating a clinical evolution.
type CreateEvolutionInput struct {
	ClinicalHistoryID    uint   `json:"clinical_history_id" binding:"required"`
	AppointmentID        *uint  `json:"appointment_id"`
	CreatedBy            *uint  `json:"created_by"`
	EvolutionDate        string `json:"evolution_date"`
	Subjective           string `json:"subjective"`
	Objective            string `json:"objective"`
	Assessment           string `json:"assessment"`
	Plan                 string `json:"plan"`
	Recommendations      string `json:"recommendations"`
	RightFarVision       string `json:"right_far_vision"`
	LeftFarVision        string `json:"left_far_vision"`
	RightNearVision      string `json:"right_near_vision"`
	LeftNearVision       string `json:"left_near_vision"`
	RightEyeSphere       string `json:"right_eye_sphere"`
	RightEyeCylinder     string `json:"right_eye_cylinder"`
	RightEyeAxis         string `json:"right_eye_axis"`
	RightEyeVisualAcuity string `json:"right_eye_visual_acuity"`
	LeftEyeSphere        string `json:"left_eye_sphere"`
	LeftEyeCylinder      string `json:"left_eye_cylinder"`
	LeftEyeAxis          string `json:"left_eye_axis"`
	LeftEyeVisualAcuity  string `json:"left_eye_visual_acuity"`
}

// UpdateEvolutionInput holds validated fields for updating a clinical evolution.
type UpdateEvolutionInput struct {
	UpdatedBy            *uint  `json:"updated_by"`
	AppointmentID        *uint  `json:"appointment_id"`
	EvolutionDate        string `json:"evolution_date"`
	Subjective           string `json:"subjective"`
	Objective            string `json:"objective"`
	Assessment           string `json:"assessment"`
	Plan                 string `json:"plan"`
	Recommendations      string `json:"recommendations"`
	RightFarVision       string `json:"right_far_vision"`
	LeftFarVision        string `json:"left_far_vision"`
	RightNearVision      string `json:"right_near_vision"`
	LeftNearVision       string `json:"left_near_vision"`
	RightEyeSphere       string `json:"right_eye_sphere"`
	RightEyeCylinder     string `json:"right_eye_cylinder"`
	RightEyeAxis         string `json:"right_eye_axis"`
	RightEyeVisualAcuity string `json:"right_eye_visual_acuity"`
	LeftEyeSphere        string `json:"left_eye_sphere"`
	LeftEyeCylinder      string `json:"left_eye_cylinder"`
	LeftEyeAxis          string `json:"left_eye_axis"`
	LeftEyeVisualAcuity  string `json:"left_eye_visual_acuity"`
}

// ListOutput holds paginated clinical history results.
type ListOutput struct {
	Data        []*domain.ClinicalHistory `json:"data"`
	Total       int64                     `json:"total"`
	CurrentPage int                       `json:"current_page"`
	LastPage    int                       `json:"last_page"`
	PerPage     int                       `json:"per_page"`
}

// EvolutionListOutput holds paginated clinical evolution results.
type EvolutionListOutput struct {
	Data        []*domain.ClinicalEvolution `json:"data"`
	Total       int64                       `json:"total"`
	CurrentPage int                         `json:"current_page"`
	LastPage    int                         `json:"last_page"`
	PerPage     int                         `json:"per_page"`
}

func clampPage(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	return page, perPage
}

// GetByID returns a single clinical history record (with evolutions).
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.ClinicalHistory, error) {
	return s.histories.GetByID(db, id)
}

// GetByPatientIDSingle returns the single clinical history for a patient.
func (s *Service) GetByPatientIDSingle(db *gorm.DB, patientID uint) (*domain.ClinicalHistory, error) {
	return s.histories.GetSingleByPatientID(db, patientID)
}

// List returns paginated clinical histories with optional filters.
func (s *Service) List(db *gorm.DB, filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.histories.List(db, filters, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := int(math.Ceil(float64(total) / float64(perPage)))
	if lastPage < 1 {
		lastPage = 1
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, LastPage: lastPage, PerPage: perPage}, nil
}

// ListByPatient returns paginated clinical histories for a given patient.
func (s *Service) ListByPatient(db *gorm.DB, patientID uint, page, perPage int) ([]*domain.ClinicalHistory, int64, error) {
	page, perPage = clampPage(page, perPage)
	return s.histories.GetByPatientID(db, patientID, page, perPage)
}

// Create opens a new clinical history for a patient.
func (s *Service) Create(db *gorm.DB, input CreateInput) (*domain.ClinicalHistory, error) {
	if _, err := s.patients.GetByID(db, input.PatientID); err != nil {
		return nil, err
	}

	h := &domain.ClinicalHistory{
		PatientID:                      input.PatientID,
		CreatedBy:                      input.CreatedBy,
		UpdatedBy:                      input.CreatedBy,
		ReasonForConsultation:          input.ReasonForConsultation,
		CurrentIllness:                 input.CurrentIllness,
		PersonalHistory:                input.PersonalHistory,
		FamilyHistory:                  input.FamilyHistory,
		OccupationalHistory:            input.OccupationalHistory,
		UsesOpticalCorrection:          input.UsesOpticalCorrection,
		OpticalCorrectionType:          input.OpticalCorrectionType,
		LastControlDetail:              input.LastControlDetail,
		OphthalmologicalDiagnosis:      input.OphthalmologicalDiagnosis,
		EyeSurgery:                     input.EyeSurgery,
		HasSystemicDisease:             input.HasSystemicDisease,
		SystemicDiseaseDetail:          input.SystemicDiseaseDetail,
		Medications:                    input.Medications,
		Allergies:                      input.Allergies,
		RightFarVisionNoCorrection:     input.RightFarVisionNoCorrection,
		LeftFarVisionNoCorrection:      input.LeftFarVisionNoCorrection,
		RightNearVisionNoCorrection:    input.RightNearVisionNoCorrection,
		LeftNearVisionNoCorrection:     input.LeftNearVisionNoCorrection,
		RightFarVisionWithCorrection:   input.RightFarVisionWithCorrection,
		LeftFarVisionWithCorrection:    input.LeftFarVisionWithCorrection,
		RightNearVisionWithCorrection:  input.RightNearVisionWithCorrection,
		LeftNearVisionWithCorrection:   input.LeftNearVisionWithCorrection,
		RightEyeExternalExam:           input.RightEyeExternalExam,
		LeftEyeExternalExam:            input.LeftEyeExternalExam,
		RightEyeOphthalmoscopy:         input.RightEyeOphthalmoscopy,
		LeftEyeOphthalmoscopy:          input.LeftEyeOphthalmoscopy,
		RightEyeHorizontalK:            input.RightEyeHorizontalK,
		RightEyeVerticalK:              input.RightEyeVerticalK,
		LeftEyeHorizontalK:             input.LeftEyeHorizontalK,
		LeftEyeVerticalK:               input.LeftEyeVerticalK,
		RefractionTechnique:            input.RefractionTechnique,
		RightEyeStaticSphere:           input.RightEyeStaticSphere,
		RightEyeStaticCylinder:         input.RightEyeStaticCylinder,
		RightEyeStaticAxis:             input.RightEyeStaticAxis,
		RightEyeStaticVisualAcuity:     input.RightEyeStaticVisualAcuity,
		LeftEyeStaticSphere:            input.LeftEyeStaticSphere,
		LeftEyeStaticCylinder:          input.LeftEyeStaticCylinder,
		LeftEyeStaticAxis:              input.LeftEyeStaticAxis,
		LeftEyeStaticVisualAcuity:      input.LeftEyeStaticVisualAcuity,
		RightEyeSubjectiveSphere:       input.RightEyeSubjectiveSphere,
		RightEyeSubjectiveCylinder:     input.RightEyeSubjectiveCylinder,
		RightEyeSubjectiveAxis:         input.RightEyeSubjectiveAxis,
		RightEyeSubjectiveVisualAcuity: input.RightEyeSubjectiveVisualAcuity,
		LeftEyeSubjectiveSphere:        input.LeftEyeSubjectiveSphere,
		LeftEyeSubjectiveCylinder:      input.LeftEyeSubjectiveCylinder,
		LeftEyeSubjectiveAxis:          input.LeftEyeSubjectiveAxis,
		LeftEyeSubjectiveVisualAcuity:  input.LeftEyeSubjectiveVisualAcuity,
		Diagnostic:                     input.Diagnostic,
		TreatmentPlan:                  input.TreatmentPlan,
		Observations:                   input.Observations,
	}

	if err := s.histories.Create(db, h); err != nil {
		return nil, err
	}

	s.logger.Info("clinical history created",
		zap.Uint("history_id", h.ID),
		zap.Uint("patient_id", h.PatientID),
	)
	return s.histories.GetByID(db, h.ID)
}

// Update modifies an existing clinical history.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.ClinicalHistory, error) {
	h, err := s.histories.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	h.UpdatedBy = input.UpdatedBy
	if input.ReasonForConsultation != "" {
		h.ReasonForConsultation = input.ReasonForConsultation
	}
	if input.CurrentIllness != "" {
		h.CurrentIllness = input.CurrentIllness
	}
	if input.PersonalHistory != "" {
		h.PersonalHistory = input.PersonalHistory
	}
	if input.FamilyHistory != "" {
		h.FamilyHistory = input.FamilyHistory
	}
	if input.OccupationalHistory != "" {
		h.OccupationalHistory = input.OccupationalHistory
	}
	if input.UsesOpticalCorrection != nil {
		h.UsesOpticalCorrection = *input.UsesOpticalCorrection
	}
	if input.OpticalCorrectionType != "" {
		h.OpticalCorrectionType = input.OpticalCorrectionType
	}
	if input.LastControlDetail != "" {
		h.LastControlDetail = input.LastControlDetail
	}
	if input.OphthalmologicalDiagnosis != "" {
		h.OphthalmologicalDiagnosis = input.OphthalmologicalDiagnosis
	}
	if input.EyeSurgery != "" {
		h.EyeSurgery = input.EyeSurgery
	}
	if input.HasSystemicDisease != nil {
		h.HasSystemicDisease = *input.HasSystemicDisease
	}
	if input.SystemicDiseaseDetail != "" {
		h.SystemicDiseaseDetail = input.SystemicDiseaseDetail
	}
	if input.Medications != "" {
		h.Medications = input.Medications
	}
	if input.Allergies != "" {
		h.Allergies = input.Allergies
	}
	h.RightFarVisionNoCorrection = input.RightFarVisionNoCorrection
	h.LeftFarVisionNoCorrection = input.LeftFarVisionNoCorrection
	h.RightNearVisionNoCorrection = input.RightNearVisionNoCorrection
	h.LeftNearVisionNoCorrection = input.LeftNearVisionNoCorrection
	h.RightFarVisionWithCorrection = input.RightFarVisionWithCorrection
	h.LeftFarVisionWithCorrection = input.LeftFarVisionWithCorrection
	h.RightNearVisionWithCorrection = input.RightNearVisionWithCorrection
	h.LeftNearVisionWithCorrection = input.LeftNearVisionWithCorrection
	h.RightEyeExternalExam = input.RightEyeExternalExam
	h.LeftEyeExternalExam = input.LeftEyeExternalExam
	h.RightEyeOphthalmoscopy = input.RightEyeOphthalmoscopy
	h.LeftEyeOphthalmoscopy = input.LeftEyeOphthalmoscopy
	h.RightEyeHorizontalK = input.RightEyeHorizontalK
	h.RightEyeVerticalK = input.RightEyeVerticalK
	h.LeftEyeHorizontalK = input.LeftEyeHorizontalK
	h.LeftEyeVerticalK = input.LeftEyeVerticalK
	h.RefractionTechnique = input.RefractionTechnique
	h.RightEyeStaticSphere = input.RightEyeStaticSphere
	h.RightEyeStaticCylinder = input.RightEyeStaticCylinder
	h.RightEyeStaticAxis = input.RightEyeStaticAxis
	h.RightEyeStaticVisualAcuity = input.RightEyeStaticVisualAcuity
	h.LeftEyeStaticSphere = input.LeftEyeStaticSphere
	h.LeftEyeStaticCylinder = input.LeftEyeStaticCylinder
	h.LeftEyeStaticAxis = input.LeftEyeStaticAxis
	h.LeftEyeStaticVisualAcuity = input.LeftEyeStaticVisualAcuity
	h.RightEyeSubjectiveSphere = input.RightEyeSubjectiveSphere
	h.RightEyeSubjectiveCylinder = input.RightEyeSubjectiveCylinder
	h.RightEyeSubjectiveAxis = input.RightEyeSubjectiveAxis
	h.RightEyeSubjectiveVisualAcuity = input.RightEyeSubjectiveVisualAcuity
	h.LeftEyeSubjectiveSphere = input.LeftEyeSubjectiveSphere
	h.LeftEyeSubjectiveCylinder = input.LeftEyeSubjectiveCylinder
	h.LeftEyeSubjectiveAxis = input.LeftEyeSubjectiveAxis
	h.LeftEyeSubjectiveVisualAcuity = input.LeftEyeSubjectiveVisualAcuity
	if input.Diagnostic != "" {
		h.Diagnostic = input.Diagnostic
	}
	if input.TreatmentPlan != "" {
		h.TreatmentPlan = input.TreatmentPlan
	}
	if input.Observations != "" {
		h.Observations = input.Observations
	}

	if err := s.histories.Update(db, h); err != nil {
		return nil, err
	}

	s.logger.Info("clinical history updated", zap.Uint("history_id", h.ID))
	return s.histories.GetByID(db, h.ID)
}

// GetEvolutionByID returns a single clinical evolution.
func (s *Service) GetEvolutionByID(db *gorm.DB, id uint) (*domain.ClinicalEvolution, error) {
	return s.evolutions.GetByID(db, id)
}

// ListEvolutions returns paginated evolutions for a given clinical history.
func (s *Service) ListEvolutions(db *gorm.DB, historyID uint, page, perPage int) (*EvolutionListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.evolutions.GetByClinicalHistoryID(db, historyID, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := int(math.Ceil(float64(total) / float64(perPage)))
	if lastPage < 1 {
		lastPage = 1
	}
	return &EvolutionListOutput{Data: data, Total: total, CurrentPage: page, LastPage: lastPage, PerPage: perPage}, nil
}

// CreateEvolution adds a new evolution note to a clinical history.
func (s *Service) CreateEvolution(db *gorm.DB, input CreateEvolutionInput) (*domain.ClinicalEvolution, error) {
	if _, err := s.histories.GetByID(db, input.ClinicalHistoryID); err != nil {
		return nil, err
	}

	e := &domain.ClinicalEvolution{
		ClinicalHistoryID:    input.ClinicalHistoryID,
		AppointmentID:        input.AppointmentID,
		CreatedBy:            input.CreatedBy,
		UpdatedBy:            input.CreatedBy,
		Subjective:           input.Subjective,
		Objective:            input.Objective,
		Assessment:           input.Assessment,
		Plan:                 input.Plan,
		Recommendations:      input.Recommendations,
		RightFarVision:       input.RightFarVision,
		LeftFarVision:        input.LeftFarVision,
		RightNearVision:      input.RightNearVision,
		LeftNearVision:       input.LeftNearVision,
		RightEyeSphere:       input.RightEyeSphere,
		RightEyeCylinder:     input.RightEyeCylinder,
		RightEyeAxis:         input.RightEyeAxis,
		RightEyeVisualAcuity: input.RightEyeVisualAcuity,
		LeftEyeSphere:        input.LeftEyeSphere,
		LeftEyeCylinder:      input.LeftEyeCylinder,
		LeftEyeAxis:          input.LeftEyeAxis,
		LeftEyeVisualAcuity:  input.LeftEyeVisualAcuity,
	}

	if input.EvolutionDate != "" {
		t, err := time.Parse("2006-01-02", input.EvolutionDate)
		if err == nil {
			e.EvolutionDate = &t
		}
	}

	if err := s.evolutions.Create(db, e); err != nil {
		return nil, err
	}

	s.logger.Info("clinical evolution created", zap.Uint("evolution_id", e.ID))
	return s.evolutions.GetByID(db, e.ID)
}

// UpdateEvolution modifies an existing clinical evolution.
func (s *Service) UpdateEvolution(db *gorm.DB, id uint, input UpdateEvolutionInput) (*domain.ClinicalEvolution, error) {
	e, err := s.evolutions.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	e.UpdatedBy = input.UpdatedBy
	if input.AppointmentID != nil {
		e.AppointmentID = input.AppointmentID
	}
	if input.EvolutionDate != "" {
		t, parseErr := time.Parse("2006-01-02", input.EvolutionDate)
		if parseErr == nil {
			e.EvolutionDate = &t
		}
	}
	e.Subjective = input.Subjective
	e.Objective = input.Objective
	e.Assessment = input.Assessment
	e.Plan = input.Plan
	e.Recommendations = input.Recommendations
	e.RightFarVision = input.RightFarVision
	e.LeftFarVision = input.LeftFarVision
	e.RightNearVision = input.RightNearVision
	e.LeftNearVision = input.LeftNearVision
	e.RightEyeSphere = input.RightEyeSphere
	e.RightEyeCylinder = input.RightEyeCylinder
	e.RightEyeAxis = input.RightEyeAxis
	e.RightEyeVisualAcuity = input.RightEyeVisualAcuity
	e.LeftEyeSphere = input.LeftEyeSphere
	e.LeftEyeCylinder = input.LeftEyeCylinder
	e.LeftEyeAxis = input.LeftEyeAxis
	e.LeftEyeVisualAcuity = input.LeftEyeVisualAcuity

	if err := s.evolutions.Update(db, e); err != nil {
		return nil, err
	}

	s.logger.Info("clinical evolution updated", zap.Uint("evolution_id", e.ID))
	return s.evolutions.GetByID(db, e.ID)
}

// DeleteEvolution removes a clinical evolution.
func (s *Service) DeleteEvolution(db *gorm.DB, id uint) error {
	if _, err := s.evolutions.GetByID(db, id); err != nil {
		return err
	}
	return s.evolutions.Delete(db, id)
}
