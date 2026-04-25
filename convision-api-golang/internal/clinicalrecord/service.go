package clinicalrecord

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// AnamnesisInput is the DTO for creating or updating an Anamnesis.
type AnamnesisInput struct {
	ReasonForVisit     string   `json:"reason_for_visit" binding:"required"`
	Onset              string   `json:"onset"`
	Duration           string   `json:"duration"`
	Character          string   `json:"character"`
	AssociatedSymptoms []string `json:"associated_symptoms"`

	HasDiabetes               string   `json:"has_diabetes"`
	DiabetesDiagnosisYear     string   `json:"diabetes_diagnosis_year"`
	DiabetesHba1c             string   `json:"diabetes_hba1c"`
	HasHypertension           string   `json:"has_hypertension"`
	HypertensionDiagnosisYear string   `json:"hypertension_diagnosis_year"`
	HypertensionMedication    string   `json:"hypertension_medication"`
	Allergies                 string   `json:"allergies"`
	CurrentMedications        string   `json:"current_medications"`
	OtherSystemicConditions   []string `json:"other_systemic_conditions"`

	PreviousEyeSurgeries      string `json:"previous_eye_surgeries"`
	LensUse                   string `json:"lens_use"`
	CorrectionType            string `json:"correction_type"`
	LensSatisfaction          string `json:"lens_satisfaction"`
	PreviousOcularTrauma      string `json:"previous_ocular_trauma"`
	PreviousOcularPathologies string `json:"previous_ocular_pathologies"`

	FamilyOphthalmicConditions []string `json:"family_ophthalmic_conditions"`
	FamilyObservations         string   `json:"family_observations"`

	TakesCorticosteroids    bool `json:"takes_corticosteroids"`
	TakesHydroxychloroquine bool `json:"takes_hydroxychloroquine"`
	TakesTamsulosin         bool `json:"takes_tamsulosin"`
	TakesAntihistamines     bool `json:"takes_antihistamines"`
	TakesAntihypertensives  bool `json:"takes_antihypertensives"`
	TakesAmiodarone         bool `json:"takes_amiodarone"`
}

// CreateRecordInput is the DTO for creating a new ClinicalRecord.
type CreateRecordInput struct {
	AppointmentID uint
	PatientID     uint
	SpecialistID  uint
	ClinicID      uint
	RecordType    string `json:"record_type"`
}

// Service implements clinical record use cases.
type Service struct {
	repo   domain.ClinicalRecordRepository
	logger *zap.Logger
}

// NewService creates a new clinical record Service.
func NewService(repo domain.ClinicalRecordRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// GetByAppointmentID retrieves the clinical record for an appointment.
func (s *Service) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	return s.repo.GetByAppointmentID(appointmentID)
}

// Create creates a new clinical record linked to an appointment.
func (s *Service) Create(in CreateRecordInput) (*domain.ClinicalRecord, error) {
	if in.RecordType == "" {
		in.RecordType = "new_consultation"
	}
	rec := &domain.ClinicalRecord{
		ClinicID:      in.ClinicID,
		AppointmentID: in.AppointmentID,
		PatientID:     in.PatientID,
		SpecialistID:  in.SpecialistID,
		RecordType:    in.RecordType,
		Status:        "in_progress",
	}
	if err := s.repo.Create(rec); err != nil {
		s.logger.Error("clinical_record: create failed",
			zap.Error(err),
			zap.Uint("appointment_id", in.AppointmentID),
		)
		return nil, err
	}
	return rec, nil
}

// UpsertAnamnesis saves or updates the anamnesis section of a clinical record.
func (s *Service) UpsertAnamnesis(clinicalRecordID uint, clinicID uint, in AnamnesisInput) error {
	a := &domain.Anamnesis{
		ReasonForVisit:             in.ReasonForVisit,
		Onset:                      in.Onset,
		Duration:                   in.Duration,
		Character:                  in.Character,
		AssociatedSymptoms:         domain.StringSlice(in.AssociatedSymptoms),
		HasDiabetes:                in.HasDiabetes,
		DiabetesDiagnosisYear:      in.DiabetesDiagnosisYear,
		DiabetesHba1c:              in.DiabetesHba1c,
		HasHypertension:            in.HasHypertension,
		HypertensionDiagnosisYear:  in.HypertensionDiagnosisYear,
		HypertensionMedication:     in.HypertensionMedication,
		Allergies:                  in.Allergies,
		CurrentMedications:         in.CurrentMedications,
		OtherSystemicConditions:    domain.StringSlice(in.OtherSystemicConditions),
		PreviousEyeSurgeries:       in.PreviousEyeSurgeries,
		LensUse:                    in.LensUse,
		CorrectionType:             in.CorrectionType,
		LensSatisfaction:           in.LensSatisfaction,
		PreviousOcularTrauma:       in.PreviousOcularTrauma,
		PreviousOcularPathologies:  in.PreviousOcularPathologies,
		FamilyOphthalmicConditions: domain.StringSlice(in.FamilyOphthalmicConditions),
		FamilyObservations:         in.FamilyObservations,
		TakesCorticosteroids:       in.TakesCorticosteroids,
		TakesHydroxychloroquine:    in.TakesHydroxychloroquine,
		TakesTamsulosin:            in.TakesTamsulosin,
		TakesAntihistamines:        in.TakesAntihistamines,
		TakesAntihypertensives:     in.TakesAntihypertensives,
		TakesAmiodarone:            in.TakesAmiodarone,
	}
	if err := s.repo.UpsertAnamnesis(clinicalRecordID, clinicID, a); err != nil {
		s.logger.Error("clinical_record: upsert anamnesis failed",
			zap.Error(err),
			zap.Uint("record_id", clinicalRecordID),
		)
		return err
	}
	return nil
}
