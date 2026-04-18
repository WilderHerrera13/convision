package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	expensesvc "github.com/convision/api/internal/expense"
	jwtauth "github.com/convision/api/internal/platform/auth"
	purchasesvc "github.com/convision/api/internal/purchase"
	suppliersvc "github.com/convision/api/internal/supplier"
)

// SupplierResponse wraps domain.Supplier and converts City relation to city string
type SupplierResponse struct {
	ID                    uint        `json:"id"`
	Name                  string      `json:"name"`
	NIT                   string      `json:"nit"`
	LegalName             string      `json:"legal_name"`
	LegalRepresentative   string      `json:"legal_representative"`
	LegalRepresentativeID string      `json:"legal_representative_id"`
	PersonType            string      `json:"person_type"`
	TaxResponsibility     string      `json:"tax_responsibility"`
	RegimeType            string      `json:"regime_type"`
	DocumentType          string      `json:"document_type"`
	CommercialName        string      `json:"commercial_name"`
	ResponsiblePerson     string      `json:"responsible_person"`
	Address               string      `json:"address"`
	Phone                 string      `json:"phone"`
	Email                 string      `json:"email"`
	City                  *string     `json:"city"`
	State                 string      `json:"state"`
	Country               string      `json:"country"`
	PostalCode            string      `json:"postal_code"`
	Website               string      `json:"website"`
	BankName              string      `json:"bank_name"`
	BankAccountType       string      `json:"bank_account_type"`
	BankAccountNumber     string      `json:"bank_account_number"`
	InvimaRegistration    string      `json:"invima_registration"`
	FiscalResponsibility  string      `json:"fiscal_responsibility"`
	IsSelfWithholding     bool        `json:"is_self_withholding"`
	IsVATAgent            bool        `json:"is_vat_agent"`
	IsGreatContributor    bool        `json:"is_great_contributor"`
	Notes                 string      `json:"notes"`
	CreatedAt             string      `json:"created_at"`
	UpdatedAt             string      `json:"updated_at"`
}

// buildSupplierResponse converts domain.Supplier to SupplierResponse with city string
func buildSupplierResponse(s *domain.Supplier) SupplierResponse {
	var cityName *string
	if s.City != nil && s.City.Name != "" {
		cityName = &s.City.Name
	}
	return SupplierResponse{
		ID:                    s.ID,
		Name:                  s.Name,
		NIT:                   s.NIT,
		LegalName:             s.LegalName,
		LegalRepresentative:   s.LegalRepresentative,
		LegalRepresentativeID: s.LegalRepresentativeID,
		PersonType:            s.PersonType,
		TaxResponsibility:     s.TaxResponsibility,
		RegimeType:            s.RegimeType,
		DocumentType:          s.DocumentType,
		CommercialName:        s.CommercialName,
		ResponsiblePerson:     s.ResponsiblePerson,
		Address:               s.Address,
		Phone:                 s.Phone,
		Email:                 s.Email,
		City:                  cityName,
		State:                 s.State,
		Country:               s.Country,
		PostalCode:            s.PostalCode,
		Website:               s.Website,
		BankName:              s.BankName,
		BankAccountType:       s.BankAccountType,
		BankAccountNumber:     s.BankAccountNumber,
		InvimaRegistration:    s.InvimaRegistration,
		FiscalResponsibility:  s.FiscalResponsibility,
		IsSelfWithholding:     s.IsSelfWithholding,
		IsVATAgent:            s.IsVATAgent,
		IsGreatContributor:    s.IsGreatContributor,
		Notes:                 s.Notes,
		CreatedAt:             s.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:             s.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}
}

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
	
	// Convert to response structure with city string
	data := make([]SupplierResponse, len(out.Data))
	for i, s := range out.Data {
		data[i] = buildSupplierResponse(s)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data":          data,
		"total":         out.Total,
		"current_page":  out.CurrentPage,
		"last_page":     out.LastPage,
		"per_page":      out.PerPage,
	})
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
	c.JSON(http.StatusOK, buildSupplierResponse(s))
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
	c.JSON(http.StatusCreated, buildSupplierResponse(s))
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
	c.JSON(http.StatusOK, buildSupplierResponse(s))
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

// ReceivePurchase marks a purchase as received
// POST /api/v1/purchases/:id/receive
func (h *Handler) ReceivePurchase(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	p, err := h.purchase.Receive(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
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

// ---------- Supplier Payments ----------

// ListSupplierPayments returns empty paginated list (stub endpoint for frontend compatibility)
// GET /api/v1/supplier-payments
func (h *Handler) ListSupplierPayments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	// Return empty paginated response
	response := gin.H{
		"data":         []interface{}{},
		"total":        int64(0),
		"current_page": page,
		"per_page":     perPage,
		"last_page":    1,
	}
	c.JSON(http.StatusOK, response)
}
