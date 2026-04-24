package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/inventory"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// ======== Warehouses ========

func (h *Handler) ListWarehouses(c *gin.Context) {
	page, perPage := parsePagination(c)
	filters := map[string]any{}
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
	if len(filters) == 0 {
		out, err := h.inventory.TotalStock()
		if err != nil {
			respondError(c, err)
			return
		}
		c.JSON(http.StatusOK, out)
		return
	}
	out, err := h.inventory.TotalStockPerProduct(filters)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": out})
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
