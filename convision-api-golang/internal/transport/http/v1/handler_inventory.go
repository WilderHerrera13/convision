package v1

import (
	"math"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/inventory"
	jwtauth "github.com/convision/api/internal/platform/auth"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

// ======== Warehouses ========

func (h *Handler) ListWarehouses(c *gin.Context) {
	var f domain.WarehouseFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	branchID := branchmw.BranchIDFromCtx(c)
	if override := resolveBranchOverride(c); override != nil {
		if *override == 0 {
			branchID = 0
		} else {
			branchID = *override
		}
	}
	if branchID > 0 {
		f.BranchID = &branchID
	}
	out, err := h.inventory.ListWarehouses(f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetWarehouse(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	w, err := h.inventory.GetWarehouse(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, w)
}

func (h *Handler) CreateWarehouse(c *gin.Context) {
	var input inventory.WarehouseCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	input.BranchID = branchmw.BranchIDFromCtx(c)
	w, err := h.inventory.CreateWarehouse(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, w)
}

func (h *Handler) UpdateWarehouse(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input inventory.WarehouseUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	w, err := h.inventory.UpdateWarehouse(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, w)
}

func (h *Handler) DeleteWarehouse(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.inventory.DeleteWarehouse(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) GetWarehouseLocations(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	locations, err := h.inventory.ListWarehouseLocations(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": locations})
}

// ======== Warehouse Locations ========

func (h *Handler) ListWarehouseLocations(c *gin.Context) {
	var f domain.WarehouseLocationFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	branchID := branchmw.BranchIDFromCtx(c)
	if branchID > 0 {
		f.BranchID = &branchID
	}
	out, err := h.inventory.ListLocations(f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetWarehouseLocation(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	loc, err := h.inventory.GetLocation(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, loc)
}

func (h *Handler) CreateWarehouseLocation(c *gin.Context) {
	var input inventory.LocationCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	input.BranchID = branchmw.BranchIDFromCtx(c)
	loc, err := h.inventory.CreateLocation(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, loc)
}

func (h *Handler) UpdateWarehouseLocation(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input inventory.LocationUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	loc, err := h.inventory.UpdateLocation(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, loc)
}

func (h *Handler) DeleteWarehouseLocation(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.inventory.DeleteLocation(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ======== Inventory Items ========

func (h *Handler) ListInventoryItems(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f domain.InventoryItemFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	branchID := branchmw.BranchIDFromCtx(c)
	if override := resolveBranchOverride(c); override != nil {
		if *override == 0 {
			branchID = 0
		} else {
			branchID = *override
		}
	}
	if branchID > 0 {
		f.BranchID = &branchID
	}
	out, err := h.inventory.ListItems(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetInventoryItem(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	item, err := h.inventory.GetItem(tenantDBFromCtx(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) CreateInventoryItem(c *gin.Context) {
	var input inventory.ItemCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	input.BranchID = branchmw.BranchIDFromCtx(c)
	item, err := h.inventory.CreateItem(tenantDBFromCtx(c), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) UpdateInventoryItem(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input inventory.ItemUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	item, err := h.inventory.UpdateItem(tenantDBFromCtx(c), id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) DeleteInventoryItem(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.inventory.DeleteItem(tenantDBFromCtx(c), id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) GetTotalStock(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f domain.TotalStockFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	branchID := branchmw.BranchIDFromCtx(c)
	if branchID > 0 {
		f.BranchID = &branchID
	}
	out, total, err := h.inventory.TotalStockPerProduct(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	lastPage := int(math.Ceil(float64(total) / float64(f.PerPage)))
	if lastPage < 1 {
		lastPage = 1
	}
	c.JSON(http.StatusOK, gin.H{
		"data":         out,
		"total":        total,
		"current_page": f.Page,
		"last_page":    lastPage,
		"per_page":     f.PerPage,
	})
}

func (h *Handler) ListLocationInventoryItems(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	page, perPage := parsePagination(c)
	out, err := h.inventory.ListItemsByLocation(tenantDBFromCtx(c), id, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetProductInventorySummary(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	out, err := h.inventory.GetProductInventorySummary(tenantDBFromCtx(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// ======== Inventory Transfers ========

func (h *Handler) ListInventoryTransfers(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f domain.InventoryTransferFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	branchID := branchmw.BranchIDFromCtx(c)
	if branchID > 0 {
		f.BranchID = &branchID
	}
	out, err := h.inventory.ListTransfers(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetInventoryTransfer(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	t, err := h.inventory.GetTransfer(tenantDBFromCtx(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) CreateInventoryTransfer(c *gin.Context) {
	var input inventory.TransferCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	// Set TransferredBy from JWT
	if claims, ok := jwtauth.GetClaims(c); ok {
		uid := claims.UserID
		input.TransferredBy = &uid
	}
	t, err := h.inventory.CreateTransfer(tenantDBFromCtx(c), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) UpdateInventoryTransfer(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input inventory.TransferUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	t, err := h.inventory.UpdateTransfer(tenantDBFromCtx(c), id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) DeleteInventoryTransfer(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	if err := h.inventory.DeleteTransfer(tenantDBFromCtx(c), id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) CompleteInventoryTransfer(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	t, err := h.inventory.CompleteTransfer(tenantDBFromCtx(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) CancelInventoryTransfer(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	t, err := h.inventory.CancelTransfer(tenantDBFromCtx(c), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

// ======== Inventory Adjustments ========

// ListLensCatalog returns the paginated lens product catalog (product_type = 'lens').
// GET /api/v1/inventory/lens-catalog
func (h *Handler) ListLensCatalog(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f domain.LensCatalogFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	out, err := h.product.ListLensCatalog(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) AdjustInventory(c *gin.Context) {
	var input struct {
		InventoryItemID uint   `json:"inventory_item_id" binding:"required"`
		Delta           int    `json:"delta"             binding:"required"`
		Reason          string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	item, err := h.inventory.AdjustStockByItemID(tenantDBFromCtx(c), input.InventoryItemID, input.Delta, input.Reason)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

// ======== Inventory Adjustment Approval Flow ========

func (h *Handler) CreateInventoryAdjustment(c *gin.Context) {
	var input inventory.AdjustmentCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	input.RequestedBy = claims.UserID
	adj, err := h.inventory.CreateAdjustment(tenantDBFromCtx(c), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, adj)
}

func (h *Handler) ListInventoryAdjustments(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f domain.InventoryAdjustmentFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	out, err := h.inventory.ListAdjustments(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) ApproveInventoryAdjustment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	adj, err := h.inventory.ApproveAdjustment(tenantDBFromCtx(c), id, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, adj)
}

func (h *Handler) RejectInventoryAdjustment(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
		return
	}
	var body struct {
		Notes string `json:"notes"`
	}
	_ = c.ShouldBindJSON(&body)
	adj, err := h.inventory.RejectAdjustment(tenantDBFromCtx(c), id, claims.UserID, body.Notes)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, adj)
}

// ======== Stock Movements (Kardex) ========

func (h *Handler) ListStockMovements(c *gin.Context) {
	db := tenantDBFromCtx(c)
	var f domain.StockMovementFilter
	if err := c.ShouldBindQuery(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	out, err := h.inventory.ListMovements(db, f)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}
