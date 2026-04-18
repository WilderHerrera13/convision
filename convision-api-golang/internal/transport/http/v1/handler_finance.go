package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	expensesvc "github.com/convision/api/internal/expense"
	jwtauth "github.com/convision/api/internal/platform/auth"
	purchasesvc "github.com/convision/api/internal/purchase"
	suppliersvc "github.com/convision/api/internal/supplier"
)

// ---------- Suppliers ----------

func (h *Handler) ListSuppliers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	out, err := h.supplier.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetSupplier(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	s, err := h.supplier.GetByID(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *Handler) CreateSupplier(c *gin.Context) {
	var input suppliersvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	s, err := h.supplier.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *Handler) UpdateSupplier(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input suppliersvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	s, err := h.supplier.Update(uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *Handler) DeleteSupplier(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	if err := h.supplier.Delete(uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Purchases ----------

func (h *Handler) ListPurchases(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	out, err := h.purchase.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetPurchase(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	p, err := h.purchase.GetByID(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) CreatePurchase(c *gin.Context) {
	var input purchasesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	claims, _ := jwtauth.GetClaims(c)
	var userID *uint
	if claims != nil {
		uid := uint(claims.UserID)
		userID = &uid
	}
	p, err := h.purchase.Create(input, userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) UpdatePurchase(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input purchasesvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	p, err := h.purchase.Update(uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) DeletePurchase(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	if err := h.purchase.Delete(uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Expenses ----------

func (h *Handler) GetExpenseStats(c *gin.Context) {
	stats, err := h.expense.GetStats()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) ListExpenses(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	out, err := h.expense.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetExpense(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	e, err := h.expense.GetByID(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, e)
}

func (h *Handler) CreateExpense(c *gin.Context) {
	var input expensesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	claims, _ := jwtauth.GetClaims(c)
	var userID *uint
	if claims != nil {
		uid := uint(claims.UserID)
		userID = &uid
	}
	e, err := h.expense.Create(input, userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, e)
}

func (h *Handler) UpdateExpense(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input expensesvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	e, err := h.expense.Update(uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, e)
}

func (h *Handler) DeleteExpense(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	if err := h.expense.Delete(uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
