package clinicalrecord

import (
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

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
	BranchID      uint
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
func (s *Service) GetByAppointmentID(db *gorm.DB, appointmentID uint) (*domain.ClinicalRecord, error) {
	return s.repo.GetByAppointmentID(db, appointmentID)
}

// Create creates a new clinical record linked to an appointment.
func (s *Service) Create(db *gorm.DB, in CreateRecordInput) (*domain.ClinicalRecord, error) {
	if in.RecordType == "" {
		in.RecordType = "new_consultation"
	}
	rec := &domain.ClinicalRecord{
		BranchID:      in.BranchID,
		AppointmentID: in.AppointmentID,
		PatientID:     in.PatientID,
		SpecialistID:  in.SpecialistID,
		RecordType:    in.RecordType,
		Status:        "in_progress",
	}
	if err := s.repo.Create(db, rec); err != nil {
		s.logger.Error("clinical_record: create failed",
			zap.Error(err),
			zap.Uint("appointment_id", in.AppointmentID),
		)
		return nil, err
	}
	return rec, nil
}

// VisualExamInput is the DTO for creating or updating a VisualExam.
type VisualExamInput struct {
	AvScOd     string `json:"av_sc_od"`
	AvScOi     string `json:"av_sc_oi"`
	AvNearScOd string `json:"av_near_sc_od"`
	AvNearScOi string `json:"av_near_sc_oi"`
	AvCcOd     string `json:"av_cc_od"`
	AvCcOi     string `json:"av_cc_oi"`
	AvNearCcOd string `json:"av_near_cc_od"`
	AvNearCcOi string `json:"av_near_cc_oi"`

	AutorefSphOd  *float64 `json:"autoref_sph_od"`
	AutorefCylOd  *float64 `json:"autoref_cyl_od"`
	AutorefAxisOd *int     `json:"autoref_axis_od"`
	AutorefSphOi  *float64 `json:"autoref_sph_oi"`
	AutorefCylOi  *float64 `json:"autoref_cyl_oi"`
	AutorefAxisOi *int     `json:"autoref_axis_oi"`

	SubjSphOd  *float64 `json:"subj_sph_od"`
	SubjCylOd  *float64 `json:"subj_cyl_od"`
	SubjAxisOd *int     `json:"subj_axis_od"`
	SubjAvOd   string   `json:"subj_av_od"`
	SubjSphOi  *float64 `json:"subj_sph_oi"`
	SubjCylOi  *float64 `json:"subj_cyl_oi"`
	SubjAxisOi *int     `json:"subj_axis_oi"`
	SubjAvOi   string   `json:"subj_av_oi"`
	Addition   *float64 `json:"addition"`

	KeroK1Od   *float64 `json:"kero_k1_od"`
	KeroK2Od   *float64 `json:"kero_k2_od"`
	KeroAxisOd *int     `json:"kero_axis_od"`
	KeroK1Oi   *float64 `json:"kero_k1_oi"`
	KeroK2Oi   *float64 `json:"kero_k2_oi"`
	KeroAxisOi *int     `json:"kero_axis_oi"`

	IopMethod string   `json:"iop_method"`
	IopOd     *float64 `json:"iop_od"`
	IopOi     *float64 `json:"iop_oi"`

	BiomiLidsOd   string `json:"biomi_lids_od"`
	BiomiLidsOi   string `json:"biomi_lids_oi"`
	BiomiConjOd   string `json:"biomi_conj_od"`
	BiomiConjOi   string `json:"biomi_conj_oi"`
	BiomiCorneaOd string `json:"biomi_cornea_od"`
	BiomiCorneaOi string `json:"biomi_cornea_oi"`
	BiomiAcOd     string `json:"biomi_ac_od"`
	BiomiAcOi     string `json:"biomi_ac_oi"`
	BiomiLensOd   string `json:"biomi_lens_od"`
	BiomiLensOi   string `json:"biomi_lens_oi"`

	FundusDiscOd    string `json:"fundus_disc_od"`
	FundusDiscOi    string `json:"fundus_disc_oi"`
	FundusMaculaOd  string `json:"fundus_macula_od"`
	FundusMaculaOi  string `json:"fundus_macula_oi"`
	FundusVesselsOd string `json:"fundus_vessels_od"`
	FundusVesselsOi string `json:"fundus_vessels_oi"`
	FundusPeriphOd  string `json:"fundus_periph_od"`
	FundusPeriphOi  string `json:"fundus_periph_oi"`

	MotilityVersions   string `json:"motility_versions"`
	MotilityHirschberg string `json:"motility_hirschberg"`
	MotilityCoverTest  string `json:"motility_cover_test"`
}

// DiagnosisInput is the DTO for creating or updating a Diagnosis.
type DiagnosisInput struct {
	PrimaryCode        string `json:"primary_code"        binding:"required"`
	PrimaryDescription string `json:"primary_description" binding:"required"`
	DiagnosisType      int    `json:"diagnosis_type"`

	Related1Code string `json:"related_1_code"`
	Related1Desc string `json:"related_1_desc"`
	Related2Code string `json:"related_2_code"`
	Related2Desc string `json:"related_2_desc"`
	Related3Code string `json:"related_3_code"`
	Related3Desc string `json:"related_3_desc"`

	OpticalCorrectionPlan string `json:"optical_correction_plan"`
	PatientEducation      string `json:"patient_education"`
	NextControlDate       string `json:"next_control_date"`
	NextControlReason     string `json:"next_control_reason"`
	RequiresReferral      bool   `json:"requires_referral"`
	ReferralNotes         string `json:"referral_notes"`
	Cups                  string `json:"cups"`
}

// UpsertDiagnosis saves or updates the diagnosis section of a clinical record.
func (s *Service) UpsertDiagnosis(db *gorm.DB, clinicalRecordID uint, branchID uint, in DiagnosisInput) error {
	diagType := in.DiagnosisType
	if diagType < 1 || diagType > 3 {
		diagType = 1
	}
	d := &domain.Diagnosis{
		PrimaryCode:           in.PrimaryCode,
		PrimaryDescription:    in.PrimaryDescription,
		DiagnosisType:         diagType,
		Related1Code:          in.Related1Code,
		Related1Desc:          in.Related1Desc,
		Related2Code:          in.Related2Code,
		Related2Desc:          in.Related2Desc,
		Related3Code:          in.Related3Code,
		Related3Desc:          in.Related3Desc,
		OpticalCorrectionPlan: in.OpticalCorrectionPlan,
		PatientEducation:      in.PatientEducation,
		NextControlReason:     in.NextControlReason,
		RequiresReferral:      in.RequiresReferral,
		ReferralNotes:         in.ReferralNotes,
		Cups:                  in.Cups,
	}
	if in.NextControlDate != "" {
		t, err := time.Parse("2006-01-02", in.NextControlDate)
		if err == nil {
			d.NextControlDate = &t
		}
	}
	if err := s.repo.UpsertDiagnosis(db, clinicalRecordID, branchID, d); err != nil {
		s.logger.Error("clinical_record: upsert diagnosis failed",
			zap.Error(err),
			zap.Uint("record_id", clinicalRecordID),
		)
		return err
	}
	return nil
}

// UpsertVisualExam saves or updates the visual exam section of a clinical record.
func (s *Service) UpsertVisualExam(db *gorm.DB, clinicalRecordID uint, branchID uint, in VisualExamInput) error {
	v := &domain.VisualExam{
		AvScOd:             in.AvScOd,
		AvScOi:             in.AvScOi,
		AvNearScOd:         in.AvNearScOd,
		AvNearScOi:         in.AvNearScOi,
		AvCcOd:             in.AvCcOd,
		AvCcOi:             in.AvCcOi,
		AvNearCcOd:         in.AvNearCcOd,
		AvNearCcOi:         in.AvNearCcOi,
		AutorefSphOd:       in.AutorefSphOd,
		AutorefCylOd:       in.AutorefCylOd,
		AutorefAxisOd:      in.AutorefAxisOd,
		AutorefSphOi:       in.AutorefSphOi,
		AutorefCylOi:       in.AutorefCylOi,
		AutorefAxisOi:      in.AutorefAxisOi,
		SubjSphOd:          in.SubjSphOd,
		SubjCylOd:          in.SubjCylOd,
		SubjAxisOd:         in.SubjAxisOd,
		SubjAvOd:           in.SubjAvOd,
		SubjSphOi:          in.SubjSphOi,
		SubjCylOi:          in.SubjCylOi,
		SubjAxisOi:         in.SubjAxisOi,
		SubjAvOi:           in.SubjAvOi,
		Addition:           in.Addition,
		KeroK1Od:           in.KeroK1Od,
		KeroK2Od:           in.KeroK2Od,
		KeroAxisOd:         in.KeroAxisOd,
		KeroK1Oi:           in.KeroK1Oi,
		KeroK2Oi:           in.KeroK2Oi,
		KeroAxisOi:         in.KeroAxisOi,
		IopMethod:          in.IopMethod,
		IopOd:              in.IopOd,
		IopOi:              in.IopOi,
		BiomiLidsOd:        in.BiomiLidsOd,
		BiomiLidsOi:        in.BiomiLidsOi,
		BiomiConjOd:        in.BiomiConjOd,
		BiomiConjOi:        in.BiomiConjOi,
		BiomiCorneaOd:      in.BiomiCorneaOd,
		BiomiCorneaOi:      in.BiomiCorneaOi,
		BiomiAcOd:          in.BiomiAcOd,
		BiomiAcOi:          in.BiomiAcOi,
		BiomiLensOd:        in.BiomiLensOd,
		BiomiLensOi:        in.BiomiLensOi,
		FundusDiscOd:       in.FundusDiscOd,
		FundusDiscOi:       in.FundusDiscOi,
		FundusMaculaOd:     in.FundusMaculaOd,
		FundusMaculaOi:     in.FundusMaculaOi,
		FundusVesselsOd:    in.FundusVesselsOd,
		FundusVesselsOi:    in.FundusVesselsOi,
		FundusPeriphOd:     in.FundusPeriphOd,
		FundusPeriphOi:     in.FundusPeriphOi,
		MotilityVersions:   in.MotilityVersions,
		MotilityHirschberg: in.MotilityHirschberg,
		MotilityCoverTest:  in.MotilityCoverTest,
	}
	if err := s.repo.UpsertVisualExam(db, clinicalRecordID, branchID, v); err != nil {
		s.logger.Error("clinical_record: upsert visual_exam failed",
			zap.Error(err),
			zap.Uint("record_id", clinicalRecordID),
		)
		return err
	}
	return nil
}

// PrescriptionInput is the DTO for creating or updating a ClinicalPrescription.
type PrescriptionInput struct {
	SphOd  *float64 `json:"sph_od"`
	CylOd  *float64 `json:"cyl_od"`
	AxisOd *int     `json:"axis_od"`
	AvccOd string   `json:"avcc_od"`
	AddOd  *float64 `json:"add_od"`
	DpOd   *float64 `json:"dp_od"`

	SphOi  *float64 `json:"sph_oi"`
	CylOi  *float64 `json:"cyl_oi"`
	AxisOi *int     `json:"axis_oi"`
	AvccOi string   `json:"avcc_oi"`
	AddOi  *float64 `json:"add_oi"`
	DpOi   *float64 `json:"dp_oi"`

	LensType       string   `json:"lens_type"`
	LensMaterial   string   `json:"lens_material"`
	LensUse        string   `json:"lens_use"`
	MountingHeight *float64 `json:"mounting_height"`
	Treatments     []string `json:"treatments"`
	ValidityMonths int      `json:"validity_months"`
	ProfessionalTp string   `json:"professional_tp"`
}

// UpsertPrescription saves or updates the prescription section of a clinical record.
func (s *Service) UpsertPrescription(db *gorm.DB, clinicalRecordID uint, branchID uint, in PrescriptionInput) error {
	validityMonths := in.ValidityMonths
	if validityMonths <= 0 {
		validityMonths = 12
	}
	p := &domain.ClinicalPrescription{
		SphOd:          in.SphOd,
		CylOd:          in.CylOd,
		AxisOd:         in.AxisOd,
		AvccOd:         in.AvccOd,
		AddOd:          in.AddOd,
		DpOd:           in.DpOd,
		SphOi:          in.SphOi,
		CylOi:          in.CylOi,
		AxisOi:         in.AxisOi,
		AvccOi:         in.AvccOi,
		AddOi:          in.AddOi,
		DpOi:           in.DpOi,
		LensType:       in.LensType,
		LensMaterial:   in.LensMaterial,
		LensUse:        in.LensUse,
		MountingHeight: in.MountingHeight,
		Treatments:     domain.StringSlice(in.Treatments),
		ValidityMonths: validityMonths,
		ProfessionalTp: in.ProfessionalTp,
	}
	if err := s.repo.UpsertPrescription(db, clinicalRecordID, branchID, p); err != nil {
		s.logger.Error("clinical_record: upsert prescription failed",
			zap.Error(err),
			zap.Uint("record_id", clinicalRecordID),
		)
		return err
	}
	return nil
}

// SignRecord marks a clinical record as signed and stamps the prescriber's TP.
func (s *Service) SignRecord(db *gorm.DB, clinicalRecordID uint, professionalTp string) error {
	if err := s.repo.SignClinicalRecord(db, clinicalRecordID, professionalTp); err != nil {
		s.logger.Error("clinical_record: sign failed",
			zap.Error(err),
			zap.Uint("record_id", clinicalRecordID),
		)
		return err
	}
	return nil
}

// UpsertAnamnesis saves or updates the anamnesis section of a clinical record.
func (s *Service) UpsertAnamnesis(db *gorm.DB, clinicalRecordID uint, branchID uint, in AnamnesisInput) error {
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
	if err := s.repo.UpsertAnamnesis(db, clinicalRecordID, branchID, a); err != nil {
		s.logger.Error("clinical_record: upsert anamnesis failed",
			zap.Error(err),
			zap.Uint("record_id", clinicalRecordID),
		)
		return err
	}
	return nil
}
