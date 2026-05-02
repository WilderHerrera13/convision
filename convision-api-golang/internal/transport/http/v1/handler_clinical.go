package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/clinic"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// ClinicalHistoryResource is the JSON shape for a clinical history.
type ClinicalHistoryResource struct {
	ID                             uint                      `json:"id"`
	PatientID                      uint                      `json:"patient_id"`
	Patient                        *PatientResource          `json:"patient"`
	Creator                        *UserResource             `json:"creator"`
	Updater                        *UserResource             `json:"updater"`
	Evolutions                     []ClinicalEvolutionResource `json:"evolutions"`
	ReasonForConsultation          string                    `json:"reason_for_consultation"`
	CurrentIllness                 string                    `json:"current_illness"`
	PersonalHistory                string                    `json:"personal_history"`
	FamilyHistory                  string                    `json:"family_history"`
	OccupationalHistory            string                    `json:"occupational_history"`
	UsesOpticalCorrection          bool                      `json:"uses_optical_correction"`
	OpticalCorrectionType          string                    `json:"optical_correction_type"`
	LastControlDetail              string                    `json:"last_control_detail"`
	OphthalmologicalDiagnosis      string                    `json:"ophthalmological_diagnosis"`
	EyeSurgery                     string                    `json:"eye_surgery"`
	HasSystemicDisease             bool                      `json:"has_systemic_disease"`
	SystemicDiseaseDetail          string                    `json:"systemic_disease_detail"`
	Medications                    string                    `json:"medications"`
	Allergies                      string                    `json:"allergies"`
	RightFarVisionNoCorrection     string                    `json:"right_far_vision_no_correction"`
	LeftFarVisionNoCorrection      string                    `json:"left_far_vision_no_correction"`
	RightNearVisionNoCorrection    string                    `json:"right_near_vision_no_correction"`
	LeftNearVisionNoCorrection     string                    `json:"left_near_vision_no_correction"`
	RightFarVisionWithCorrection   string                    `json:"right_far_vision_with_correction"`
	LeftFarVisionWithCorrection    string                    `json:"left_far_vision_with_correction"`
	RightNearVisionWithCorrection  string                    `json:"right_near_vision_with_correction"`
	LeftNearVisionWithCorrection   string                    `json:"left_near_vision_with_correction"`
	RightEyeExternalExam           string                    `json:"right_eye_external_exam"`
	LeftEyeExternalExam            string                    `json:"left_eye_external_exam"`
	RightEyeOphthalmoscopy         string                    `json:"right_eye_ophthalmoscopy"`
	LeftEyeOphthalmoscopy          string                    `json:"left_eye_ophthalmoscopy"`
	RightEyeHorizontalK            string                    `json:"right_eye_horizontal_k"`
	RightEyeVerticalK              string                    `json:"right_eye_vertical_k"`
	LeftEyeHorizontalK             string                    `json:"left_eye_horizontal_k"`
	LeftEyeVerticalK               string                    `json:"left_eye_vertical_k"`
	RefractionTechnique            string                    `json:"refraction_technique"`
	RightEyeStaticSphere           string                    `json:"right_eye_static_sphere"`
	RightEyeStaticCylinder         string                    `json:"right_eye_static_cylinder"`
	RightEyeStaticAxis             string                    `json:"right_eye_static_axis"`
	RightEyeStaticVisualAcuity     string                    `json:"right_eye_static_visual_acuity"`
	LeftEyeStaticSphere            string                    `json:"left_eye_static_sphere"`
	LeftEyeStaticCylinder          string                    `json:"left_eye_static_cylinder"`
	LeftEyeStaticAxis              string                    `json:"left_eye_static_axis"`
	LeftEyeStaticVisualAcuity      string                    `json:"left_eye_static_visual_acuity"`
	RightEyeSubjectiveSphere       string                    `json:"right_eye_subjective_sphere"`
	RightEyeSubjectiveCylinder     string                    `json:"right_eye_subjective_cylinder"`
	RightEyeSubjectiveAxis         string                    `json:"right_eye_subjective_axis"`
	RightEyeSubjectiveVisualAcuity string                    `json:"right_eye_subjective_visual_acuity"`
	LeftEyeSubjectiveSphere        string                    `json:"left_eye_subjective_sphere"`
	LeftEyeSubjectiveCylinder      string                    `json:"left_eye_subjective_cylinder"`
	LeftEyeSubjectiveAxis          string                    `json:"left_eye_subjective_axis"`
	LeftEyeSubjectiveVisualAcuity  string                    `json:"left_eye_subjective_visual_acuity"`
	Diagnostic                     string                    `json:"diagnostic"`
	TreatmentPlan                  string                    `json:"treatment_plan"`
	Observations                   string                    `json:"observations"`
	CreatedAt                      string                    `json:"created_at"`
	UpdatedAt                      string                    `json:"updated_at"`
}

