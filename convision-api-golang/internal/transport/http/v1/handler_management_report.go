package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	appointmentsvc "github.com/convision/api/internal/appointment"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// ListManagementReport godoc
// GET /api/v1/management-report
//
// Lists the appointments the current specialist handled (assigned or taken),
// paginated, with optional search / date-range / status / consultation_type
// filters. When the caller is an admin the attended-by constraint is skipped
// so the whole clinic activity is visible in read-only mode.
func (h *Handler) ListManagementReport(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	var specialistID uint
	isAdmin := claims.Role == domain.RoleAdmin
	if !isAdmin {
		specialistID = claims.UserID
	} else if sid := c.Query("specialist_id"); sid != "" && sid != "all" {
		if parsed, err := strconv.ParseUint(sid, 10, 32); err == nil {
			specialistID = uint(parsed)
		}
	}

	statusFilter := c.Query("status")
	if !isAdmin {
		statusFilter = "completed"
	}
	var branchID *uint
	if rawBranchID := c.Query("branch_id"); rawBranchID != "" && rawBranchID != "all" {
		if parsed, err := strconv.ParseUint(rawBranchID, 10, 32); err == nil {
			branchValue := uint(parsed)
			branchID = &branchValue
		}
	}

	db := tenantDBFromCtx(c)
	out, err := h.appointment.ListManagementReport(
		db,
		specialistID,
		c.Query("search"),
		c.Query("start_date"),
		c.Query("end_date"),
		statusFilter,
		c.Query("consultation_type"),
		branchID,
		c.Query("pending_report") == "true",
		page, perPage,
	)
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

// GetManagementReport godoc
// GET /api/v1/management-report/:id
//
// Returns a single appointment with its report data. Admins can read any
// appointment; specialists only the ones they handled.
func (h *Handler) GetManagementReport(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	db := tenantDBFromCtx(c)
	a, err := h.appointment.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}

	if claims.Role != domain.RoleAdmin &&
		(a.SpecialistID == nil || *a.SpecialistID != claims.UserID) &&
		(a.TakenByID == nil || *a.TakenByID != claims.UserID) {
		c.JSON(http.StatusForbidden, gin.H{"message": "no autorizado"})
		return
	}

	c.JSON(http.StatusOK, toAppointmentResource(a))
}

// SaveManagementReport godoc
// POST /api/v1/management-report/:id
//
// Saves the consultation_type + report_notes captured by the specialist.
// Ownership is enforced: only the assigned / taken-by specialist may write.
func (h *Handler) SaveManagementReport(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	db := tenantDBFromCtx(c)
	existing, err := h.appointment.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	if (existing.SpecialistID == nil || *existing.SpecialistID != claims.UserID) &&
		(existing.TakenByID == nil || *existing.TakenByID != claims.UserID) {
		c.JSON(http.StatusForbidden, gin.H{"message": "solo el especialista asignado puede registrar el informe"})
		return
	}

	var input appointmentsvc.ManagementReportInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	a, err := h.appointment.SaveManagementReport(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toAppointmentResource(a))
}
