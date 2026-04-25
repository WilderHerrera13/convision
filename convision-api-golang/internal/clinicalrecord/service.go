package clinicalrecord

import (
	"errors"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// CUPS codes for Colombian health service billing.
const (
	cupsNewConsultation = "890205"
	cupsFollowUp        = "890307"
)

// Service handles clinical record use-cases for new consultation appointments.
type Service struct {
	records       domain.ClinicalRecordRepository
	anamneses     domain.AnamnesisRepository
	visualExams   domain.VisualExamRepository
	diagnoses     domain.ClinicalDiagnosisRepository
	prescriptions domain.ClinicalPrescriptionRepository
	appointments  domain.AppointmentRepository
	logger        *zap.Logger
}

// NewService creates a new clinicalrecord Service.
func NewService(
	records domain.ClinicalRecordRepository,
	anamneses domain.AnamnesisRepository,
	visualExams domain.VisualExamRepository,
	diagnoses domain.ClinicalDiagnosisRepository,
	prescriptions domain.ClinicalPrescriptionRepository,
	appointments domain.AppointmentRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		records:       records,
		anamneses:     anamneses,
		visualExams:   visualExams,
		diagnoses:     diagnoses,
		prescriptions: prescriptions,
		appointments:  appointments,
		logger:        logger,
	}
}

// CreateRecordInput holds the validated fields for creating a clinical record.
type CreateRecordInput struct {
	AppointmentID uint                     `json:"appointment_id" binding:"required"`
	PatientID     uint                     `json:"patient_id"     binding:"required"`
	SpecialistID  uint                     `json:"specialist_id"  binding:"required"`
	RecordType    domain.ClinicalRecordType `json:"record_type"   binding:"required"`
}

// AnamnesisInput holds the fields for creating or updating an anamnesis step.
type AnamnesisInput struct {
	ChiefComplaint      string `json:"chief_complaint"`
	OcularHistory       string `json:"ocular_history"`
	FamilyHistory       string `json:"family_history"`
	SystemicHistory     string `json:"systemic_history"`
	CurrentCorrectionOD string `json:"current_correction_od"`
	CurrentCorrectionOI string `json:"current_correction_oi"`
}

// VisualExamInput holds the fields for creating or updating a visual exam step.
type VisualExamInput struct {
	AVSCDistOD        string   `json:"av_sc_dist_od"`
	AVSCDistOI        string   `json:"av_sc_dist_oi"`
	AVSCNearOD        string   `json:"av_sc_near_od"`
	AVSCNearOI        string   `json:"av_sc_near_oi"`
	AVCCDistOD        string   `json:"av_cc_dist_od"`
	AVCCDistOI        string   `json:"av_cc_dist_oi"`
	AVCCNearOD        string   `json:"av_cc_near_od"`
	AVCCNearOI        string   `json:"av_cc_near_oi"`
	RefObjSphereOD    *float64 `json:"ref_obj_sphere_od"`
	RefObjCylinderOD  *float64 `json:"ref_obj_cylinder_od"`
	RefObjAxisOD      *int     `json:"ref_obj_axis_od"`
	RefObjSphereOI    *float64 `json:"ref_obj_sphere_oi"`
	RefObjCylinderOI  *float64 `json:"ref_obj_cylinder_oi"`
	RefObjAxisOI      *int     `json:"ref_obj_axis_oi"`
	RefSubjSphereOD   *float64 `json:"ref_subj_sphere_od"`
	RefSubjCylinderOD *float64 `json:"ref_subj_cylinder_od"`
	RefSubjAxisOD     *int     `json:"ref_subj_axis_od"`
	RefSubjSphereOI   *float64 `json:"ref_subj_sphere_oi"`
	RefSubjCylinderOI *float64 `json:"ref_subj_cylinder_oi"`
	RefSubjAxisOI     *int     `json:"ref_subj_axis_oi"`
	KeratometryOD     string   `json:"keratometry_od"`
	KeratometryOI     string   `json:"keratometry_oi"`
	IOPOD             *float64 `json:"iop_od"`
	IOPOI             *float64 `json:"iop_oi"`
	Biomicroscopy     string   `json:"biomicroscopy"`
	Motility          string   `json:"motility"`
}

// DiagnosisInput holds the fields for creating or updating a diagnosis step.
type DiagnosisInput struct {
	PrimaryCIE10Code   string               `json:"primary_cie10_code"`
	PrimaryDescription string               `json:"primary_description"`
	DiagnosisType      domain.DiagnosisType `json:"diagnosis_type"`
	RelatedCodes       []string             `json:"related_codes"`
	CarePlan           string               `json:"care_plan"`
}

// PrescriptionInput holds the fields for creating or updating a prescription step.
type PrescriptionInput struct {
	SphereOD      *float64 `json:"sphere_od"`
	CylinderOD    *float64 `json:"cylinder_od"`
	AxisOD        *int     `json:"axis_od"`
	AddOD         *float64 `json:"add_od"`
	SphereOI      *float64 `json:"sphere_oi"`
	CylinderOI    *float64 `json:"cylinder_oi"`
	AxisOI        *int     `json:"axis_oi"`
	AddOI         *float64 `json:"add_oi"`
	LensType      string   `json:"lens_type"`
	LensMaterial  string   `json:"lens_material"`
	LensUse       string   `json:"lens_use"`
	Treatments    []string `json:"treatments"`
	ValidityMonths int      `json:"validity_months"`
}

