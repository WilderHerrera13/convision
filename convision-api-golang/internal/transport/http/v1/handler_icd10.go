package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
)

// ListIcd10Codes godoc
// GET /api/v1/icd10-codes?search=H52
//
// Backs the diagnosis search combobox in DiagnosisTab.tsx (replaces the
// previous free-text CIE-10 inputs — see
// docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 03/08).
func (h *Handler) ListIcd10Codes(c *gin.Context) {
	var f domain.Icd10CodeFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	db := tenantDBFromCtx(c)
	out, err := h.icd10.List(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":     out.Data,
		"total":    out.Total,
		"page":     out.Page,
		"per_page": out.PerPage,
	})
}
