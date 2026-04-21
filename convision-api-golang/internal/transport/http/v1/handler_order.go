package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
	ordersvc "github.com/convision/api/internal/order"
)

type orderShowResponse struct {
	*domain.Order
	PDFURL        string `json:"pdf_url"`
	GuestPDFURL   string `json:"guest_pdf_url"`
	GuestLabPDFURL string `json:"guest_lab_pdf_url"`
}

func requestBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	if forwarded := c.GetHeader("X-Forwarded-Proto"); forwarded != "" {
		scheme = forwarded
	}
	return scheme + "://" + c.Request.Host
}

// ListOrders godoc
// GET /api/v1/orders
func (h *Handler) ListOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}
	if v := c.Query("patient_id"); v != "" {
		filters["patient_id"] = v
	}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}
	if v := c.Query("payment_status"); v != "" {
		filters["payment_status"] = v
	}
	if v := c.Query("laboratory_id"); v != "" {
		filters["laboratory_id"] = v
	}

	out, err := h.order.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetOrder godoc
// GET /api/v1/orders/:id
func (h *Handler) GetOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	o, err := h.order.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	baseURL := requestBaseURL(c)
	response := orderShowResponse{
		Order:          o,
		PDFURL:         baseURL + "/api/v1/orders/" + strconv.FormatUint(uint64(o.ID), 10) + "/pdf-download",
		GuestPDFURL:    baseURL + "/api/v1/guest/orders/" + strconv.FormatUint(uint64(o.ID), 10) + "/pdf?token=" + o.PdfToken,
		GuestLabPDFURL: baseURL + "/api/v1/guest/orders/" + strconv.FormatUint(uint64(o.ID), 10) + "/laboratory-pdf?token=" + o.LaboratoryPdfToken,
	}
	c.JSON(http.StatusOK, response)
}

// CreateOrder godoc
// POST /api/v1/orders
func (h *Handler) CreateOrder(c *gin.Context) {
	var input ordersvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	o, err := h.order.Create(input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, o)
}

// UpdateOrder godoc
// PUT /api/v1/orders/:id
func (h *Handler) UpdateOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input ordersvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	o, err := h.order.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

// DeleteOrder godoc
// DELETE /api/v1/orders/:id
func (h *Handler) DeleteOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.order.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// UpdateOrderStatus godoc
// POST /api/v1/orders/:id/status
func (h *Handler) UpdateOrderStatus(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input ordersvc.StatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	o, err := h.order.UpdateStatus(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

// UpdateOrderPaymentStatus godoc
// POST /api/v1/orders/:id/payment-status
func (h *Handler) UpdateOrderPaymentStatus(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input ordersvc.PaymentStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	o, err := h.order.UpdatePaymentStatus(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}
