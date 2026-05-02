package v1

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// GetConsolidatedSpecialistReport godoc
// GET /api/v1/specialist-reports/consolidated
//
// Returns KPI totals + per-specialist breakdown for the given date range.
// Admin-only. Optional query params: from, to (YYYY-MM-DD), specialist_ids
// (comma-separated user IDs).
func (h *Handler) GetConsolidatedSpecialistReport(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")

	var specialistIDs []uint
	if raw := c.Query("specialist_ids"); raw != "" && raw != "all" {
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := strconv.ParseUint(part, 10, 32)
			if err == nil {
				specialistIDs = append(specialistIDs, uint(id))
			}
		}
	}
	var branchID *uint
	if rawBranchID := c.Query("branch_id"); rawBranchID != "" && rawBranchID != "all" {
		if parsed, err := strconv.ParseUint(rawBranchID, 10, 32); err == nil {
			branchValue := uint(parsed)
			branchID = &branchValue
		}
	}

	db := tenantDBFromCtx(c)
	rows, err := h.appointment.GetConsolidatedReport(db, from, to, specialistIDs, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	// Compute cross-specialist KPI totals.
	var kpis struct {
		Effective        int64 `json:"effective"`
		FormulaSale      int64 `json:"formula_sale"`
		Ineffective      int64 `json:"ineffective"`
		FollowUp         int64 `json:"follow_up"`
		WarrantyFollowUp int64 `json:"warranty_follow_up"`
	}
	for _, r := range rows {
		kpis.Effective += r.Effective
		kpis.FormulaSale += r.FormulaSale
		kpis.Ineffective += r.Ineffective
		kpis.FollowUp += r.FollowUp
		kpis.WarrantyFollowUp += r.WarrantyFollowUp
	}

	c.JSON(http.StatusOK, gin.H{
		"from":              from,
		"to":                to,
		"specialists_count": len(rows),
		"kpis":              kpis,
		"rows":              rows,
	})
}

// GetSpecialistReportDetail godoc
// GET /api/v1/specialist-reports/specialists/:id
//
// Returns KPI summary + paginated consultation records for one specialist.
// Admin-only. Optional query params: from, to, search, page, per_page.
func (h *Handler) GetSpecialistReportDetail(c *gin.Context) {
	specialistID, err := parseID(c, "id")
	if err != nil {
		return
	}

	from := c.Query("from")
	to := c.Query("to")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	db := tenantDBFromCtx(c)

	// KPI aggregation for this specialist only.
	rows, err := h.appointment.GetConsolidatedReport(db, from, to, []uint{specialistID}, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	var kpis domain.SpecialistReportSummary
	if len(rows) > 0 {
		kpis = *rows[0]
	}

	// Specialist profile.
	specialist, err := h.user.GetByID(db, specialistID)
	if err != nil {
		respondError(c, err)
		return
	}

	// Paginated consultation records.
	records, err := h.appointment.ListManagementReport(
		db,
		specialistID,
		c.Query("search"),
		from,
		to,
		"",
		"",
		nil,
		false,
		page,
		perPage,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"specialist": gin.H{
			"id":        specialist.ID,
			"name":      specialist.Name,
			"last_name": specialist.LastName,
			"role":      specialist.Role,
		},
		"kpis": gin.H{
			"effective":          kpis.Effective,
			"formula_sale":       kpis.FormulaSale,
			"ineffective":        kpis.Ineffective,
			"follow_up":          kpis.FollowUp,
			"warranty_follow_up": kpis.WarrantyFollowUp,
		},
		"from": from,
		"to":   to,
		"records": gin.H{
			"data":         toAppointmentResources(records.Data),
			"total":        records.Total,
			"current_page": records.CurrentPage,
			"last_page":    records.LastPage,
			"per_page":     records.PerPage,
		},
	})
}

// UploadBulkExcel godoc
// POST /api/v1/specialist-reports/bulk-upload
//
// Stub endpoint for Excel bulk upload. Returns 501 until the Excel parsing
// library (github.com/xuri/excelize/v2) is integrated.
func (h *Handler) UploadBulkExcel(c *gin.Context) {
	_, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "Carga masiva Excel pendiente de integrar biblioteca de parseo. Agrega github.com/xuri/excelize/v2 al módulo.",
	})
}
