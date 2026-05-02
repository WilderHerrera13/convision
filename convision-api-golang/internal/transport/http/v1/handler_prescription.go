package v1

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	prescriptionsvc "github.com/convision/api/internal/prescription"
)

// PrescriptionResource is the JSON shape returned for every prescription response.
type PrescriptionResource struct {
	ID                    uint                 `json:"id"`
	AppointmentID         *uint                `json:"appointment_id"`
	Date                  interface{}          `json:"date"`
	Document              string               `json:"document"`
	PatientName           string               `json:"patient_name"`
	RightSphere           string               `json:"right_sphere"`
	RightCylinder         string               `json:"right_cylinder"`
	RightAxis             string               `json:"right_axis"`
	RightAddition         string               `json:"right_addition"`
	RightHeight           string               `json:"right_height"`
	RightDistanceP        string               `json:"right_distance_p"`
	RightVisualAcuityFar  string               `json:"right_visual_acuity_far"`
	RightVisualAcuityNear string               `json:"right_visual_acuity_near"`
	LeftSphere            string               `json:"left_sphere"`
	LeftCylinder          string               `json:"left_cylinder"`
	LeftAxis              string               `json:"left_axis"`
	LeftAddition          string               `json:"left_addition"`
	LeftHeight            string               `json:"left_height"`
	LeftDistanceP         string               `json:"left_distance_p"`
	LeftVisualAcuityFar   string               `json:"left_visual_acuity_far"`
	LeftVisualAcuityNear  string               `json:"left_visual_acuity_near"`
	CorrectionType        string               `json:"correction_type"`
	UsageType             string               `json:"usage_type"`
	Recommendation        string               `json:"recommendation"`
	Professional          string               `json:"professional"`
	Observation           string               `json:"observation"`
	Attachment            string               `json:"attachment"`
	AnnotationPaths       interface{}          `json:"annotation_paths"`
	CreatedAt             string               `json:"created_at"`
	UpdatedAt             string               `json:"updated_at"`
	Appointment           *AppointmentResource `json:"appointment"`
}

func buildPrescriptionResource(p *domain.Prescription) PrescriptionResource {
	r := PrescriptionResource{
		ID:                    p.ID,
		AppointmentID:         p.AppointmentID,
		Document:              p.Document,
		PatientName:           p.PatientName,
		RightSphere:           p.RightSphere,
		RightCylinder:         p.RightCylinder,
		RightAxis:             p.RightAxis,
		RightAddition:         p.RightAddition,
		RightHeight:           p.RightHeight,
		RightDistanceP:        p.RightDistanceP,
		RightVisualAcuityFar:  p.RightVisualAcuityFar,
		RightVisualAcuityNear: p.RightVisualAcuityNear,
		LeftSphere:            p.LeftSphere,
		LeftCylinder:          p.LeftCylinder,
		LeftAxis:              p.LeftAxis,
		LeftAddition:          p.LeftAddition,
		LeftHeight:            p.LeftHeight,
		LeftDistanceP:         p.LeftDistanceP,
		LeftVisualAcuityFar:   p.LeftVisualAcuityFar,
		LeftVisualAcuityNear:  p.LeftVisualAcuityNear,
		CorrectionType:        p.CorrectionType,
		UsageType:             p.UsageType,
		Recommendation:        p.Recommendation,
		Professional:          p.Professional,
		Observation:           p.Observation,
		Attachment:            p.Attachment,
		CreatedAt:             p.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:             p.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}

	if p.Date != nil {
		r.Date = p.Date.Format("2006-01-02")
	} else {
		r.Date = nil
	}

	// annotation_paths: parse JSON or return null
	if p.AnnotationPaths != "" {
		var v interface{}
		if err := json.Unmarshal([]byte(p.AnnotationPaths), &v); err == nil {
			r.AnnotationPaths = v
		} else {
			r.AnnotationPaths = nil
		}
	} else {
		r.AnnotationPaths = nil
	}

	if p.Appointment != nil {
		ar := toAppointmentResource(p.Appointment)
		r.Appointment = &ar
	}

	return r
}

// ListPrescriptions godoc
// GET /api/v1/prescriptions
func (h *Handler) ListPrescriptions(c *gin.Context) {
	db := tenantDBFromCtx(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	if filters == nil {
		filters = make(map[string]any)
	}

	out, err := h.prescription.List(db, filters, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	resources := make([]PrescriptionResource, len(out.Data))
	for i, p := range out.Data {
		resources[i] = buildPrescriptionResource(p)
	}

	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         resources,
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

// GetPrescription godoc
// GET /api/v1/prescriptions/:id
func (h *Handler) GetPrescription(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	p, err := h.prescription.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildPrescriptionResource(p))
}

// CreatePrescription godoc
// POST /api/v1/prescriptions
func (h *Handler) CreatePrescription(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input prescriptionsvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	p, err := h.prescription.Create(db, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, buildPrescriptionResource(p))
}

// UpdatePrescription godoc
// PUT /api/v1/prescriptions/:id
func (h *Handler) UpdatePrescription(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input prescriptionsvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	p, err := h.prescription.Update(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildPrescriptionResource(p))
}

// DeletePrescription godoc
// DELETE /api/v1/prescriptions/:id
func (h *Handler) DeletePrescription(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	if err := h.prescription.Delete(db, id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ListPatientPrescriptions godoc
// GET /api/v1/patients/:id/prescriptions
func (h *Handler) ListPatientPrescriptions(c *gin.Context) {
	db := tenantDBFromCtx(c)
	patientID, err := parseID(c, "id")
	if err != nil {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	out, err := h.prescription.ListByPatient(db, patientID, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}

	resources := make([]PrescriptionResource, len(out.Data))
	for i, p := range out.Data {
		resources[i] = buildPrescriptionResource(p)
	}

	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         resources,
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
