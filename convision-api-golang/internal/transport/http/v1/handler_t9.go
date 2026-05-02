package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	cashsvc "github.com/convision/api/internal/cash"
	payrollsvc "github.com/convision/api/internal/payroll"
	serviceordersvc "github.com/convision/api/internal/serviceorder"
)

// ---------- Payrolls ----------

func (h *Handler) GetPayrollStats(c *gin.Context) {
	db := tenantDBFromCtx(c)
	stats, err := h.payroll.GetStats(db)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) ListPayrolls(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	db := tenantDBFromCtx(c)
	out, err := h.payroll.List(db, filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetPayroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	db := tenantDBFromCtx(c)
	p, err := h.payroll.GetByID(db, uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) CreatePayroll(c *gin.Context) {
	var input payrollsvc.CreateInput
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
	db := tenantDBFromCtx(c)
	p, err := h.payroll.Create(db, input, userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": p})
}

func (h *Handler) UpdatePayroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input payrollsvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	db := tenantDBFromCtx(c)
	p, err := h.payroll.Update(db, uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) DeletePayroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	db := tenantDBFromCtx(c)
	if err := h.payroll.Delete(db, uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Service Orders ----------

func (h *Handler) GetServiceOrderStats(c *gin.Context) {
	db := tenantDBFromCtx(c)
	stats, err := h.serviceOrder.GetStats(db)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) ListServiceOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	db := tenantDBFromCtx(c)
	out, err := h.serviceOrder.List(db, filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetServiceOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	db := tenantDBFromCtx(c)
	o, err := h.serviceOrder.GetByID(db, uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

func (h *Handler) CreateServiceOrder(c *gin.Context) {
	var input serviceordersvc.CreateInput
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
	db := tenantDBFromCtx(c)
	o, err := h.serviceOrder.Create(db, input, userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": o})
}

func (h *Handler) UpdateServiceOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input serviceordersvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	db := tenantDBFromCtx(c)
	o, err := h.serviceOrder.Update(db, uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, o)
}

func (h *Handler) DeleteServiceOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	db := tenantDBFromCtx(c)
	if err := h.serviceOrder.Delete(db, uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Cash Transfers ----------

func (h *Handler) GetCashTransferStats(c *gin.Context) {
	db := tenantDBFromCtx(c)
	stats, err := h.cashTransfer.GetStats(db)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) ListCashTransfers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)
	db := tenantDBFromCtx(c)
	out, err := h.cashTransfer.List(db, filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetCashTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	db := tenantDBFromCtx(c)
	t, err := h.cashTransfer.GetByID(db, uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) CreateCashTransfer(c *gin.Context) {
	var input cashsvc.CreateInput
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
	db := tenantDBFromCtx(c)
	t, err := h.cashTransfer.Create(db, input, userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": t})
}

func (h *Handler) UpdateCashTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input cashsvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	db := tenantDBFromCtx(c)
	t, err := h.cashTransfer.Update(db, uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) DeleteCashTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	db := tenantDBFromCtx(c)
	if err := h.cashTransfer.Delete(db, uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ApproveCashTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input cashsvc.ApproveInput
	_ = c.ShouldBindJSON(&input)
	claims, _ := jwtauth.GetClaims(c)
	var userID *uint
	if claims != nil {
		uid := uint(claims.UserID)
		userID = &uid
	}
	db := tenantDBFromCtx(c)
	t, err := h.cashTransfer.Approve(db, uint(id), userID, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": t})
}

func (h *Handler) CancelCashTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input cashsvc.CancelInput
	_ = c.ShouldBindJSON(&input)
	db := tenantDBFromCtx(c)
	t, err := h.cashTransfer.Cancel(db, uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}
