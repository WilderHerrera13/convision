package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	labsvc "github.com/convision/api/internal/laboratory"
)

// GetPortfolioStats godoc
// GET /api/v1/portfolio/stats
func (h *Handler) GetPortfolioStats(c *gin.Context) {
	stats, err := h.laboratory.PortfolioStats()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// ListPortfolioOrders godoc
// GET /api/v1/portfolio/orders
func (h *Handler) ListPortfolioOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	search := c.Query("search")

	out, err := h.laboratory.ListPortfolioOrders(page, perPage, search)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// RegisterPortfolioCall godoc
// POST /api/v1/portfolio/orders/:id/calls
func (h *Handler) RegisterPortfolioCall(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input labsvc.RegisterCallInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	call, err := h.laboratory.RegisterPortfolioCall(id, input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, call)
}

// GetPortfolioOrderCalls godoc
// GET /api/v1/portfolio/orders/:id/calls
func (h *Handler) GetPortfolioOrderCalls(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	calls, err := h.laboratory.GetPortfolioOrderCalls(id)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": calls})
}

// GetPortfolioOrder godoc
// GET /api/v1/portfolio/orders/:id
func (h *Handler) GetPortfolioOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	item, err := h.laboratory.GetPortfolioOrder(id)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, item)
}

// ClosePortfolioOrder godoc
// POST /api/v1/portfolio/orders/:id/close
func (h *Handler) ClosePortfolioOrder(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}

	if err := h.laboratory.ClosePortfolioOrder(id, claims.UserID); err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cartera cerrada exitosamente"})
}
