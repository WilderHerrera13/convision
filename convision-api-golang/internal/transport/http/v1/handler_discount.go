package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/discount"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

func (h *Handler) ListDiscountRequests(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	if v := c.Query("product_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["product_id"] = uint(id)
		}
	}
	out, err := h.discount.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetDiscountRequest(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	d, err := h.discount.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, d)
}

func (h *Handler) CreateDiscountRequest(c *gin.Context) {
	var input discount.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	// Set UserID from JWT if not provided
	if input.UserID == 0 {
		if claims, ok := jwtauth.GetClaims(c); ok {
			input.UserID = claims.UserID
		}
	}
	d, err := h.discount.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, d)
}

func (h *Handler) UpdateDiscountRequest(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input discount.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	d, err := h.discount.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, d)
}

func (h *Handler) DeleteDiscountRequest(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.discount.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ApproveDiscountRequest(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input discount.ApproveInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}
	d, err := h.discount.Approve(id, claims.UserID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, d)
}

func (h *Handler) RejectDiscountRequest(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input discount.RejectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	d, err := h.discount.Reject(id, input.RejectionReason)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, d)
}

func (h *Handler) ListActiveDiscounts(c *gin.Context) {
	var productID *uint
	if v := c.Query("product_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			uid := uint(id)
			productID = &uid
		}
	}
	discounts, err := h.discount.ListActive(productID, nil)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": discounts})
}

// GetBestDiscount returns the best (highest) applicable discount for a lens/product (GOQA-011)
func (h *Handler) GetBestDiscount(c *gin.Context) {
	var lensID *uint
	var patientID *uint

	if v := c.Query("lens_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			uid := uint(id)
			lensID = &uid
		}
	}

	if v := c.Query("patient_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			uid := uint(id)
			patientID = &uid
		}
	}

	// Get the best discount (highest percentage)
	bestDiscount, err := h.discount.GetBestDiscount(lensID, patientID)
	if err != nil {
		respondError(c, err)
		return
	}

	if bestDiscount == nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"discount_percentage": bestDiscount.DiscountPercentage,
	})
}