// ClinicalEvolutionResource is the JSON shape for a clinical evolution.
type ClinicalEvolutionResource struct {
	ID                   uint                     `json:"id"`
	ClinicalHistoryID    uint                     `json:"clinical_history_id"`
	AppointmentID        *uint                    `json:"appointment_id"`
	CreatedBy            *uint                    `json:"created_by"`
	UpdatedBy            *uint                    `json:"updated_by"`
	EvolutionDate        interface{}              `json:"evolution_date"`
	Subjective           string                   `json:"subjective"`
	Objective            string                   `json:"objective"`
	Assessment           string                   `json:"assessment"`
	Plan                 string                   `json:"plan"`
	Recommendations      string                   `json:"recommendations"`
	RightFarVision       string                   `json:"right_far_vision"`
	LeftFarVision        string                   `json:"left_far_vision"`
	RightNearVision      string                   `json:"right_near_vision"`
	LeftNearVision       string                   `json:"left_near_vision"`
	RightEyeSphere       string                   `json:"right_eye_sphere"`
	RightEyeCylinder     string                   `json:"right_eye_cylinder"`
	RightEyeAxis         string                   `json:"right_eye_axis"`
	RightEyeVisualAcuity string                   `json:"right_eye_visual_acuity"`
	LeftEyeSphere        string                   `json:"left_eye_sphere"`
	LeftEyeCylinder      string                   `json:"left_eye_cylinder"`
	LeftEyeAxis          string                   `json:"left_eye_axis"`
	LeftEyeVisualAcuity  string                   `json:"left_eye_visual_acuity"`
	Creator              *UserResource            `json:"creator"`
	Updater              *UserResource            `json:"updater"`
	ClinicalHistory      *ClinicalHistoryResource `json:"clinical_history"`
	CreatedAt            string                   `json:"created_at"`
	UpdatedAt            string                   `json:"updated_at"`
}

