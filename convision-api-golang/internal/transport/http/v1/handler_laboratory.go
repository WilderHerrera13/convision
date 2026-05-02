package v1

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	labsvc "github.com/convision/api/internal/laboratory"
	salesvc "github.com/convision/api/internal/sale"
)

// --- Laboratories ---

// ListLaboratories godoc
// GET /api/v1/laboratories
func (h *Handler) ListLaboratories(c *gin.Context) {
	db := tenantDBFromCtx(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}

	out, err := h.laboratory.ListLabs(db, filters, page, perPage)
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
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	l, err := h.laboratory.GetLab(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, l)
}

// CreateLaboratory godoc
// POST /api/v1/laboratories
func (h *Handler) CreateLaboratory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var input labsvc.CreateLabInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	l, err := h.laboratory.CreateLab(db, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, l)
}

// UpdateLaboratory godoc
// PUT /api/v1/laboratories/:id
func (h *Handler) UpdateLaboratory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input labsvc.UpdateLabInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	l, err := h.laboratory.UpdateLab(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, l)
}

// DeleteLaboratory godoc
// DELETE /api/v1/laboratories/:id
func (h *Handler) DeleteLaboratory(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.laboratory.DeleteLab(db, id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// --- Laboratory Orders ---

// GetLaboratoryOrderStats godoc
// GET /api/v1/laboratory-orders/stats
func (h *Handler) GetLaboratoryOrderStats(c *gin.Context) {
	db := tenantDBFromCtx(c)
	stats, err := h.laboratory.Stats(db)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

// ListLaboratoryOrders godoc
// GET /api/v1/laboratory-orders
func (h *Handler) ListLaboratoryOrders(c *gin.Context) {
	db := tenantDBFromCtx(c)
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
	if v := c.Query("assigned_uid"); v != "" {
		filters["_assigned_uid"] = v
	}
	if v := c.Query("branch_id"); v != "" && v != "0" && v != "all" {
		branchID, err := strconv.ParseUint(v, 10, 64)
		if err == nil {
			branch, berr := h.branchRepo.GetByID(db, uint(branchID))
			if berr == nil && branch != nil {
				filters["branch"] = branch.Name
			}
		}
	}

	out, err := h.laboratory.ListOrders(db, filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetLaboratoryOrder godoc
// GET /api/v1/laboratory-orders/:id
func (h *Handler) GetLaboratoryOrder(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	o, err := h.laboratory.GetOrder(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

// CreateLaboratoryOrder godoc
// POST /api/v1/laboratory-orders
func (h *Handler) CreateLaboratoryOrder(c *gin.Context) {
	db := tenantDBFromCtx(c)
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

	o, err := h.laboratory.CreateOrder(db, input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, o)
}

// UpdateLaboratoryOrder godoc
// PUT /api/v1/laboratory-orders/:id
func (h *Handler) UpdateLaboratoryOrder(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input labsvc.UpdateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	o, err := h.laboratory.UpdateOrder(db, id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

// DeleteLaboratoryOrder godoc
// DELETE /api/v1/laboratory-orders/:id
func (h *Handler) DeleteLaboratoryOrder(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.laboratory.DeleteOrder(db, id); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// GetLaboratoryOrderEvidence godoc
// GET /api/v1/laboratory-orders/:id/evidence
func (h *Handler) GetLaboratoryOrderEvidence(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	transitionType := c.Query("transition_type")
	items, err := h.laboratory.GetOrderEvidence(db, id, transitionType)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

// UploadLaboratoryOrderEvidence godoc
// POST /api/v1/laboratory-orders/:id/evidence
func (h *Handler) UploadLaboratoryOrderEvidence(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	_, err = h.laboratory.GetOrder(db, id)
	if err != nil {
		respondError(c, err)
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "file is required"})
		return
	}
	defer file.Close()

	transitionType := c.PostForm("transition_type")
	if transitionType == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "transition_type is required"})
		return
	}

	uploadDir := os.Getenv("UPLOAD_PATH")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	evidenceDir := filepath.Join(uploadDir, "evidence")
	if mkErr := os.MkdirAll(evidenceDir, 0755); mkErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "could not create upload directory"})
		return
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("lab_%d_%s_%d%s", id, transitionType, time.Now().UnixNano(), ext)
	dst := filepath.Join(evidenceDir, filename)

	if saveErr := c.SaveUploadedFile(header, dst); saveErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "could not save file"})
		return
	}

	imageURL := fmt.Sprintf("/uploads/evidence/%s", filename)

	claims, ok := jwtauth.GetClaims(c)
	var userID uint
	if ok {
		userID = claims.UserID
	}

	ev, err := h.laboratory.AddOrderEvidence(db, id, transitionType, imageURL, userID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": ev})
}

// GetLaboratoryOrderPdfToken godoc
// GET /api/v1/laboratory-orders/:id/pdf-token
func (h *Handler) GetLaboratoryOrderPdfToken(c *gin.Context) {
	db := tenantDBFromCtx(c)
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	result, err := h.laboratory.GetOrderPdfToken(db, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UpdateLaboratoryOrderStatus godoc
// POST /api/v1/laboratory-orders/:id/status
func (h *Handler) UpdateLaboratoryOrderStatus(c *gin.Context) {
	db := tenantDBFromCtx(c)
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

	o, err := h.laboratory.UpdateOrderStatus(db, id, input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	if input.Status == "delivered" && o.SaleID != nil {
		saleID := *o.SaleID
		sale, saleErr := h.sale.GetByID(saleID)
		if saleErr == nil && sale.Balance <= 0 {
			_, _ = h.sale.Update(saleID, salesvc.UpdateInput{Status: "completed"})
		}
	}

	c.JSON(http.StatusOK, o)
}