// CreateRecord creates a new ClinicalRecord for an appointment.
// Sets CUPS automatically: 890205 for new_consultation, 890307 for follow_up.
// Returns ErrConflict if the appointment already has a record.
func (s *Service) CreateRecord(clinicID uint, input CreateRecordInput) (*domain.ClinicalRecord, error) {
	rec := &domain.ClinicalRecord{
		ClinicID:      clinicID,
		AppointmentID: input.AppointmentID,
		PatientID:     input.PatientID,
		SpecialistID:  input.SpecialistID,
		RecordType:    input.RecordType,
		Status:        domain.ClinicalRecordStatusDraft,
	}

	if err := s.records.Create(rec); err != nil {
		return nil, err
	}

	s.logger.Info("clinical record created",
		zap.Uint("record_id", rec.ID),
		zap.Uint("appointment_id", input.AppointmentID),
		zap.String("record_type", string(input.RecordType)),
	)
	return rec, nil
}

// GetRecord returns the full clinical record for an appointment (no sub-entity preloading
// at this layer — sub-entities are fetched individually via their own endpoints).
func (s *Service) GetRecord(clinicID uint, appointmentID uint) (*domain.ClinicalRecord, error) {
	rec, err := s.records.GetByAppointmentID(appointmentID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}
	return rec, nil
}

// GetByAppointmentID returns the clinical record for an appointment.
func (s *Service) GetByAppointmentID(appointmentID uint) (*domain.ClinicalRecord, error) {
	return s.records.GetByAppointmentID(appointmentID)
}