func buildClinicalHistoryResource(h *domain.ClinicalHistory) ClinicalHistoryResource {
	r := ClinicalHistoryResource{
		ID:                             h.ID,
		PatientID:                      h.PatientID,
		ReasonForConsultation:          h.ReasonForConsultation,
		CurrentIllness:                 h.CurrentIllness,
		PersonalHistory:                h.PersonalHistory,
		FamilyHistory:                  h.FamilyHistory,
		OccupationalHistory:            h.OccupationalHistory,
		UsesOpticalCorrection:          h.UsesOpticalCorrection,
		OpticalCorrectionType:          h.OpticalCorrectionType,
		LastControlDetail:              h.LastControlDetail,
		OphthalmologicalDiagnosis:      h.OphthalmologicalDiagnosis,
		EyeSurgery:                     h.EyeSurgery,
		HasSystemicDisease:             h.HasSystemicDisease,
		SystemicDiseaseDetail:          h.SystemicDiseaseDetail,
		Medications:                    h.Medications,
		Allergies:                      h.Allergies,
		RightFarVisionNoCorrection:     h.RightFarVisionNoCorrection,
		LeftFarVisionNoCorrection:      h.LeftFarVisionNoCorrection,
		RightNearVisionNoCorrection:    h.RightNearVisionNoCorrection,
		LeftNearVisionNoCorrection:     h.LeftNearVisionNoCorrection,
		RightFarVisionWithCorrection:   h.RightFarVisionWithCorrection,
		LeftFarVisionWithCorrection:    h.LeftFarVisionWithCorrection,
		RightNearVisionWithCorrection:  h.RightNearVisionWithCorrection,
		LeftNearVisionWithCorrection:   h.LeftNearVisionWithCorrection,
		RightEyeExternalExam:           h.RightEyeExternalExam,
		LeftEyeExternalExam:            h.LeftEyeExternalExam,
		RightEyeOphthalmoscopy:         h.RightEyeOphthalmoscopy,
		LeftEyeOphthalmoscopy:          h.LeftEyeOphthalmoscopy,
		RightEyeHorizontalK:            h.RightEyeHorizontalK,
		RightEyeVerticalK:              h.RightEyeVerticalK,
		LeftEyeHorizontalK:             h.LeftEyeHorizontalK,
		LeftEyeVerticalK:               h.LeftEyeVerticalK,
		RefractionTechnique:            h.RefractionTechnique,
		RightEyeStaticSphere:           h.RightEyeStaticSphere,
		RightEyeStaticCylinder:         h.RightEyeStaticCylinder,
		RightEyeStaticAxis:             h.RightEyeStaticAxis,
		RightEyeStaticVisualAcuity:     h.RightEyeStaticVisualAcuity,
		LeftEyeStaticSphere:            h.LeftEyeStaticSphere,
		LeftEyeStaticCylinder:          h.LeftEyeStaticCylinder,
		LeftEyeStaticAxis:              h.LeftEyeStaticAxis,
		LeftEyeStaticVisualAcuity:      h.LeftEyeStaticVisualAcuity,
		RightEyeSubjectiveSphere:       h.RightEyeSubjectiveSphere,
		RightEyeSubjectiveCylinder:     h.RightEyeSubjectiveCylinder,
		RightEyeSubjectiveAxis:         h.RightEyeSubjectiveAxis,
		RightEyeSubjectiveVisualAcuity: h.RightEyeSubjectiveVisualAcuity,
		LeftEyeSubjectiveSphere:        h.LeftEyeSubjectiveSphere,
		LeftEyeSubjectiveCylinder:      h.LeftEyeSubjectiveCylinder,
		LeftEyeSubjectiveAxis:          h.LeftEyeSubjectiveAxis,
		LeftEyeSubjectiveVisualAcuity:  h.LeftEyeSubjectiveVisualAcuity,
		Diagnostic:                     h.Diagnostic,
		TreatmentPlan:                  h.TreatmentPlan,
		Observations:                   h.Observations,
		Evolutions:                     []ClinicalEvolutionResource{},
		CreatedAt:                      h.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:                      h.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}

	if h.Patient != nil {
		pr := toPatientResource(h.Patient)
		r.Patient = &pr
	}
	if h.Creator != nil {
		ur := toUserResource(h.Creator)
		r.Creator = &ur
	}
	if h.Updater != nil {
		ur := toUserResource(h.Updater)
		r.Updater = &ur
	}
	for _, e := range h.Evolutions {
		eCopy := e
		r.Evolutions = append(r.Evolutions, buildClinicalEvolutionResource(&eCopy))
	}

	return r
}

func buildClinicalEvolutionResource(e *domain.ClinicalEvolution) ClinicalEvolutionResource {
	r := ClinicalEvolutionResource{
		ID:                   e.ID,
		ClinicalHistoryID:    e.ClinicalHistoryID,
		AppointmentID:        e.AppointmentID,
		CreatedBy:            e.CreatedBy,
		UpdatedBy:            e.UpdatedBy,
		Subjective:           e.Subjective,
		Objective:            e.Objective,
		Assessment:           e.Assessment,
		Plan:                 e.Plan,
		Recommendations:      e.Recommendations,
		RightFarVision:       e.RightFarVision,
		LeftFarVision:        e.LeftFarVision,
		RightNearVision:      e.RightNearVision,
		LeftNearVision:       e.LeftNearVision,
		RightEyeSphere:       e.RightEyeSphere,
		RightEyeCylinder:     e.RightEyeCylinder,
		RightEyeAxis:         e.RightEyeAxis,
		RightEyeVisualAcuity: e.RightEyeVisualAcuity,
		LeftEyeSphere:        e.LeftEyeSphere,
		LeftEyeCylinder:      e.LeftEyeCylinder,
		LeftEyeAxis:          e.LeftEyeAxis,
		LeftEyeVisualAcuity:  e.LeftEyeVisualAcuity,
		CreatedAt:            e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:            e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}

	if e.EvolutionDate != nil {
		r.EvolutionDate = e.EvolutionDate.Format("2006-01-02")
	}
	if e.Creator != nil {
		ur := toUserResource(e.Creator)
		r.Creator = &ur
	}
	if e.Updater != nil {
		ur := toUserResource(e.Updater)
		r.Updater = &ur
	}

	return r
}

// ---------- Clinical Histories ----------

