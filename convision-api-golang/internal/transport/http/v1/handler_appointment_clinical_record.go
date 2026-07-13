package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appointmentsvc "github.com/convision/api/internal/appointment"
	clinicalrecordsvc "github.com/convision/api/internal/clinicalrecord"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

// GetAppointmentClinicalRecord godoc
// GET /api/v1/appointments/:id/clinical-record
func (h *Handler) GetAppointmentClinicalRecord(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(db, apptID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, rec)
}

// GetPatientLatestClinicalRecord godoc
// GET /api/v1/patients/:id/latest-clinical-record
// Returns the most recent signed clinical record for a patient (with diagnosis
// and prescription preloaded). Used by the sales flow so the asesor can see
// the doctor's recommendation before quoting lenses.
func (h *Handler) GetPatientLatestClinicalRecord(c *gin.Context) {
	db := tenantDBFromCtx(c)
	patientID, err := parseID(c, "id")
	if err != nil {
		return
	}

	rec, err := h.clinicalRecord.GetLatestSignedForPatient(db, patientID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, rec)
}

// GetPatientClinicalRecordHistory godoc
// GET /api/v1/patients/:id/clinical-records?page=&per_page=
// Returns the full signed-record history for a patient (paginated, newest
// first) — the longitudinal view GetPatientLatestClinicalRecord cannot
// provide (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 11).
func (h *Handler) GetPatientClinicalRecordHistory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	patientID, err := parseID(c, "id")
	if err != nil {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	out, err := h.clinicalRecord.ListHistoryForPatient(db, patientID, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateAppointmentClinicalRecord godoc
// POST /api/v1/appointments/:id/clinical-record
func (h *Handler) CreateAppointmentClinicalRecord(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	appt, err := h.appointment.GetByID(db, apptID)
	if err != nil {
		respondError(c, err)
		return
	}

	var body struct {
		RecordType string `json:"record_type"`
	}
	_ = c.ShouldBindJSON(&body)

	specialistID := claims.UserID
	if appt.SpecialistID != nil {
		specialistID = *appt.SpecialistID
	}

	in := clinicalrecordsvc.CreateRecordInput{
		AppointmentID: apptID,
		PatientID:     appt.PatientID,
		SpecialistID:  specialistID,
		BranchID:      branchmw.BranchIDFromCtx(c),
		RecordType:    body.RecordType,
	}

	rec, err := h.clinicalRecord.Create(db, in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, rec)
}

// UpsertAppointmentVisualExam godoc
// PUT /api/v1/appointments/:id/clinical-record/visual-exam
func (h *Handler) UpsertAppointmentVisualExam(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.VisualExamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(db, apptID)
	if err != nil {
		if notFound, ok := err.(*domain.ErrNotFound); ok {
			_ = notFound
			c.JSON(http.StatusNotFound, gin.H{"message": "Historia clínica no encontrada. Cree el registro primero."})
			return
		}
		respondError(c, err)
		return
	}

	if err := h.clinicalRecord.UpsertVisualExam(db, rec.ID, rec.BranchID, input); err != nil {
		respondError(c, err)
		return
	}

	updated, _ := h.clinicalRecord.GetByAppointmentID(db, apptID)
	c.JSON(http.StatusOK, updated)
}

// UpsertAppointmentDiagnosis godoc
// PUT /api/v1/appointments/:id/clinical-record/diagnosis
func (h *Handler) UpsertAppointmentDiagnosis(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.DiagnosisInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(db, apptID)
	if err != nil {
		if _, ok := err.(*domain.ErrNotFound); ok {
			c.JSON(http.StatusNotFound, gin.H{"message": "Historia clínica no encontrada. Cree el registro primero."})
			return
		}
		respondError(c, err)
		return
	}

	if err := h.clinicalRecord.UpsertDiagnosis(db, rec.ID, rec.BranchID, input); err != nil {
		respondError(c, err)
		return
	}

	updated, _ := h.clinicalRecord.GetByAppointmentID(db, apptID)
	c.JSON(http.StatusOK, updated)
}

// UpsertAppointmentPrescription godoc
// PUT /api/v1/appointments/:id/clinical-record/prescription
func (h *Handler) UpsertAppointmentPrescription(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.PrescriptionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(db, apptID)
	if err != nil {
		if _, ok := err.(*domain.ErrNotFound); ok {
			c.JSON(http.StatusNotFound, gin.H{"message": "Historia clínica no encontrada. Cree el registro primero."})
			return
		}
		respondError(c, err)
		return
	}

	if err := h.clinicalRecord.UpsertPrescription(db, rec.ID, rec.BranchID, input); err != nil {
		respondError(c, err)
		return
	}

	updated, _ := h.clinicalRecord.GetByAppointmentID(db, apptID)
	c.JSON(http.StatusOK, updated)
}

// SignAppointmentClinicalRecord godoc
// POST /api/v1/appointments/:id/clinical-record/sign
func (h *Handler) SignAppointmentClinicalRecord(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var body struct {
		ProfessionalTp string `json:"professional_tp"`
	}
	_ = c.ShouldBindJSON(&body)

	rec, err := h.clinicalRecord.GetByAppointmentID(db, apptID)
	if err != nil {
		if _, ok := err.(*domain.ErrNotFound); ok {
			c.JSON(http.StatusNotFound, gin.H{"message": "Historia clínica no encontrada."})
			return
		}
		respondError(c, err)
		return
	}

	txErr := db.Transaction(func(tx *gorm.DB) error {
		if err := h.clinicalRecord.SignRecord(tx, rec.ID, body.ProfessionalTp); err != nil {
			return err
		}
		// Once the prescription is signed the consultation is finished, so the
		// appointment moves to "completed" and surfaces in the receptionist
		// sales queue. Wrapped in the same tx so a failed status update rolls
		// back the signature.
		statusInput := appointmentsvc.UpdateInput{Status: string(domain.AppointmentStatusCompleted)}
		if _, err := h.appointment.Update(tx, apptID, statusInput); err != nil {
			return err
		}
		return nil
	})
	if txErr != nil {
		respondError(c, txErr)
		return
	}

	// Build the RIPS record fire-and-forget — signing must never fail or
	// block on it (mirrors sale.Service's async invoice emission). Uses the
	// non-transactional db handle since the transaction above has already
	// committed by this point.
	if h.rips != nil {
		h.rips.BuildForAppointmentAsync(db, apptID)
	}

	updated, _ := h.clinicalRecord.GetByAppointmentID(db, apptID)
	c.JSON(http.StatusOK, updated)
}

// UpsertAppointmentAnamnesis godoc
// PUT /api/v1/appointments/:id/clinical-record/anamnesis
func (h *Handler) UpsertAppointmentAnamnesis(c *gin.Context) {
	db := tenantDBFromCtx(c)
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.AnamnesisInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(db, apptID)
	if err != nil {
		if notFound, ok := err.(*domain.ErrNotFound); ok {
			_ = notFound
			c.JSON(http.StatusNotFound, gin.H{"message": "Historia clínica no encontrada. Cree el registro primero."})
			return
		}
		respondError(c, err)
		return
	}

	if err := h.clinicalRecord.UpsertAnamnesis(db, rec.ID, rec.BranchID, input); err != nil {
		respondError(c, err)
		return
	}

	updated, _ := h.clinicalRecord.GetByAppointmentID(db, apptID)
	c.JSON(http.StatusOK, updated)
}
