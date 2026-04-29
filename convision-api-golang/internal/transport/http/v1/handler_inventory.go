package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/inventory"
	jwtauth "github.com/convision/api/internal/platform/auth"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

// ======== Warehouses ========

func (h *Handler) ListWarehouses(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}

	branchID := branchmw.BranchIDFromCtx(c)
	if override := resolveBranchOverride(c); override != nil {
		if *override == 0 {
			branchID = 0
		} else {
			branchID = *override
		}
	}
	if branchID > 0 {
		filters["branch_id"] = branchID
	}

	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	out, err := h.inventory.ListWarehouses(filters, page, perPage)
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
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	if v := c.Query("warehouse_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["warehouse_id"] = uint(id)
		}
	}
	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	out, err := h.inventory.ListLocations(filters, page, perPage)
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
	page, perPage := parsePagination(c)
	filters := map[string]any{}

	branchID := branchmw.BranchIDFromCtx(c)
	if override := resolveBranchOverride(c); override != nil {
		if *override == 0 {
			branchID = 0
		} else {
			branchID = *override
		}
	}
	if branchID > 0 {
		filters["branch_id"] = branchID
	}

	if v := c.Query("product_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["product_id"] = uint(id)
		}
	}
	if v := c.Query("warehouse_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["warehouse_id"] = uint(id)
		}
	}
	if v := c.Query("warehouse_location_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["warehouse_location_id"] = uint(id)
		}
	}
	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	out, err := h.inventory.ListItems(filters, page, perPage)
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
	item, err := h.inventory.GetItem(id)
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
	item, err := h.inventory.CreateItem(input)
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
	item, err := h.inventory.UpdateItem(id, input)
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
	if err := h.inventory.DeleteItem(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) GetTotalStock(c *gin.Context) {
	filters := map[string]any{}

	branchID := branchmw.BranchIDFromCtx(c)
	if override := resolveBranchOverride(c); override != nil {
		if *override == 0 {
			branchID = 0
		} else {
			branchID = *override
		}
	}
	if branchID > 0 {
		filters["branch_id"] = branchID
	}

	for _, key := range []string{"warehouse_id", "warehouse_location_id", "brand_id", "supplier_id", "category_id"} {
		if v := c.Query(key); v != "" {
			if id, err := strconv.ParseUint(v, 10, 64); err == nil {
				filters[key] = uint(id)
			}
		}
	}
	out, err := h.inventory.TotalStockPerProduct(filters)
	if err != nil {
		respondError(c, err)
		return
	}
	var totalUnits int64
	for _, e := range out {
		totalUnits += e.TotalQuantity
	}
	c.JSON(http.StatusOK, gin.H{
		"data":        out,
		"total_units": totalUnits,
	})
}

func (h *Handler) ListLocationInventoryItems(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	page, perPage := parsePagination(c)
	out, err := h.inventory.ListItemsByLocation(id, page, perPage)
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
	out, err := h.inventory.GetProductInventorySummary(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// ======== Inventory Transfers ========

func (h *Handler) ListInventoryTransfers(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	if s := c.Query("status"); s != "" {
		filters["status"] = s
	}
	out, err := h.inventory.ListTransfers(filters, page, perPage)
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
	t, err := h.inventory.GetTransfer(id)
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
	t, err := h.inventory.CreateTransfer(input)
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
	t, err := h.inventory.UpdateTransfer(id, input)
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
	if err := h.inventory.DeleteTransfer(id); err != nil {
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
	t, err := h.inventory.CompleteTransfer(id)
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
	t, err := h.inventory.CancelTransfer(id)
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
	page, perPage := parsePagination(c)
	filters := map[string]any{}
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
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}
	if v := c.Query("search"); v != "" {
		filters["search"] = v
	}
	for _, key := range []string{"sphere_od", "cylinder_od", "addition_od", "sphere_os", "cylinder_os", "addition_os"} {
		if v := c.Query(key); v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				filters[key] = f
			}
		}
	}
	out, err := h.product.ListLensCatalog(filters, page, perPage)
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
	item, err := h.inventory.AdjustStockByItemID(input.InventoryItemID, input.Delta, input.Reason)
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
	adj, err := h.inventory.CreateAdjustment(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, adj)
}

func (h *Handler) ListInventoryAdjustments(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}
	out, err := h.inventory.ListAdjustments(filters, page, perPage)
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
	adj, err := h.inventory.ApproveAdjustment(id, claims.UserID)
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
	adj, err := h.inventory.RejectAdjustment(id, claims.UserID, body.Notes)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, adj)
}

// ======== Stock Movements (Kardex) ========

func (h *Handler) ListStockMovements(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}
	if v := c.Query("product_id"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			filters["product_id"] = id
		}
	}
	if v := c.Query("warehouse_id"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			filters["warehouse_id"] = id
		}
	}
	if v := c.Query("movement_type"); v != "" {
		filters["movement_type"] = v
	}
	out, err := h.inventory.ListMovements(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}