// ListClinicalHistories godoc
// GET /api/v1/clinical-histories
func (h *Handler) ListClinicalHistories(c *gin.Context) {
	db := tenantDBFromCtx(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	if filters == nil {
		filters = make(map[string]any)
	}

	out, err := h.clinic.List(db, filters, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	resources := make([]ClinicalHistoryResource, len(out.Data))
	for i, rec := range out.Data {
		resources[i] = buildClinicalHistoryResource(rec)
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

// GetClinicalHistory godoc
// GET /api/v1/clinical-histories/:id
func (h *Handler) GetClinicalHistory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	rec, err := h.clinic.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildClinicalHistoryResource(rec))
}

// CreateClinicalHistory godoc
// POST /api/v1/clinical-histories
func (h *Handler) CreateClinicalHistory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input clinic.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	// Set created_by from JWT if available
	if claims, ok := jwtauth.GetClaims(c); ok {
		input.CreatedBy = &claims.UserID
	}

	rec, err := h.clinic.Create(db, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, buildClinicalHistoryResource(rec))
}

// UpdateClinicalHistory godoc
// PUT /api/v1/clinical-histories/:id
func (h *Handler) UpdateClinicalHistory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinic.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	// Set updated_by from JWT if available
	if claims, ok := jwtauth.GetClaims(c); ok {
		input.UpdatedBy = &claims.UserID
	}

	db := tenantDBFromCtx(c)
	rec, err := h.clinic.Update(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildClinicalHistoryResource(rec))
}

// GetPatientClinicalHistory godoc
// GET /api/v1/patients/:patientId/clinical-history
func (h *Handler) GetPatientClinicalHistory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	patientID, err := parseID(c, "id")
	if err != nil {
		return
	}

	rec, err := h.clinic.GetByPatientIDSingle(db, patientID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildClinicalHistoryResource(rec))
}

// ---------- Clinical Evolutions ----------

// ListClinicalEvolutions godoc
// GET /api/v1/clinical-histories/:historyId/evolutions
func (h *Handler) ListClinicalEvolutions(c *gin.Context) {
	db := tenantDBFromCtx(c)
	historyID, err := parseID(c, "id")
	if err != nil {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	out, err := h.clinic.ListEvolutions(db, historyID, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}

	resources := make([]ClinicalEvolutionResource, len(out.Data))
	for i, e := range out.Data {
		resources[i] = buildClinicalEvolutionResource(e)
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

// GetClinicalEvolution godoc
// GET /api/v1/clinical-evolutions/:id
func (h *Handler) GetClinicalEvolution(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	e, err := h.clinic.GetEvolutionByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildClinicalEvolutionResource(e))
}

// CreateClinicalEvolution godoc
// POST /api/v1/clinical-evolutions
func (h *Handler) CreateClinicalEvolution(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input clinic.CreateEvolutionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	if claims, ok := jwtauth.GetClaims(c); ok {
		input.CreatedBy = &claims.UserID
	}

	e, err := h.clinic.CreateEvolution(db, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, buildClinicalEvolutionResource(e))
}

// UpdateClinicalEvolution godoc
// PUT /api/v1/clinical-evolutions/:id
func (h *Handler) UpdateClinicalEvolution(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input clinic.UpdateEvolutionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	if claims, ok := jwtauth.GetClaims(c); ok {
		input.UpdatedBy = &claims.UserID
	}

	db := tenantDBFromCtx(c)
	e, err := h.clinic.UpdateEvolution(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, buildClinicalEvolutionResource(e))
}

// DeleteClinicalEvolution godoc
// DELETE /api/v1/clinical-evolutions/:id
func (h *Handler) DeleteClinicalEvolution(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	if err := h.clinic.DeleteEvolution(db, id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ListClinicalRecords godoc (legacy compat)
// GET /api/v1/patients/:id/records
func (h *Handler) ListClinicalRecords(c *gin.Context) {
	patientID, err := parseID(c, "id")
	if err != nil {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	db := tenantDBFromCtx(c)
	records, total, err := h.clinic.ListByPatient(db, patientID, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}

	lastPage := 1
	if perPage > 0 && total > 0 {
		lp := (int(total) + perPage - 1) / perPage
		if lp > 1 {
			lastPage = lp
		}
	}

	resources := make([]ClinicalHistoryResource, len(records))
	for i, rec := range records {
		resources[i] = buildClinicalHistoryResource(rec)
	}

	c.JSON(http.StatusOK, gin.H{
		"current_page": page,
		"data":         resources,
		"last_page":    lastPage,
		"per_page":     perPage,
		"total":        total,
		"meta": gin.H{
			"current_page": page,
			"last_page":    lastPage,
			"per_page":     perPage,
			"total":        total,
		},
	})
}
