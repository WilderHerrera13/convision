package v1

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	appointmentsvc "github.com/convision/api/internal/appointment"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// AppointmentResource is the JSON shape returned for every appointment response.
type AppointmentResource struct {
	ID                       uint            `json:"id"`
	PatientID                uint            `json:"patient_id"`
	SpecialistID             *uint           `json:"specialist_id"`
	ReceptionistID           *uint           `json:"receptionist_id"`
	ScheduledAt              *string         `json:"scheduled_at"`
	Notes                    string          `json:"notes"`
	Reason                   string          `json:"reason"`
	Status                   string          `json:"status"`
	CreatedAt                string          `json:"created_at"`
	UpdatedAt                string          `json:"updated_at"`
	Patient                  *PatientResource `json:"patient"`
	Specialist               *UserResource   `json:"specialist"`
	Receptionist             *UserResource   `json:"receptionist"`
	Prescription             interface{}     `json:"prescription"`
	TakenBy                  *UserResource   `json:"taken_by"`
	IsBilled                 bool            `json:"is_billed"`
	Billing                  interface{}     `json:"billing"`
	SaleID                   *uint           `json:"sale_id"`
	LeftEyeAnnotationPaths   json.RawMessage `json:"left_eye_annotation_paths"`
	LeftEyeAnnotationImageURL *string        `json:"left_eye_annotation_image_url"`
	RightEyeAnnotationPaths  json.RawMessage `json:"right_eye_annotation_paths"`
	RightEyeAnnotationImageURL *string       `json:"right_eye_annotation_image_url"`
	LensAnnotationImage      *string         `json:"lens_annotation_image"`
	LensAnnotationPaths      json.RawMessage `json:"lens_annotation_paths"`
	ConsultationType         *string         `json:"consultation_type"`
	ReportNotes              *string         `json:"report_notes"`
}

func parseRawJSON(s string) json.RawMessage {
	if s == "" {
		return json.RawMessage("null")
	}
	var v interface{}
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return json.RawMessage("null")
	}
	return json.RawMessage(s)
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func toAppointmentResource(a *domain.Appointment) AppointmentResource {
	r := AppointmentResource{
		ID:                      a.ID,
		PatientID:               a.PatientID,
		SpecialistID:            a.SpecialistID,
		ReceptionistID:          a.ReceptionistID,
		Notes:                   a.Notes,
		Reason:                  a.Reason,
		Status:                  string(a.Status),
		IsBilled:                a.IsBilled,
		SaleID:                  a.SaleID,
		Billing:                 nil,
		Prescription:            nil,
		LeftEyeAnnotationPaths:  parseRawJSON(a.LeftEyeAnnotationPaths),
		RightEyeAnnotationPaths: parseRawJSON(a.RightEyeAnnotationPaths),
		LensAnnotationPaths:     parseRawJSON(a.LensAnnotationPaths),
		LensAnnotationImage:     nullableString(a.LensAnnotationImage),
		ConsultationType:        nullableString(a.ConsultationType),
		ReportNotes:             nullableString(a.ReportNotes),
		CreatedAt:               a.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:               a.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}

	if a.ScheduledAt != nil {
		s := a.ScheduledAt.UTC().Format(timeFormat) + "Z"
		r.ScheduledAt = &s
	}
	if a.LeftEyeAnnotationImage != "" {
		r.LeftEyeAnnotationImageURL = &a.LeftEyeAnnotationImage
	}
	if a.RightEyeAnnotationImage != "" {
		r.RightEyeAnnotationImageURL = &a.RightEyeAnnotationImage
	}
	if a.Patient != nil {
		pr := toPatientResource(a.Patient)
		r.Patient = &pr
	}
	if a.Specialist != nil {
		ur := toUserResource(a.Specialist)
		r.Specialist = &ur
	}
	if a.Receptionist != nil {
		ur := toUserResource(a.Receptionist)
		r.Receptionist = &ur
	}
	if a.TakenBy != nil {
		ur := toUserResource(a.TakenBy)
		r.TakenBy = &ur
	}

	return r
}

