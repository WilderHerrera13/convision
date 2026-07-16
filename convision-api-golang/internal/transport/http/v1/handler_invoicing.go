package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/invoicingclient"
)

// ListElectronicDocuments proxies to convision-invoicing-api and returns a
// paginated list of all electronic documents (FV, NC, ND, DS) for this optica.
func (h *Handler) ListElectronicDocuments(c *gin.Context) {
	if !h.invoicing.IsEnabled() {
		c.JSON(http.StatusOK, gin.H{
			"data":         []any{},
			"total":        0,
			"current_page": 1,
			"per_page":     20,
			"last_page":    1,
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filter := invoicingclient.InvoiceFilter{
		DocumentType: c.Query("document_type"),
		DIANStatus:   c.Query("dian_status"),
		StartDate:    c.Query("start_date"),
		EndDate:      c.Query("end_date"),
		ExternalRef:  c.Query("external_ref"),
		Page:         page,
		PageSize:     pageSize,
	}

	result, err := h.invoicing.ListInvoices(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Error consultando documentos electrónicos: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetElectronicDocument returns a single electronic document by its invoicing ID.
func (h *Handler) GetElectronicDocument(c *gin.Context) {
	if !h.invoicing.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Servicio de facturación no configurado"})
		return
	}

	invoiceID := c.Param("id")
	inv, err := h.invoicing.GetInvoice(c.Request.Context(), h.invoicing.IssuerID(), invoiceID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, inv)
}

// DownloadElectronicDocumentXML streams the signed UBL XML file for download.
func (h *Handler) DownloadElectronicDocumentXML(c *gin.Context) {
	if !h.invoicing.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Servicio de facturación no configurado"})
		return
	}

	invoiceID := c.Param("id")
	xmlBytes, err := h.invoicing.GetInvoiceXML(c.Request.Context(), invoiceID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	filename := "documento_" + invoiceID + ".xml"
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/xml; charset=utf-8", xmlBytes)
}

// RetryElectronicDocument retries transmission of a contingency document.
func (h *Handler) RetryElectronicDocument(c *gin.Context) {
	if !h.invoicing.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Servicio de facturación no configurado"})
		return
	}

	invoiceID := c.Param("id")
	inv, err := h.invoicing.RetryContingency(c.Request.Context(), h.invoicing.IssuerID(), invoiceID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, inv)
}
