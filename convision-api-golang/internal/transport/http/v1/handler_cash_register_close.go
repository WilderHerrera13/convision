package v1

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	cashclosesvc "github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

type cashClosePaymentResource struct {
	Name          string  `json:"name"`
	CountedAmount float64 `json:"counted_amount"`
}

type cashCloseDenominationResource struct {
	Denomination int     `json:"denomination"`
	Quantity     int     `json:"quantity"`
	Subtotal     float64 `json:"subtotal"`
}

type cashCloseUserResource struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	LastName string `json:"last_name,omitempty"`
}

type cashCloseResource struct {
	ID                     uint                            `json:"id"`
	CloseDate              string                          `json:"close_date"`
	Status                 domain.CashRegisterCloseStatus  `json:"status"`
	User                   *cashCloseUserResource          `json:"user,omitempty"`
	PaymentMethods         []cashClosePaymentResource      `json:"payment_methods"`
	Denominations          []cashCloseDenominationResource `json:"denominations,omitempty"`
	TotalCounted           float64                         `json:"total_counted"`
	AdminNotes             string                          `json:"admin_notes,omitempty"`
	AdvisorNotes           string                          `json:"advisor_notes,omitempty"`
	TotalActualAmount      float64                         `json:"total_actual_amount,omitempty"`
	AdminActualsRecordedAt *string                         `json:"admin_actuals_recorded_at,omitempty"`
	ApprovedAt             *string                         `json:"approved_at,omitempty"`
	CreatedAt              string                          `json:"created_at"`
	UpdatedAt              string                          `json:"updated_at"`
}

func toOptionalTimeString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format(timeFormat) + "Z"
	return &s
}

func toCashCloseResource(item *domain.CashRegisterClose) cashCloseResource {
	closeDate := ""
	if item.CloseDate != nil {
		closeDate = item.CloseDate.UTC().Format("2006-01-02")
	}

	payments := make([]cashClosePaymentResource, 0, len(item.Payments))
	for _, p := range item.Payments {
		payments = append(payments, cashClosePaymentResource{
			Name:          p.PaymentMethodName,
			CountedAmount: p.CountedAmount,
		})
	}

	denoms := make([]cashCloseDenominationResource, 0, len(item.Denominations))
	for _, d := range item.Denominations {
		denoms = append(denoms, cashCloseDenominationResource{
			Denomination: d.Denomination,
			Quantity:     d.Quantity,
			Subtotal:     d.Subtotal,
		})
	}

	var user *cashCloseUserResource
	if item.User != nil {
		user = &cashCloseUserResource{ID: item.User.ID, Name: item.User.Name, LastName: item.User.LastName}
	}

	return cashCloseResource{
		ID:                     item.ID,
		CloseDate:              closeDate,
		Status:                 item.Status,
		User:                   user,
		PaymentMethods:         payments,
		Denominations:          denoms,
		TotalCounted:           item.TotalCounted,
		AdminNotes:             item.AdminNotes,
		AdvisorNotes:           item.AdvisorNotes,
		TotalActualAmount:      item.TotalActualAmount,
		AdminActualsRecordedAt: toOptionalTimeString(item.AdminActualsRecordedAt),
		ApprovedAt:             toOptionalTimeString(item.ApprovedAt),
		CreatedAt:              item.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:              item.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}
}

// ListCashRegisterCloses godoc
// GET /api/v1/cash-register-closes
func (h *Handler) ListCashRegisterCloses(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	filters := map[string]any{}
	if v := c.Query("status"); v != "" {
		filters["status"] = v
	}
	if v := c.Query("user_id"); v != "" {
		if n, err := strconv.ParseUint(v, 10, 64); err == nil {
			filters["user_id"] = uint(n)
		}
	}
	if v := c.Query("close_date"); v != "" {
		filters["close_date"] = v
	}
	if v := c.Query("date_from"); v != "" {
		filters["date_from"] = v
	}
	if v := c.Query("date_to"); v != "" {
		filters["date_to"] = v
	}

	out, err := h.cashClose.List(filters, page, perPage, claims.Role, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	data := make([]cashCloseResource, len(out.Data))
	for i, item := range out.Data {
		data[i] = toCashCloseResource(item)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":         data,
		"total":        out.Total,
		"current_page": out.CurrentPage,
		"last_page":    out.LastPage,
		"per_page":     out.PerPage,
		"meta": gin.H{
			"total":        out.Total,
			"current_page": out.CurrentPage,
			"last_page":    out.LastPage,
			"per_page":     out.PerPage,
		},
	})
}

