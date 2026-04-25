package followup

import (
	"errors"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// CUPS code for follow-up consultations in the Colombian health billing system.
const cupsFollowUp = "890307"

// Service handles follow-up visit use-cases, operating on ClinicalRecords whose
// RecordType is follow_up. It shares repository interfaces with clinicalrecord.
type Service struct {
	records      domain.ClinicalRecordRepository
	followUps    domain.FollowUpRepository
	visualExams  domain.VisualExamRepository
	appointments domain.AppointmentRepository
	logger       *zap.Logger
}

// NewService creates a new followup Service.
func NewService(
	records domain.ClinicalRecordRepository,
	followUps domain.FollowUpRepository,
	visualExams domain.VisualExamRepository,
	appointments domain.AppointmentRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		records:      records,
		followUps:    followUps,
		visualExams:  visualExams,
		appointments: appointments,
		logger:       logger,
	}
}

// FollowUpAnamnesisInput holds step-1 fields for a follow-up visit.
type FollowUpAnamnesisInput struct {
	ControlReason          string `json:"control_reason"`
	CorrectionSatisfaction string `json:"correction_satisfaction"`
	SubjectiveChanges      string `json:"subjective_changes"`
	Medications            string `json:"medications"`
	SystemicChanges        string `json:"systemic_changes"`
	CorrectionUse          string `json:"correction_use"`
	DailyHours             *int   `json:"daily_hours"`
	Observations           string `json:"observations"`
}

// FollowUpEvolutionInput holds step-3 fields for a follow-up visit.
type FollowUpEvolutionInput struct {
	EvolutionType        domain.EvolutionType `json:"evolution_type"`
	EvolutionDescription string               `json:"evolution_description"`
	NewDiagnosis         bool                 `json:"new_diagnosis"`
	ContinuityPlan       string               `json:"continuity_plan"`
}

// FollowUpFormulaInput holds step-4 fields for a follow-up visit.
type FollowUpFormulaInput struct {
	FormulaDecision domain.FormulaDecision `json:"formula_decision"`
}

// UpsertAnamnesis creates or updates the anamnesis (step 1) for a follow-up record.
func (s *Service) UpsertAnamnesis(recordID uint, clinicID uint, input FollowUpAnamnesisInput) (*domain.FollowUp, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	existing, err := s.followUps.GetByRecordID(recordID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if !errors.As(err, &notFound) {
			return nil, err
		}
		// Not found — create with required field defaults.
		f := &domain.FollowUp{
			ClinicID:               clinicID,
			ClinicalRecordID:       recordID,
			ControlReason:          input.ControlReason,
			CorrectionSatisfaction: input.CorrectionSatisfaction,
			SubjectiveChanges:      input.SubjectiveChanges,
			Medications:            input.Medications,
			SystemicChanges:        input.SystemicChanges,
			CorrectionUse:          input.CorrectionUse,
			DailyHours:             input.DailyHours,
			Observations:           input.Observations,
			// Required fields with safe defaults.
			EvolutionType:   domain.EvolutionTypeStable,
			FormulaDecision: domain.FormulaDecisionMaintain,
		}
		if createErr := s.followUps.Create(f); createErr != nil {
			return nil, createErr
		}
		return f, nil
	}

	// Found — update anamnesis fields only.
	existing.ControlReason = input.ControlReason
	existing.CorrectionSatisfaction = input.CorrectionSatisfaction
	existing.SubjectiveChanges = input.SubjectiveChanges
	existing.Medications = input.Medications
	existing.SystemicChanges = input.SystemicChanges
	existing.CorrectionUse = input.CorrectionUse
	existing.DailyHours = input.DailyHours
	existing.Observations = input.Observations
	if err := s.followUps.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// UpsertEvolution creates or updates the evolution (step 3) for a follow-up record.
func (s *Service) UpsertEvolution(recordID uint, clinicID uint, input FollowUpEvolutionInput) (*domain.FollowUp, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	existing, err := s.followUps.GetByRecordID(recordID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if !errors.As(err, &notFound) {
			return nil, err
		}
		// Not found — create with required field defaults.
		evolutionType := input.EvolutionType
		if evolutionType == "" {
			evolutionType = domain.EvolutionTypeStable
		}
		f := &domain.FollowUp{
			ClinicID:             clinicID,
			ClinicalRecordID:     recordID,
			EvolutionType:        evolutionType,
			EvolutionDescription: input.EvolutionDescription,
			NewDiagnosis:         input.NewDiagnosis,
			ContinuityPlan:       input.ContinuityPlan,
			FormulaDecision:      domain.FormulaDecisionMaintain,
		}
		if createErr := s.followUps.Create(f); createErr != nil {
			return nil, createErr
		}
		return f, nil
	}

	// Found — update evolution fields only.
	if input.EvolutionType != "" {
		existing.EvolutionType = input.EvolutionType
	}
	existing.EvolutionDescription = input.EvolutionDescription
	existing.NewDiagnosis = input.NewDiagnosis
	existing.ContinuityPlan = input.ContinuityPlan
	if err := s.followUps.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// UpsertFormula creates or updates the formula decision (step 4) for a follow-up record.
func (s *Service) UpsertFormula(recordID uint, clinicID uint, input FollowUpFormulaInput) (*domain.FollowUp, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	existing, err := s.followUps.GetByRecordID(recordID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if !errors.As(err, &notFound) {
			return nil, err
		}
		// Not found — create with required field defaults.
		formulaDecision := input.FormulaDecision
		if formulaDecision == "" {
			formulaDecision = domain.FormulaDecisionMaintain
		}
		f := &domain.FollowUp{
			ClinicID:         clinicID,
			ClinicalRecordID: recordID,
			EvolutionType:    domain.EvolutionTypeStable,
			FormulaDecision:  formulaDecision,
		}
		if createErr := s.followUps.Create(f); createErr != nil {
			return nil, createErr
		}
		return f, nil
	}

	// Found — update formula decision only.
	if input.FormulaDecision != "" {
		existing.FormulaDecision = input.FormulaDecision
	}
	if err := s.followUps.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// SignAndComplete marks the follow-up record as signed after validating required steps.
// Business rules:
//   - FollowUp must exist with non-empty ControlReason and DiagnosticEvolution set.
//   - Sets CUPS = 890307, SignedAt, SignedByID, Status = signed on the parent ClinicalRecord.
func (s *Service) SignAndComplete(recordID uint, specialistID uint, professionalTP string) (*domain.ClinicalRecord, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}

	followUp, err := s.followUps.GetByRecordID(recordID)
	if err != nil {
		return nil, &domain.ErrValidation{Field: "follow_up", Message: "follow-up data must be completed before signing"}
	}
	if followUp.ControlReason == "" {
		return nil, &domain.ErrValidation{Field: "control_reason", Message: "control reason must be completed before signing"}
	}
	if followUp.EvolutionDescription == "" {
		return nil, &domain.ErrValidation{Field: "evolution_description", Message: "diagnostic evolution must be completed before signing"}
	}

	now := time.Now()
	rec.Status = domain.ClinicalRecordStatusSigned
	rec.SignedAt = &now
	rec.SignedByID = &specialistID
	rec.LegalText = professionalTP

	if err := s.records.Update(rec); err != nil {
		return nil, err
	}

	s.logger.Info("follow-up record signed",
		zap.Uint("record_id", rec.ID),
		zap.Uint("specialist_id", specialistID),
		zap.String("cups", cupsFollowUp),
	)
	return rec, nil
}

// GetByAppointmentID returns the clinical record for a follow-up appointment.
func (s *Service) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	return s.records.GetByAppointmentID(appointmentID)
}
