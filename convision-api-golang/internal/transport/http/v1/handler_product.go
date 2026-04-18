package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/product"
)

// ======== Products ========

func (h *Handler) ListProducts(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	if v := c.Query("product_category_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["product_category_id"] = uint(id)
		}
	}
	if v := c.Query("brand_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["brand_id"] = uint(id)
		}
	}

	out, err := h.product.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetProduct(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	p, err := h.product.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) CreateProduct(c *gin.Context) {
	var input product.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.product.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) UpdateProduct(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input product.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.product.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) DeleteProduct(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.product.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) SearchProducts(c *gin.Context) {
	page, perPage := parsePagination(c)
	query := c.Query("q")
	category := c.Query("category")
	out, err := h.product.Search(query, category, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) BulkProductStatus(c *gin.Context) {
	var input product.BulkStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	affected, err := h.product.BulkUpdateStatus(input.IDs, input.Status)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"affected": affected})
}

func (h *Handler) GetProductStock(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	// Return stock from inventory total filtered to this product
	c.JSON(http.StatusOK, gin.H{"product_id": id, "message": "use /inventory-items?product_id=X for detailed stock"})
}

func (h *Handler) GetProductDiscounts(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	out, err := h.product.GetDiscountInfo(id, nil)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetProductDiscountInfo(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var patientID *uint
	if v := c.Query("patient_id"); v != "" {
		pid, err := strconv.ParseUint(v, 10, 64)
		if err == nil {
			uid := uint(pid)
			patientID = &uid
		}
	}
	out, err := h.product.GetDiscountInfo(id, patientID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetProductActiveDiscounts(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	discounts, err := h.discount.ListActive(&id, nil)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": discounts})
}

func (h *Handler) CalculateProductPrice(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var patientID *uint
	if v := c.Query("patient_id"); v != "" {
		pid, err := strconv.ParseUint(v, 10, 64)
		if err == nil {
			uid := uint(pid)
			patientID = &uid
		}
	}
	out, err := h.product.CalculatePrice(id, patientID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// ======== Product Categories ========

func (h *Handler) ListProductCategories(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.category.List(map[string]any{}, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetProductCategory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	cat, err := h.category.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, cat)
}

func (h *Handler) CreateProductCategory(c *gin.Context) {
	var input product.CategoryCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	cat, err := h.category.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, cat)
}

func (h *Handler) UpdateProductCategory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input product.CategoryUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	cat, err := h.category.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, cat)
}

func (h *Handler) DeleteProductCategory(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.category.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
