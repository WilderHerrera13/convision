package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/product"
)

func productResponse(p *domain.Product) gin.H {
	if p == nil {
		return gin.H{}
	}
	return gin.H{
		"id":                      p.ID,
		"internal_code":           p.InternalCode,
		"identifier":              p.Identifier,
		"description":             p.Description,
		"name":                    p.Description,
		"cost":                    p.Cost,
		"price":                   p.Price,
		"sale_price":              p.Price,
		"product_category_id":     p.ProductCategoryID,
		"category_id":             p.ProductCategoryID,
		"brand_id":                p.BrandID,
		"supplier_id":             p.SupplierID,
		"status":                  p.Status,
		"created_at":              p.CreatedAt,
		"updated_at":              p.UpdatedAt,
		"deleted_at":              p.DeletedAt,
		"category":                p.Category,
		"brand":                   p.Brand,
		"lens_attributes":         p.LensAttributes,
		"frame_attributes":        p.FrameAttributes,
		"contact_lens_attributes": p.ContactLensAttributes,
	}
}

func productResponseSlice(data []*domain.Product) []gin.H {
	out := make([]gin.H, len(data))
	for i, p := range data {
		out[i] = productResponse(p)
	}
	return out
}

func (h *Handler) productResponsesWithDiscounts(c *gin.Context, data []*domain.Product) []gin.H {
	db := tenantDBFromCtx(c)
	out := make([]gin.H, len(data))
	for i, p := range data {
		resp := productResponse(p)
		resp["has_discounts"] = h.product.HasActiveDiscounts(db, p.ID)
		out[i] = resp
	}
	return out
}

// ======== Products ========

func (h *Handler) ListProducts(c *gin.Context) {
	db := tenantDBFromCtx(c)
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
	if v := c.Query("supplier_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["supplier_id"] = uint(id)
		}
	}

	// Inline search falls through to the Search endpoint logic when present.
	if q := c.Query("search"); q != "" {
		out, err := h.product.Search(db, q, "", page, perPage)
		if err != nil {
			respondError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"current_page": out.CurrentPage,
			"data":         h.productResponsesWithDiscounts(c, out.Data),
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
			"meta": gin.H{
				"current_page": out.CurrentPage,
				"last_page":    out.LastPage,
				"per_page":     out.PerPage,
				"total":        out.Total,
			},
		})
		return
	}

	out, err := h.product.List(db, filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         h.productResponsesWithDiscounts(c, out.Data),
		"last_page":    out.LastPage,
		"per_page":     out.PerPage,
		"total":        out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetProduct(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	p, err := h.product.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	resp := productResponse(p)
	resp["has_discounts"] = h.product.HasActiveDiscounts(db, id)
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) CreateProduct(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input product.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.product.Create(db, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, productResponse(p))
}

func (h *Handler) UpdateProduct(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input product.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.product.Update(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, productResponse(p))
}

func (h *Handler) DeleteProduct(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.product.Delete(db, id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) SearchProducts(c *gin.Context) {
	db := tenantDBFromCtx(c)
	page, perPage := parsePagination(c)
	query := c.Query("q")
	category := c.Query("category")
	out, err := h.product.Search(db, query, category, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) BulkProductStatus(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input product.BulkStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	affected, err := h.product.BulkUpdateStatus(db, input.IDs, input.Status)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"affected": affected})
}

func (h *Handler) GetProductStock(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	stock, err := h.product.GetProductStock(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"product_id": id, "data": stock})
}

func (h *Handler) ListProductsByCategory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	slug := c.Param("slug")
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	for _, key := range []string{
		"brand_id", "supplier_id", "status", "search",
		"lens_type_id", "material_id", "lens_class_id", "treatment_id", "photochromic_id",
		"frame_type", "gender", "color", "shape",
		"contact_type", "replacement_schedule",
	} {
		if v := c.Query(key); v != "" {
			filters[key] = v
		}
	}
	// Convert numeric ID filters from string to uint.
	for _, key := range []string{"brand_id", "supplier_id", "lens_type_id", "material_id", "lens_class_id", "treatment_id", "photochromic_id"} {
		if v, ok := filters[key]; ok {
			if id, err := strconv.ParseUint(v.(string), 10, 64); err == nil {
				filters[key] = uint(id)
			} else {
				delete(filters, key)
			}
		}
	}
	out, err := h.product.ListByCategory(db, slug, filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         h.productResponsesWithDiscounts(c, out.Data),
		"last_page":    out.LastPage,
		"per_page":     out.PerPage,
		"total":        out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) ListLensesByPrescription(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f struct {
		SphereOD   *float64 `json:"sphere_od"`
		CylinderOD *float64 `json:"cylinder_od"`
		AdditionOD *float64 `json:"addition_od"`
		SphereOS   *float64 `json:"sphere_os"`
		CylinderOS *float64 `json:"cylinder_os"`
		AdditionOS *float64 `json:"addition_os"`
	}
	if err := c.ShouldBindJSON(&f); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	lenses, err := h.product.ListByPrescription(db, domain.PrescriptionFilter{
		SphereOD:   f.SphereOD,
		CylinderOD: f.CylinderOD,
		AdditionOD: f.AdditionOD,
		SphereOS:   f.SphereOS,
		CylinderOS: f.CylinderOS,
		AdditionOS: f.AdditionOS,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": productResponseSlice(lenses)})
}

func (h *Handler) GetProductDiscounts(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	discounts, err := h.discount.ListAllActiveForProduct(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": discounts})
}

func (h *Handler) GetProductDiscountInfo(c *gin.Context) {
	db := tenantDBFromCtx(c)
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
	out, err := h.product.GetDiscountInfo(db, id, patientID)
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
	discounts, err := h.discount.ListAllActiveForProduct(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": discounts})
}

func (h *Handler) CalculateProductPrice(c *gin.Context) {
	db := tenantDBFromCtx(c)
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
	out, err := h.product.CalculatePrice(db, id, patientID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// ======== Product Categories ========

func (h *Handler) ListProductCategories(c *gin.Context) {
	db := tenantDBFromCtx(c)
	page, perPage := parsePagination(c)
	out, err := h.category.List(db, map[string]any{}, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         out.Data,
		"last_page":    out.LastPage,
		"per_page":     out.PerPage,
		"total":        out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetProductCategory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	cat, err := h.category.GetByID(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, cat)
}

func (h *Handler) CreateProductCategory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input product.CategoryCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	cat, err := h.category.Create(db, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, cat)
}

func (h *Handler) UpdateProductCategory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input product.CategoryUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	cat, err := h.category.Update(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, cat)
}

func (h *Handler) DeleteProductCategory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.category.Delete(db, id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ListAllProductCategories(c *gin.Context) {
	db := tenantDBFromCtx(c)
	cats, err := h.category.All(db)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cats})
}

func (h *Handler) ListProductCategoriesWithCount(c *gin.Context) {
	db := tenantDBFromCtx(c)
	cats, err := h.category.ListWithCount(db)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cats})
}