func toAppointmentResources(appointments []*domain.Appointment) []AppointmentResource {
	out := make([]AppointmentResource, len(appointments))
	for i, a := range appointments {
		out[i] = toAppointmentResource(a)
	}
	return out
}

// parseAppointmentFilters parses appointment-specific filters from s_f/s_v query params.
var appointmentStringFilters = map[string]bool{
	"status": true,
}

func parseAppointmentApiFilters(c *gin.Context) map[string]any {
	filters := parseApiFilters(c)
	if filters == nil {
		filters = make(map[string]any)
	}
	// Also support direct query params for common filters
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	return filters
}

// ListAppointments godoc
// GET /api/v1/appointments
func (h *Handler) ListAppointments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseAppointmentApiFilters(c)

	if v := c.Query("start_date"); v != "" {
		filters["_start_date"] = v
	}
	if v := c.Query("end_date"); v != "" {
		filters["_end_date"] = v
	}

	out, err := h.appointment.List(filters, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         toAppointmentResources(out.Data),
		"last_page":    out.LastPage,
		"per_page":     out.PerPage,
		"total":        out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

// GetAppointment godoc
// GET /api/v1/appointments/:id
func (h *Handler) GetAppointment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	a, err := h.appointment.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// CreateAppointment godoc
// POST /api/v1/appointments
func (h *Handler) CreateAppointment(c *gin.Context) {
	var input appointmentsvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	a, err := h.appointment.Create(input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toAppointmentResource(a))
}

// UpdateAppointment godoc
// PUT /api/v1/appointments/:id
func (h *Handler) UpdateAppointment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input appointmentsvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	a, err := h.appointment.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// DeleteAppointment godoc
// DELETE /api/v1/appointments/:id
func (h *Handler) DeleteAppointment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	if err := h.appointment.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// TakeAppointment godoc
// POST /api/v1/appointments/:id/take
func (h *Handler) TakeAppointment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	a, err := h.appointment.Take(id, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// PauseAppointment godoc
// POST /api/v1/appointments/:id/pause
func (h *Handler) PauseAppointment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	a, err := h.appointment.Pause(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// ResumeAppointment godoc
// POST /api/v1/appointments/:id/resume
func (h *Handler) ResumeAppointment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	a, err := h.appointment.Resume(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// SaveAppointmentAnnotations godoc
// POST /api/v1/appointments/:id/annotations
func (h *Handler) SaveAppointmentAnnotations(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input appointmentsvc.AnnotationsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	a, err := h.appointment.SaveAnnotations(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// GetAppointmentAvailableSlots godoc
// GET /api/v1/appointments/available-slots?specialist_id=X&date=YYYY-MM-DD
func (h *Handler) GetAppointmentAvailableSlots(c *gin.Context) {
	specialistIDStr := c.Query("specialist_id")
	dateStr := c.Query("date")

	if specialistIDStr == "" || dateStr == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "specialist_id and date are required"})
		return
	}

	specialistID, err := strconv.ParseUint(specialistIDStr, 10, 64)
	if err != nil || specialistID == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "specialist_id must be a positive integer"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "date must be in YYYY-MM-DD format"})
		return
	}

	booked, err := h.appointment.GetBookedSlots(uint(specialistID), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"booked_slots": booked})
}

// GetLensAnnotation godoc
// GET /api/v1/appointments/:id/lens-annotation
func (h *Handler) GetLensAnnotation(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	a, err := h.appointment.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"lens_annotation_image":     nullableString(a.LensAnnotationImage),
		"lens_annotation_image_url": nullableString(a.LensAnnotationImage),
		"lens_annotation_paths":     parseRawJSON(a.LensAnnotationPaths),
	})
}
