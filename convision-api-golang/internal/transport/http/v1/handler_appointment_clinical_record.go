package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"

	clinicalrecordsvc "github.com/convision/api/internal/clinicalrecord"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// GetAppointmentClinicalRecord godoc
// GET /api/v1/appointments/:id/clinical-record
func (h *Handler) GetAppointmentClinicalRecord(c *gin.Context) {
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(apptID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, rec)
}

// CreateAppointmentClinicalRecord godoc
// POST /api/v1/appointments/:id/clinical-record
func (h *Handler) CreateAppointmentClinicalRecord(c *gin.Context) {
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	appt, err := h.appointment.GetByID(apptID)
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
		ClinicID:      1,
		RecordType:    body.RecordType,
	}

	rec, err := h.clinicalRecord.Create(in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, rec)
}

// UpsertAppointmentAnamnesis godoc
// PUT /api/v1/appointments/:id/clinical-record/anamnesis
func (h *Handler) UpsertAppointmentAnamnesis(c *gin.Context) {
	apptID, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinicalrecordsvc.AnamnesisInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	rec, err := h.clinicalRecord.GetByAppointmentID(apptID)
	if err != nil {
		if notFound, ok := err.(*domain.ErrNotFound); ok {
			_ = notFound
			c.JSON(http.StatusNotFound, gin.H{"message": "Historia clínica no encontrada. Cree el registro primero."})
			return
		}
		respondError(c, err)
		return
	}

	if err := h.clinicalRecord.UpsertAnamnesis(rec.ID, rec.ClinicID, input); err != nil {
		respondError(c, err)
		return
	}

	updated, _ := h.clinicalRecord.GetByAppointmentID(apptID)
	c.JSON(http.StatusOK, updated)
}
