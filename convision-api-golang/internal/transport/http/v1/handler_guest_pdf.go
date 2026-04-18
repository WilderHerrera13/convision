package v1

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// validateGuestToken validates the simple PDF token format used by the Go API.
// Token format: "<hex_id>-<nanoseconds>"
// Returns true if the token starts with the hex of the given ID.
func validateGuestToken(token string, id uint) bool {
	if token == "" {
		return false
	}
	expected := fmt.Sprintf("%x-", id)
	if !strings.HasPrefix(token, expected) {
		return false
	}
	// Extract the nanoseconds part and verify it's a valid number
	parts := strings.SplitN(token, "-", 2)
	if len(parts) != 2 {
		return false
	}
	_, err := strconv.ParseInt(parts[1], 10, 64)
	return err == nil
}

// writePdfResponse writes a minimal PDF response for a given resource.
// In a production environment, this would generate a real PDF using a library.
func writePdfResponse(c *gin.Context, resourceType string, id uint) {
	now := time.Now().Format("2006-01-02 15:04:05")
	// Minimal valid PDF (1.4) with text content
	content := fmt.Sprintf("Documento: %s #%d\nGenerado: %s\n", resourceType, id, now)
	pdfBody := buildMinimalPDF(content)

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s-%d.pdf"`, resourceType, id))
	c.Data(http.StatusOK, "application/pdf", pdfBody)
}

// buildMinimalPDF creates a syntactically valid minimal PDF with the given text.
func buildMinimalPDF(text string) []byte {
	body := fmt.Sprintf(`%%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length %d>>
stream
BT /F1 12 Tf 50 750 Td (%s) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%%%EOF`, len(text)+40, text)
	return []byte(body)
}

// ---------- Guest PDF Handlers ----------

// GuestOrderPdf godoc
// GET /api/v1/guest/orders/:id/pdf?token=...
func (h *Handler) GuestOrderPdf(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurso no encontrado."})
		return
	}
	token := c.Query("token")
	if !validateGuestToken(token, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "El enlace ha expirado o no es válido."})
		return
	}
	writePdfResponse(c, "order", uint(id))
}

// GuestOrderLabPdf godoc
// GET /api/v1/guest/orders/:id/laboratory-pdf?token=...
func (h *Handler) GuestOrderLabPdf(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurso no encontrado."})
		return
	}
	token := c.Query("token")
	if !validateGuestToken(token, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "El enlace ha expirado o no es válido."})
		return
	}
	writePdfResponse(c, "order-lab", uint(id))
}

// GuestLaboratoryOrderPdf godoc
// GET /api/v1/guest/laboratory-orders/:id/pdf?token=...
func (h *Handler) GuestLaboratoryOrderPdf(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurso no encontrado."})
		return
	}
	token := c.Query("token")
	if !validateGuestToken(token, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "El enlace ha expirado o no es válido."})
		return
	}
	writePdfResponse(c, "laboratory-order", uint(id))
}

// GuestSalePdf godoc
// GET /api/v1/guest/sales/:id/pdf?token=...
func (h *Handler) GuestSalePdf(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurso no encontrado."})
		return
	}
	token := c.Query("token")
	if !validateGuestToken(token, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "El enlace ha expirado o no es válido."})
		return
	}
	writePdfResponse(c, "sale", uint(id))
}

// GuestQuotePdf godoc
// GET /api/v1/guest/quotes/:id/pdf?token=...
func (h *Handler) GuestQuotePdf(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurso no encontrado."})
		return
	}
	token := c.Query("token")
	if !validateGuestToken(token, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "El enlace ha expirado o no es válido."})
		return
	}
	writePdfResponse(c, "quote", uint(id))
}

// GuestClinicalHistoryPdf godoc
// GET /api/v1/guest/clinical-histories/:id/pdf?token=...
func (h *Handler) GuestClinicalHistoryPdf(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Recurso no encontrado."})
		return
	}
	token := c.Query("token")
	if !validateGuestToken(token, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "El enlace ha expirado o no es válido."})
		return
	}
	writePdfResponse(c, "clinical-history", uint(id))
}
