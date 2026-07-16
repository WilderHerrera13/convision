package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
)

// ListRipsRecords godoc
// GET /api/v1/rips
//
// Admin view of built RIPS records (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 07).
func (h *Handler) ListRipsRecords(c *gin.Context) {
	var f domain.RipsRecordFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	db := tenantDBFromCtx(c)
	out, err := h.rips.List(db, f)
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

// GetRipsRecord godoc
// GET /api/v1/rips/:id
func (h *Handler) GetRipsRecord(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	db := tenantDBFromCtx(c)
	rec, err := h.rips.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, rec)
}

// AttachRipsInvoice godoc
// POST /api/v1/rips/:id/attach-invoice
//
// Links a real Factura Electrónica de Venta number once convision-invoicing-api
// has issued it, and attempts transmission per RIPS_TRANSMISSION_MODE.
func (h *Handler) AttachRipsInvoice(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var body struct {
		InvoiceNumber string `json:"invoice_number" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	db := tenantDBFromCtx(c)
	rec, err := h.rips.AttachInvoice(db, id, body.InvoiceNumber)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, rec)
}
