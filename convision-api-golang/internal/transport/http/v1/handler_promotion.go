package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/promotion"
)

func (h *Handler) ListPromotions(c *gin.Context) {
	var f domain.PromotionFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	out, err := h.promotion.List(f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetPromotion(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	p, err := h.promotion.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) CreatePromotion(c *gin.Context) {
	var input promotion.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.promotion.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) UpdatePromotion(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input promotion.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.promotion.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) DeletePromotion(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.promotion.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// EvaluatePromotions computes the best applicable promotion for a cart (checkout preview).
// Each line's category/brand/type is resolved from the catalog so the preview matches the
// server-authoritative evaluation performed at sale creation.
func (h *Handler) EvaluatePromotions(c *gin.Context) {
	var input promotion.EvaluateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	db := tenantDBFromCtx(c)
	for i := range input.Items {
		it := &input.Items[i]
		if it.ProductCategoryID != nil && it.BrandID != nil && it.ProductType != "" {
			continue
		}
		pid := it.ProductID
		if pid == nil {
			pid = it.LensID
		}
		if pid == nil {
			continue
		}
		// Fill only the metadata the client did not provide, so a partially
		// specified item never loses the rest of its catalog attributes.
		if prod, err := h.product.GetByID(db, *pid); err == nil && prod != nil {
			if it.ProductCategoryID == nil {
				it.ProductCategoryID = prod.ProductCategoryID
			}
			if it.BrandID == nil {
				it.BrandID = prod.BrandID
			}
			if it.ProductType == "" {
				it.ProductType = string(prod.ProductType)
			}
		}
	}

	out, err := h.promotion.Evaluate(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}
