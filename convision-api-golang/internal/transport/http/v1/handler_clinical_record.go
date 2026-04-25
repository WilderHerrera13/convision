package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"

	clinicalrecordsvc "github.com/convision/api/internal/clinicalrecord"
	"github.com/convision/api/internal/domain"
	followupsvc "github.com/convision/api/internal/followup"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// defaultClinicID is the single-clinic deployment constant.
// This system runs one clinic per database schema instance.
const defaultClinicID uint = 1

// CreateClinicalRecord godoc
// POST /api/v1/appointments/:id/clinical-record
func (h *Handler) CreateClinicalRecord(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	var input clinicalrecordsvc.CreateRecordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	input.AppointmentID = appointmentID
	input.SpecialistID = claims.UserID

	record, err := h.clinicalRecord.CreateRecord(defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, record)
}

// GetClinicalRecord godoc
// GET /api/v1/appointments/:id/clinical-record
func (h *Handler) GetClinicalRecord(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, record)
}

// UpsertAnamnesis godoc
// PUT /api/v1/appointments/:id/clinical-record/anamnesis
func (h *Handler) UpsertAnamnesis(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.AnamnesisInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.clinicalRecord.UpsertAnamnesis(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpsertVisualExam godoc
// PUT /api/v1/appointments/:id/clinical-record/visual-exam
func (h *Handler) UpsertVisualExam(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.VisualExamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.clinicalRecord.UpsertVisualExam(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpsertDiagnosis godoc
// PUT /api/v1/appointments/:id/clinical-record/diagnosis
func (h *Handler) UpsertDiagnosis(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.DiagnosisInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.clinicalRecord.UpsertDiagnosis(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpsertPrescription godoc
// PUT /api/v1/appointments/:id/clinical-record/prescription
func (h *Handler) UpsertPrescription(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.PrescriptionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.clinicalRecord.UpsertPrescription(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// SignAndCompleteClinicalRecord godoc
// POST /api/v1/appointments/:id/clinical-record/sign
// Routes to the correct signer based on the record's type (new_consultation vs follow_up).
func (h *Handler) SignAndCompleteClinicalRecord(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	var body struct {
		ProfessionalTP string `json:"professional_tp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	var result interface{}
	if record.RecordType == domain.ClinicalRecordTypeFollowUp {
		result, err = h.followUp.SignAndComplete(record.ID, claims.UserID, body.ProfessionalTP)
	} else {
		result, err = h.clinicalRecord.SignAndComplete(record.ID, claims.UserID, body.ProfessionalTP)
	}
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpsertFollowUpAnamnesis godoc
// PUT /api/v1/appointments/:id/clinical-record/follow-up/anamnesis
func (h *Handler) UpsertFollowUpAnamnesis(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input followupsvc.FollowUpAnamnesisInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.followUp.UpsertAnamnesis(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpsertFollowUpEvolution godoc
// PUT /api/v1/appointments/:id/clinical-record/follow-up/evolution
func (h *Handler) UpsertFollowUpEvolution(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input followupsvc.FollowUpEvolutionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.followUp.UpsertEvolution(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpsertFollowUpFormula godoc
// PUT /api/v1/appointments/:id/clinical-record/follow-up/formula
func (h *Handler) UpsertFollowUpFormula(c *gin.Context) {
	appointmentID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input followupsvc.FollowUpFormulaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	record, err := h.clinicalRecord.GetRecord(defaultClinicID, appointmentID)
	if err != nil {
		respondError(c, err)
		return
	}

	result, err := h.followUp.UpsertFormula(record.ID, defaultClinicID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