// GetCashRegisterClose godoc
// GET /api/v1/cash-register-closes/:id
func (h *Handler) GetCashRegisterClose(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	item, err := h.cashClose.GetByID(id, claims.Role, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toCashCloseResource(item)})
}

// CreateCashRegisterClose godoc
// POST /api/v1/cash-register-closes
func (h *Handler) CreateCashRegisterClose(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	var input cashclosesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	item, err := h.cashClose.Create(input, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": toCashCloseResource(item)})
}

// UpdateCashRegisterClose godoc
// PUT /api/v1/cash-register-closes/:id
func (h *Handler) UpdateCashRegisterClose(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input cashclosesvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	item, err := h.cashClose.Update(id, input, claims.Role, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toCashCloseResource(item)})
}

// SubmitCashRegisterClose godoc
// POST /api/v1/cash-register-closes/:id/submit
func (h *Handler) SubmitCashRegisterClose(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	item, err := h.cashClose.Submit(id, claims.Role, claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toCashCloseResource(item)})
}

// ApproveCashRegisterClose godoc
// POST /api/v1/cash-register-closes/:id/approve
func (h *Handler) ApproveCashRegisterClose(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input cashclosesvc.ApproveInput
	if err := c.ShouldBindJSON(&input); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	item, err := h.cashClose.Approve(id, claims.UserID, input)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toCashCloseResource(item)})
}

// ReturnCashRegisterCloseToDraft godoc
// POST /api/v1/cash-register-closes/:id/return
func (h *Handler) ReturnCashRegisterCloseToDraft(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input cashclosesvc.ApproveInput
	if err := c.ShouldBindJSON(&input); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	item, err := h.cashClose.ReturnToDraft(id, input)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toCashCloseResource(item)})
}

// PutCashRegisterCloseAdminActuals godoc
// PUT /api/v1/cash-register-closes/:id/admin-actuals
func (h *Handler) PutCashRegisterCloseAdminActuals(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input cashclosesvc.PutAdminActualsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	item, err := h.cashClose.PutAdminActuals(id, input)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toCashCloseResource(item)})
}

// ListCashRegisterClosesAdvisorsPending godoc
// GET /api/v1/cash-register-closes-advisors-pending
func (h *Handler) ListCashRegisterClosesAdvisorsPending(c *gin.Context) {
	out, err := h.cashClose.AdvisorsPending()
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, out)
}

// GetCashRegisterClosesConsolidated godoc
// GET /api/v1/cash-register-closes-consolidated?date_from=&date_to=
func (h *Handler) GetCashRegisterClosesConsolidated(c *gin.Context) {
	out, err := h.cashClose.Consolidated(c.Query("date_from"), c.Query("date_to"))
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": out})
}

// GetCashRegisterClosesCalendar godoc
// GET /api/v1/cash-register-closes-calendar?user_id=&date_from=&date_to=
func (h *Handler) GetCashRegisterClosesCalendar(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "user_id es requerido"})
		return
	}

	userID64, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil || userID64 == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "user_id inválido"})
		return
	}
	userID := uint(userID64)

	advisor, err := h.user.GetByID(userID)
	if err != nil {
		respondError(c, err)
		return
	}

	out, err := h.cashClose.CalendarForAdvisor(userID, c.Query("date_from"), c.Query("date_to"))
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"advisor": gin.H{
				"id":        advisor.ID,
				"name":      advisor.Name,
				"last_name": advisor.LastName,
				"role":      advisor.Role,
			},
			"date_from": out.DateFrom,
			"date_to":   out.DateTo,
			"days":      out.Days,
			"summary":   out.Summary,
		},
	})
}
