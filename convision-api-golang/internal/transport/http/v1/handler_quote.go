package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	quotesvc "github.com/convision/api/internal/quote"
)

// ListQuotes godoc
// GET /api/v1/quotes
func (h *Handler) ListQuotes(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}
	if v := c.Query("patient_id"); v != "" {
		filters["patient_id"] = v
	}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}

	out, err := h.quote.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetQuote godoc
// GET /api/v1/quotes/:id
func (h *Handler) GetQuote(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	q, err := h.quote.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, q)
}

// CreateQuote godoc
// POST /api/v1/quotes
func (h *Handler) CreateQuote(c *gin.Context) {
	var input quotesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	q, err := h.quote.Create(input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	pdfData, _ := h.quote.GeneratePdfToken(q.ID)
	pdfToken := ""
	pdfURL := ""
	if pdfData != nil {
		if v, ok := pdfData["pdf_token"].(string); ok {
			pdfToken = v
		}
		if v, ok := pdfData["guest_pdf_url"].(string); ok {
			pdfURL = v
		}
	}
	c.JSON(http.StatusCreated, gin.H{
		"message":   "Cotización creada exitosamente",
		"quote":     q,
		"pdf_url":   pdfURL,
		"pdf_token": pdfToken,
	})
}

// UpdateQuote godoc
// PUT /api/v1/quotes/:id
func (h *Handler) UpdateQuote(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input quotesvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	q, err := h.quote.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, q)
}

// DeleteQuote godoc
// DELETE /api/v1/quotes/:id
func (h *Handler) DeleteQuote(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.quote.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// UpdateQuoteStatus godoc
// POST /api/v1/quotes/:id/status
func (h *Handler) UpdateQuoteStatus(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input quotesvc.StatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	q, err := h.quote.UpdateStatus(id, input.Status)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, q)
}

// ConvertQuote godoc
// POST /api/v1/quotes/:id/convert
func (h *Handler) ConvertQuote(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	var input quotesvc.ConvertInput
	// Input is optional (payments may be empty)
	_ = c.ShouldBindJSON(&input)

	sale, err := h.quote.ConvertToSale(id, claims.UserID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, sale)
}

// GetQuotePdf godoc
// GET /api/v1/quotes/:id/pdf
func (h *Handler) GetQuotePdf(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	result, err := h.quote.GeneratePdfToken(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetQuotePdfToken godoc
// GET /api/v1/quotes/:id/pdf-token
func (h *Handler) GetQuotePdfToken(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	result, err := h.quote.GeneratePdfToken(id)
	if err != nil {
		respondError(c, err)
		return
	}
	token := ""
	url := ""
	if v, ok := result["pdf_token"].(string); ok {
		token = v
	}
	if v, ok := result["guest_pdf_url"].(string); ok {
		url = v
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"token": token, "url": url}})
}
