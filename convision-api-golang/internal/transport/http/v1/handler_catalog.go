package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/catalog"
	"github.com/convision/api/internal/domain"
)

// ---------- Shared catalog resource shape ----------

type CatalogItemResource struct {
	ID          uint        `json:"id"`
	Name        string      `json:"name"`
	Description interface{} `json:"description"`
	CreatedAt   string      `json:"created_at"`
	UpdatedAt   string      `json:"updated_at"`
}

type PaymentMethodResource struct {
	ID                uint        `json:"id"`
	Name              string      `json:"name"`
	Code              string      `json:"code"`
	Description       interface{} `json:"description"`
	Icon              interface{} `json:"icon"`
	IsActive          bool        `json:"is_active"`
	RequiresReference bool        `json:"requires_reference"`
	CreatedAt         string      `json:"created_at"`
	UpdatedAt         string      `json:"updated_at"`
}

// ---------- Helpers ----------

func parsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	return page, perPage
}

func parseUintParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return 0, false
	}
	return uint(id), true
}

// ---------- Brands ----------

func (h *Handler) ListBrands(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.catalog.ListBrands(page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CatalogItemResource, len(out.Data))
	for i, v := range out.Data {
		items[i] = toCatalogItemFromBrand(v)
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         items,
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

func (h *Handler) GetBrand(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetBrand(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toCatalogItemFromBrand(e))
}

func (h *Handler) CreateBrand(c *gin.Context) {
	var input catalog.BrandInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreateBrand(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toCatalogItemFromBrand(e))
}

func (h *Handler) UpdateBrand(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.BrandInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdateBrand(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toCatalogItemFromBrand(e))
}

func (h *Handler) DeleteBrand(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeleteBrand(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func toCatalogItemFromBrand(e *domain.Brand) CatalogItemResource {
	return CatalogItemResource{
		ID:          e.ID,
		Name:        e.Name,
		Description: e.Description,
		CreatedAt:   e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:   e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}
}

// ---------- LensTypes ----------

func (h *Handler) ListLensTypes(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.catalog.ListLensTypes(page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CatalogItemResource, len(out.Data))
	for i, v := range out.Data {
		items[i] = CatalogItemResource{
			ID: v.ID, Name: v.Name, Description: v.Description,
			CreatedAt: v.CreatedAt.UTC().Format(timeFormat) + "Z",
			UpdatedAt: v.UpdatedAt.UTC().Format(timeFormat) + "Z",
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage, "data": items,
		"last_page": out.LastPage, "per_page": out.PerPage, "total": out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetLensType(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetLensType(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) CreateLensType(c *gin.Context) {
	var input catalog.LensTypeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreateLensType(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) UpdateLensType(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.LensTypeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdateLensType(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) DeleteLensType(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeleteLensType(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Materials ----------

func (h *Handler) ListMaterials(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.catalog.ListMaterials(page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CatalogItemResource, len(out.Data))
	for i, v := range out.Data {
		items[i] = CatalogItemResource{
			ID: v.ID, Name: v.Name, Description: v.Description,
			CreatedAt: v.CreatedAt.UTC().Format(timeFormat) + "Z",
			UpdatedAt: v.UpdatedAt.UTC().Format(timeFormat) + "Z",
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage, "data": items,
		"last_page": out.LastPage, "per_page": out.PerPage, "total": out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetMaterial(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetMaterial(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) CreateMaterial(c *gin.Context) {
	var input catalog.MaterialInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreateMaterial(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) UpdateMaterial(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.MaterialInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdateMaterial(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) DeleteMaterial(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeleteMaterial(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- LensClasses ----------

func (h *Handler) ListLensClasses(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.catalog.ListLensClasses(page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CatalogItemResource, len(out.Data))
	for i, v := range out.Data {
		items[i] = CatalogItemResource{
			ID: v.ID, Name: v.Name, Description: v.Description,
			CreatedAt: v.CreatedAt.UTC().Format(timeFormat) + "Z",
			UpdatedAt: v.UpdatedAt.UTC().Format(timeFormat) + "Z",
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage, "data": items,
		"last_page": out.LastPage, "per_page": out.PerPage, "total": out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetLensClass(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetLensClass(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) CreateLensClass(c *gin.Context) {
	var input catalog.LensClassInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreateLensClass(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) UpdateLensClass(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.LensClassInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdateLensClass(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) DeleteLensClass(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeleteLensClass(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Treatments ----------

func (h *Handler) ListTreatments(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.catalog.ListTreatments(page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CatalogItemResource, len(out.Data))
	for i, v := range out.Data {
		items[i] = CatalogItemResource{
			ID: v.ID, Name: v.Name, Description: v.Description,
			CreatedAt: v.CreatedAt.UTC().Format(timeFormat) + "Z",
			UpdatedAt: v.UpdatedAt.UTC().Format(timeFormat) + "Z",
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage, "data": items,
		"last_page": out.LastPage, "per_page": out.PerPage, "total": out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetTreatment(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetTreatment(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) CreateTreatment(c *gin.Context) {
	var input catalog.TreatmentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreateTreatment(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) UpdateTreatment(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.TreatmentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdateTreatment(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) DeleteTreatment(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeleteTreatment(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Photochromics ----------

func (h *Handler) ListPhotochromics(c *gin.Context) {
	page, perPage := parsePagination(c)
	out, err := h.catalog.ListPhotochromics(page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CatalogItemResource, len(out.Data))
	for i, v := range out.Data {
		items[i] = CatalogItemResource{
			ID: v.ID, Name: v.Name, Description: v.Description,
			CreatedAt: v.CreatedAt.UTC().Format(timeFormat) + "Z",
			UpdatedAt: v.UpdatedAt.UTC().Format(timeFormat) + "Z",
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage, "data": items,
		"last_page": out.LastPage, "per_page": out.PerPage, "total": out.Total,
		"meta": gin.H{
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
			"total":        out.Total,
		},
	})
}

func (h *Handler) GetPhotochromic(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetPhotochromic(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) CreatePhotochromic(c *gin.Context) {
	var input catalog.PhotochromicInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreatePhotochromic(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) UpdatePhotochromic(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.PhotochromicInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdatePhotochromic(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, CatalogItemResource{
		ID: e.ID, Name: e.Name, Description: e.Description,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	})
}

func (h *Handler) DeletePhotochromic(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeletePhotochromic(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- PaymentMethods ----------

func toPaymentMethodResource(e *domain.PaymentMethod) PaymentMethodResource {
	return PaymentMethodResource{
		ID: e.ID, Name: e.Name, Code: e.Code,
		Description: e.Description, Icon: e.Icon,
		IsActive: e.IsActive, RequiresReference: e.RequiresReference,
		CreatedAt: e.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt: e.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}
}

func (h *Handler) ListPaymentMethods(c *gin.Context) {
	// Per spec: returns ALL active payment methods (no pagination)
	data, err := h.catalog.ListActivePaymentMethods()
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]PaymentMethodResource, len(data))
	for i, v := range data {
		items[i] = toPaymentMethodResource(v)
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) GetPaymentMethod(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	e, err := h.catalog.GetPaymentMethod(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toPaymentMethodResource(e))
}

func (h *Handler) CreatePaymentMethod(c *gin.Context) {
	var input catalog.PaymentMethodInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.CreatePaymentMethod(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toPaymentMethodResource(e))
}

func (h *Handler) UpdatePaymentMethod(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	var input catalog.PaymentMethodInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.catalog.UpdatePaymentMethod(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toPaymentMethodResource(e))
}

func (h *Handler) DeletePaymentMethod(c *gin.Context) {
	id, ok := parseUintParam(c)
	if !ok {
		return
	}
	if err := h.catalog.DeletePaymentMethod(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
