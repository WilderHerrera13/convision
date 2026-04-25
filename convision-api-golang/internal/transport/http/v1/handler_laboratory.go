package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	labsvc "github.com/convision/api/internal/laboratory"
)

// --- Laboratories ---

// ListLaboratories godoc
// GET /api/v1/laboratories
func (h *Handler) ListLaboratories(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}

	out, err := h.laboratory.ListLabs(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": out.Data,
		"meta": gin.H{
			"current_page": out.Page,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
		"current_page": out.Page,
		"last_page":    out.LastPage,
		"per_page":     out.PerPage,
		"total":        out.Total,
	})
}

// GetLaboratory godoc
// GET /api/v1/laboratories/:id
func (h *Handler) GetLaboratory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	l, err := h.laboratory.GetLab(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, l)
}

// CreateLaboratory godoc
// POST /api/v1/laboratories
func (h *Handler) CreateLaboratory(c *gin.Context) {
	var input labsvc.CreateLabInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	l, err := h.laboratory.CreateLab(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, l)
}

// UpdateLaboratory godoc
// PUT /api/v1/laboratories/:id
func (h *Handler) UpdateLaboratory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input labsvc.UpdateLabInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	l, err := h.laboratory.UpdateLab(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, l)
}

// DeleteLaboratory godoc
// DELETE /api/v1/laboratories/:id
func (h *Handler) DeleteLaboratory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.laboratory.DeleteLab(id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// --- Laboratory Orders ---

// GetLaboratoryOrderStats godoc
// GET /api/v1/laboratory-orders/stats
func (h *Handler) GetLaboratoryOrderStats(c *gin.Context) {
	stats, err := h.laboratory.Stats()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

// ListLaboratoryOrders godoc
// GET /api/v1/laboratory-orders
func (h *Handler) ListLaboratoryOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}
	if v := c.Query("patient_id"); v != "" {
		filters["patient_id"] = v
	}
	if v := c.Query("laboratory_id"); v != "" {
		filters["laboratory_id"] = v
	}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}
	if v := c.Query("priority"); v != "" {
		filters["priority"] = v
	}

	out, err := h.laboratory.ListOrders(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetLaboratoryOrder godoc
// GET /api/v1/laboratory-orders/:id
func (h *Handler) GetLaboratoryOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	o, err := h.laboratory.GetOrder(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

// CreateLaboratoryOrder godoc
// POST /api/v1/laboratory-orders
func (h *Handler) CreateLaboratoryOrder(c *gin.Context) {
	var input labsvc.CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	o, err := h.laboratory.CreateOrder(input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, o)
}

// UpdateLaboratoryOrder godoc
// PUT /api/v1/laboratory-orders/:id
func (h *Handler) UpdateLaboratoryOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input labsvc.UpdateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	o, err := h.laboratory.UpdateOrder(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

// DeleteLaboratoryOrder godoc
// DELETE /api/v1/laboratory-orders/:id
func (h *Handler) DeleteLaboratoryOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.laboratory.DeleteOrder(id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// UpdateLaboratoryOrderStatus godoc
// POST /api/v1/laboratory-orders/:id/status
func (h *Handler) UpdateLaboratoryOrderStatus(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input labsvc.UpdateOrderStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	o, err := h.laboratory.UpdateOrderStatus(id, input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}
