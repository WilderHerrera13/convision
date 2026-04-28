package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	salesvc "github.com/convision/api/internal/sale"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

// ListSales godoc
// GET /api/v1/sales
func (h *Handler) ListSales(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}

	branchID := branchmw.BranchIDFromCtx(c)
	filters["branch_id"] = branchID

	if v := c.Query("patient_id"); v != "" {
		filters["patient_id"] = v
	}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}
	if v := c.Query("payment_status"); v != "" {
		filters["payment_status"] = v
	}

	out, err := h.sale.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetSale godoc
// GET /api/v1/sales/:id
func (h *Handler) GetSale(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	s, err := h.sale.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": s})
}

// CreateSale godoc
// POST /api/v1/sales
func (h *Handler) CreateSale(c *gin.Context) {
	var input salesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	input.BranchID = branchmw.BranchIDFromCtx(c)

	s, err := h.sale.Create(input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	pdfData, _ := h.sale.GeneratePdfToken(s.ID)
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
		"message":   "Venta creada exitosamente",
		"sale":      s,
		"pdf_url":   pdfURL,
		"pdf_token": pdfToken,
	})
}

// UpdateSale godoc
// PUT /api/v1/sales/:id
func (h *Handler) UpdateSale(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input salesvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	s, err := h.sale.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

// DeleteSale godoc
// DELETE /api/v1/sales/:id
func (h *Handler) DeleteSale(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.sale.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// GetSaleStats godoc
// GET /api/v1/sales/stats
func (h *Handler) GetSaleStats(c *gin.Context) {
	stats, err := h.sale.GetStats()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GetSaleTodayStats godoc
// GET /api/v1/sales/stats/today
func (h *Handler) GetSaleTodayStats(c *gin.Context) {
	stats, err := h.sale.GetTodayStats()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

// AddSalePayment godoc
// POST /api/v1/sales/:id/payments
func (h *Handler) AddSalePayment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input salesvc.AddPaymentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	s, err := h.sale.AddPayment(id, input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

// RemoveSalePayment godoc
// DELETE /api/v1/sales/:id/payments/:paymentId
func (h *Handler) RemoveSalePayment(c *gin.Context) {
	saleID, err := parseID(c, "id")
	if err != nil {
		return
	}

	paymentIDRaw := c.Param("paymentId")
	paymentIDParsed, parseErr := strconv.ParseUint(paymentIDRaw, 10, 64)
	if parseErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payment id"})
		return
	}
	paymentID := uint(paymentIDParsed)

	s, err := h.sale.RemovePayment(saleID, paymentID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

// CancelSale godoc
// POST /api/v1/sales/:id/cancel
func (h *Handler) CancelSale(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	s, err := h.sale.Cancel(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

// GetSalePdfToken godoc
// GET /api/v1/sales/:id/pdf-token
func (h *Handler) GetSalePdfToken(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	result, err := h.sale.GeneratePdfToken(id)
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

// ListLensPriceAdjustments godoc
// GET /api/v1/sales/:id/lens-price-adjustments
func (h *Handler) ListLensPriceAdjustments(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	adjs, err := h.sale.GetLensPriceAdjustments(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, adjs)
}

// CreateLensPriceAdjustment godoc
// POST /api/v1/sales/:id/lens-price-adjustments
func (h *Handler) CreateLensPriceAdjustment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input salesvc.LensPriceAdjInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	adj, err := h.sale.CreateLensPriceAdjustment(id, input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, adj)
}

// DeleteLensPriceAdjustment godoc
// DELETE /api/v1/sales/:id/lens-price-adjustments/:adjId
func (h *Handler) DeleteLensPriceAdjustment(c *gin.Context) {
	saleID, err := parseID(c, "id")
	if err != nil {
		return
	}

	adjIDRaw := c.Param("adjId")
	adjIDParsed, parseErr := strconv.ParseUint(adjIDRaw, 10, 64)
	if parseErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid adjustment id"})
		return
	}
	adjID := uint(adjIDParsed)

	if err := h.sale.DeleteLensPriceAdjustment(saleID, adjID); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// GetAdjustedLensPrice godoc
// GET /api/v1/sales/:id/lenses/:lensId/adjusted-price
func (h *Handler) GetAdjustedLensPrice(c *gin.Context) {
	saleID, err := parseID(c, "id")
	if err != nil {
		return
	}

	lensIDRaw := c.Param("lensId")
	lensIDParsed, parseErr := strconv.ParseUint(lensIDRaw, 10, 64)
	if parseErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid lens id"})
		return
	}
	lensID := uint(lensIDParsed)

	result, err := h.sale.GetAdjustedPrice(saleID, lensID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