// UpsertAnamnesis creates or updates the anamnesis step for a clinical record.
func (s *Service) UpsertAnamnesis(recordID uint, clinicID uint, input AnamnesisInput) (*domain.Anamnesis, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	a := &domain.Anamnesis{
		ClinicID:            clinicID,
		ClinicalRecordID:    recordID,
		ChiefComplaint:      input.ChiefComplaint,
		OcularHistory:       input.OcularHistory,
		FamilyHistory:       input.FamilyHistory,
		SystemicHistory:     input.SystemicHistory,
		CurrentCorrectionOD: input.CurrentCorrectionOD,
		CurrentCorrectionOI: input.CurrentCorrectionOI,
	}

	existing, err := s.anamneses.GetByRecordID(recordID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if !errors.As(err, &notFound) {
			return nil, err
		}
		// Not found — create.
		if createErr := s.anamneses.Create(a); createErr != nil {
			return nil, createErr
		}
		return a, nil
	}

	// Found — update.
	existing.ChiefComplaint = input.ChiefComplaint
	existing.OcularHistory = input.OcularHistory
	existing.FamilyHistory = input.FamilyHistory
	existing.SystemicHistory = input.SystemicHistory
	existing.CurrentCorrectionOD = input.CurrentCorrectionOD
	existing.CurrentCorrectionOI = input.CurrentCorrectionOI
	if err := s.anamneses.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// UpsertVisualExam creates or updates the visual exam step for a clinical record.
func (s *Service) UpsertVisualExam(recordID uint, clinicID uint, input VisualExamInput) (*domain.VisualExam, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	e := &domain.VisualExam{
		ClinicID:          clinicID,
		ClinicalRecordID:  recordID,
		AVSCDistOD:        input.AVSCDistOD,
		AVSCDistOI:        input.AVSCDistOI,
		AVSCNearOD:        input.AVSCNearOD,
		AVSCNearOI:        input.AVSCNearOI,
		AVCCDistOD:        input.AVCCDistOD,
		AVCCDistOI:        input.AVCCDistOI,
		AVCCNearOD:        input.AVCCNearOD,
		AVCCNearOI:        input.AVCCNearOI,
		RefObjSphereOD:    input.RefObjSphereOD,
		RefObjCylinderOD:  input.RefObjCylinderOD,
		RefObjAxisOD:      input.RefObjAxisOD,
		RefObjSphereOI:    input.RefObjSphereOI,
		RefObjCylinderOI:  input.RefObjCylinderOI,
		RefObjAxisOI:      input.RefObjAxisOI,
		RefSubjSphereOD:   input.RefSubjSphereOD,
		RefSubjCylinderOD: input.RefSubjCylinderOD,
		RefSubjAxisOD:     input.RefSubjAxisOD,
		RefSubjSphereOI:   input.RefSubjSphereOI,
		RefSubjCylinderOI: input.RefSubjCylinderOI,
		RefSubjAxisOI:     input.RefSubjAxisOI,
		KeratometryOD:     input.KeratometryOD,
		KeratometryOI:     input.KeratometryOI,
		IOPOD:             input.IOPOD,
		IOPOI:             input.IOPOI,
		Biomicroscopy:     input.Biomicroscopy,
		Motility:          input.Motility,
	}

	existing, err := s.visualExams.GetByRecordID(recordID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if !errors.As(err, &notFound) {
			return nil, err
		}
		if createErr := s.visualExams.Create(e); createErr != nil {
			return nil, createErr
		}
		return e, nil
	}

	e.ID = existing.ID
	if err := s.visualExams.Update(e); err != nil {
		return nil, err
	}
	return e, nil
}

// UpsertDiagnosis creates or updates the diagnosis step for a clinical record.
func (s *Service) UpsertDiagnosis(recordID uint, clinicID uint, input DiagnosisInput) (*domain.ClinicalDiagnosis, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	diagType := input.DiagnosisType
	if diagType == "" {
		diagType = domain.DiagnosisTypeMain
	}

	d := &domain.ClinicalDiagnosis{
		ClinicID:           clinicID,
		ClinicalRecordID:   recordID,
		PrimaryCIE10Code:   input.PrimaryCIE10Code,
		PrimaryDescription: input.PrimaryDescription,
		DiagnosisType:      diagType,
		CarePlan:           input.CarePlan,
	}

	existing, err := s.diagnoses.GetByRecordID(recordID)
	if err != nil {
		return nil, err
	}

	// Find a matching diagnosis by type, or create new.
	for _, ex := range existing {
		if ex.DiagnosisType == diagType {
			d.ID = ex.ID
			if updateErr := s.diagnoses.Update(d); updateErr != nil {
				return nil, updateErr
			}
			return d, nil
		}
	}

	// No matching type — create new.
	if err := s.diagnoses.Create(d); err != nil {
		return nil, err
	}
	return d, nil
}

// UpsertPrescription creates or updates the prescription step for a clinical record.
// ValidUntil is auto-computed from ValidityMonths if > 0.
func (s *Service) UpsertPrescription(recordID uint, clinicID uint, input PrescriptionInput) (*domain.ClinicalPrescription, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}
	if rec.ClinicID != clinicID {
		return nil, &domain.ErrNotFound{Resource: "clinical_record"}
	}

	cups := cupsNewConsultation
	if rec.RecordType == domain.ClinicalRecordTypeFollowUp {
		cups = cupsFollowUp
	}

	var validUntil *time.Time
	if input.ValidityMonths > 0 {
		t := time.Now().AddDate(0, input.ValidityMonths, 0)
		validUntil = &t
	}

	p := &domain.ClinicalPrescription{
		ClinicID:         clinicID,
		ClinicalRecordID: recordID,
		SphereOD:         input.SphereOD,
		CylinderOD:       input.CylinderOD,
		AxisOD:           input.AxisOD,
		AddOD:            input.AddOD,
		SphereOI:         input.SphereOI,
		CylinderOI:       input.CylinderOI,
		AxisOI:           input.AxisOI,
		AddOI:            input.AddOI,
		LensType:         input.LensType,
		LensMaterial:     input.LensMaterial,
		LensUse:          input.LensUse,
		ValidUntil:       validUntil,
		CUPSCode:         cups,
	}

	existing, err := s.prescriptions.GetByRecordID(recordID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if !errors.As(err, &notFound) {
			return nil, err
		}
		if createErr := s.prescriptions.Create(p); createErr != nil {
			return nil, createErr
		}
		return p, nil
	}

	p.ID = existing.ID
	if err := s.prescriptions.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

// SignAndComplete marks the clinical record as signed after validating all steps exist.
// Business rules:
//   - Anamnesis, VisualExam, at least one Diagnosis, and Prescription must all exist.
//   - Sets SignedAt, SignedByID, CUPS = 890205, Status = signed.
func (s *Service) SignAndComplete(recordID uint, specialistID uint, professionalTP string) (*domain.ClinicalRecord, error) {
	rec, err := s.records.GetByID(recordID)
	if err != nil {
		return nil, err
	}

	// Validate all required steps are present.
	if _, err := s.anamneses.GetByRecordID(recordID); err != nil {
		return nil, &domain.ErrValidation{Field: "anamnesis", Message: "anamnesis must be completed before signing"}
	}
	if _, err := s.visualExams.GetByRecordID(recordID); err != nil {
		return nil, &domain.ErrValidation{Field: "visual_exam", Message: "visual exam must be completed before signing"}
	}
	diagnosesList, err := s.diagnoses.GetByRecordID(recordID)
	if err != nil || len(diagnosesList) == 0 {
		return nil, &domain.ErrValidation{Field: "diagnosis", Message: "diagnosis must be completed before signing"}
	}
	if _, err := s.prescriptions.GetByRecordID(recordID); err != nil {
		return nil, &domain.ErrValidation{Field: "prescription", Message: "prescription must be completed before signing"}
	}

	now := time.Now()
	rec.Status = domain.ClinicalRecordStatusSigned
	rec.SignedAt = &now
	rec.SignedByID = &specialistID
	rec.LegalText = professionalTP

	if err := s.records.Update(rec); err != nil {
		return nil, err
	}

	s.logger.Info("clinical record signed",
		zap.Uint("record_id", rec.ID),
		zap.Uint("specialist_id", specialistID),
	)
	return rec, nil
}

