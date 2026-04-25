package v1

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	appointmentsvc "github.com/convision/api/internal/appointment"
	authsvc "github.com/convision/api/internal/auth"
	"github.com/convision/api/internal/bulkimport"
	cashsvc "github.com/convision/api/internal/cash"
	cashclosesvc "github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/catalog"
	"github.com/convision/api/internal/clinic"
	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	"github.com/convision/api/internal/discount"
	"github.com/convision/api/internal/domain"
	expensesvc "github.com/convision/api/internal/expense"
	"github.com/convision/api/internal/inventory"
	labsvc "github.com/convision/api/internal/laboratory"
	"github.com/convision/api/internal/location"
	notesvc "github.com/convision/api/internal/note"
	notificationsvc "github.com/convision/api/internal/notification"
	ordersvc "github.com/convision/api/internal/order"
	"github.com/convision/api/internal/patient"
	payrollsvc "github.com/convision/api/internal/payroll"
	jwtauth "github.com/convision/api/internal/platform/auth"
	postgresplatform "github.com/convision/api/internal/platform/storage/postgres"
	prescriptionsvc "github.com/convision/api/internal/prescription"
	"github.com/convision/api/internal/product"
	purchasesvc "github.com/convision/api/internal/purchase"
	quotesvc "github.com/convision/api/internal/quote"
	salesvc "github.com/convision/api/internal/sale"
	serviceordersvc "github.com/convision/api/internal/serviceorder"
	suppliersvc "github.com/convision/api/internal/supplier"
	usersvc "github.com/convision/api/internal/user"
)

// timeFormat matches Laravel's Carbon microsecond UTC format.
const timeFormat = "2006-01-02T15:04:05.000000"

// UserResource is the JSON shape returned for every user response.
type UserResource struct {
	ID             uint   `json:"id"`
	Name           string `json:"name"`
	LastName       string `json:"last_name"`
	Email          string `json:"email"`
	Identification string `json:"identification"`
	Phone          string `json:"phone"`
	Role           string `json:"role"`
	Active         bool   `json:"active"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

func toUserResource(u *domain.User) UserResource {
	return UserResource{
		ID:             u.ID,
		Name:           u.Name,
		LastName:       u.LastName,
		Email:          u.Email,
		Identification: u.Identification,
		Phone:          u.Phone,
		Role:           string(u.Role),
		Active:         u.Active,
		CreatedAt:      u.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:      u.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}
}

func toUserResources(users []*domain.User) []UserResource {
	out := make([]UserResource, len(users))
	for i, u := range users {
		out[i] = toUserResource(u)
	}
	return out
}

func toMap(v interface{}) gin.H {
	bytes, err := json.Marshal(v)
	if err != nil {
		return gin.H{}
	}
	out := gin.H{}
	if err := json.Unmarshal(bytes, &out); err != nil {
		return gin.H{}
	}
	return out
}

// Handler aggregates all v1 HTTP handlers.
type Handler struct {
	auth          *authsvc.Service
	patient       *patient.Service
	clinic        *clinic.Service
	user          *usersvc.Service
	appointment   *appointmentsvc.Service
	prescription  *prescriptionsvc.Service
	catalog       *catalog.Service
	location      *location.Service
	product       *product.Service
	category      *product.CategoryService
	inventory     *inventory.Service
	discount      *discount.Service
	quote         *quotesvc.Service
	sale          *salesvc.Service
	order         *ordersvc.Service
	laboratory    *labsvc.Service
	supplier      *suppliersvc.Service
	purchase      *purchasesvc.Service
	expense       *expensesvc.Service
	payroll       *payrollsvc.Service
	serviceOrder  *serviceordersvc.Service
	cashTransfer  *cashsvc.Service
	cashClose     *cashclosesvc.Service
	notification  *notificationsvc.Service
	note          *notesvc.Service
	dailyActivity *dailyactivitysvc.Service
	dashboard     *postgresplatform.DashboardRepository
	bulkImport    *bulkimport.Service
	bulkImportLog domain.BulkImportLogRepository
	revokedTokens domain.RevokedTokenRepository
}

// NewHandler creates a Handler with all required services injected.
func NewHandler(
	auth *authsvc.Service,
	patient *patient.Service,
	clinic *clinic.Service,
	user *usersvc.Service,
	appointment *appointmentsvc.Service,
	prescription *prescriptionsvc.Service,
	catalog *catalog.Service,
	location *location.Service,
	productSvc *product.Service,
	categorySvc *product.CategoryService,
	inventorySvc *inventory.Service,
	discountSvc *discount.Service,
	quoteSvc *quotesvc.Service,
	saleSvc *salesvc.Service,
	orderSvc *ordersvc.Service,
	laboratorySvc *labsvc.Service,
	supplierSvc *suppliersvc.Service,
	purchaseSvc *purchasesvc.Service,
	expenseSvc *expensesvc.Service,
	payrollSvc *payrollsvc.Service,
	serviceOrderSvc *serviceordersvc.Service,
	cashSvc *cashsvc.Service,
	cashCloseSvc *cashclosesvc.Service,
	notificationSvc *notificationsvc.Service,
	noteSvc *notesvc.Service,
	dailyActivitySvc *dailyactivitysvc.Service,
	dashboardRepo *postgresplatform.DashboardRepository,
	bulkImportSvc    *bulkimport.Service,
	bulkImportLogRepo domain.BulkImportLogRepository,
	revokedTokens    domain.RevokedTokenRepository,
) *Handler {
	return &Handler{
		auth:          auth,
		patient:       patient,
		clinic:        clinic,
		user:          user,
		appointment:   appointment,
		prescription:  prescription,
		catalog:       catalog,
		location:      location,
		product:       productSvc,
		category:      categorySvc,
		inventory:     inventorySvc,
		discount:      discountSvc,
		quote:         quoteSvc,
		sale:          saleSvc,
		order:         orderSvc,
		laboratory:    laboratorySvc,
		supplier:      supplierSvc,
		purchase:      purchaseSvc,
		expense:       expenseSvc,
		payroll:       payrollSvc,
		serviceOrder:  serviceOrderSvc,
		cashTransfer:  cashSvc,
		cashClose:     cashCloseSvc,
		notification:  notificationSvc,
		note:          noteSvc,
		dailyActivity: dailyActivitySvc,
		dashboard:     dashboardRepo,
		bulkImport:    bulkImportSvc,
		bulkImportLog: bulkImportLogRepo,
		revokedTokens: revokedTokens,
	}
}

// ---------- Auth ----------

// Login godoc
// POST /api/v1/auth/login
func (h *Handler) Login(c *gin.Context) {
	var input authsvc.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	out, err := h.auth.Login(input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Credenciales incorrectas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": out.AccessToken,
		"token_type":   out.TokenType,
		"expires_in":   out.ExpiresIn,
		"user":         toUserResource(out.User),
	})
}

// Logout godoc
// POST /api/v1/auth/logout
func (h *Handler) Logout(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	if err := h.auth.Logout(claims.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
}

// Me godoc
// GET /api/v1/auth/me
func (h *Handler) Me(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	user, err := h.auth.Me(claims.UserID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toUserResource(user)})
}

// Refresh godoc
// POST /api/v1/auth/refresh
func (h *Handler) Refresh(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
		return
	}

	out, err := h.auth.Refresh(claims.ID, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": out.AccessToken,
		"token_type":   out.TokenType,
		"expires_in":   out.ExpiresIn,
		"user":         toUserResource(out.User),
	})
}

// ---------- Users ----------

// ListUsers godoc
// GET /api/v1/users
func (h *Handler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	out, err := h.user.List(page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         toUserResources(out.Data),
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

// GetUser godoc
// GET /api/v1/users/:id
func (h *Handler) GetUser(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	u, err := h.user.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, toUserResource(u))
}

// CreateUser godoc
// POST /api/v1/users
func (h *Handler) CreateUser(c *gin.Context) {
	var input usersvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	u, err := h.user.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusCreated, toUserResource(u))
}

// UpdateUser godoc
// PUT /api/v1/users/:id
func (h *Handler) UpdateUser(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input usersvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	u, err := h.user.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, toUserResource(u))
}

// DeleteUser godoc
// DELETE /api/v1/users/:id
func (h *Handler) DeleteUser(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	if err := h.user.Delete(id); err != nil {
		respondError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// ListSpecialists godoc
// GET /api/v1/specialists
// Returns all specialist-role users. Accessible to all authenticated roles.
func (h *Handler) ListSpecialists(c *gin.Context) {
	users, err := h.user.GetSpecialists()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": toUserResources(users)})
}

// ---------- Patients ----------

// PatientResource is the JSON shape returned for every patient response.
type PatientResource struct {
	ID                 uint    `json:"id"`
	FirstName          string  `json:"first_name"`
	LastName           string  `json:"last_name"`
	Email              string  `json:"email"`
	Phone              string  `json:"phone"`
	Identification     string  `json:"identification"`
	IdentificationType *string `json:"identification_type"`
	BirthDate          *string `json:"birth_date"`
	Gender             string  `json:"gender"`
	Address            string  `json:"address"`
	City               *string `json:"city"`
	District           *string `json:"district"`
	State              *string `json:"state"`
	Country            *string `json:"country"`
	Neighborhood       string  `json:"neighborhood"`
	PostalCode         string  `json:"postal_code"`
	EPS                *string `json:"eps"`
	Affiliation        *string `json:"affiliation"`
	Coverage           *string `json:"coverage"`
	Occupation         string  `json:"occupation"`
	Education          *string `json:"education"`
	Position           string  `json:"position"`
	Company            string  `json:"company"`
	Notes              string  `json:"notes"`
	Status             string  `json:"status"`
	ProfileImageURL    *string `json:"profile_image"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

func toPatientResource(p *domain.Patient) PatientResource {
	r := PatientResource{
		ID:             p.ID,
		FirstName:      p.FirstName,
		LastName:       p.LastName,
		Email:          p.Email,
		Phone:          p.Phone,
		Identification: p.Identification,
		Gender:         p.Gender,
		Address:        p.Address,
		Neighborhood:   p.Neighborhood,
		PostalCode:     p.PostalCode,
		Occupation:     p.Occupation,
		Position:       p.Position,
		Company:        p.Company,
		Notes:          p.Notes,
		Status:         p.Status,
		CreatedAt:      p.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:      p.UpdatedAt.UTC().Format(timeFormat) + "Z",
	}
	if p.BirthDate != nil {
		d := p.BirthDate.UTC().Format("2006-01-02")
		r.BirthDate = &d
	}
	if p.IdentificationType != nil {
		r.IdentificationType = &p.IdentificationType.Name
	}
	if p.City != nil {
		r.City = &p.City.Name
	}
	if p.District != nil {
		r.District = &p.District.Name
	}
	if p.Department != nil {
		r.State = &p.Department.Name
	}
	if p.Country != nil {
		r.Country = &p.Country.Name
	}
	if p.HealthInsurance != nil {
		r.EPS = &p.HealthInsurance.Name
	}
	if p.AffiliationType != nil {
		r.Affiliation = &p.AffiliationType.Name
	}
	if p.CoverageType != nil {
		r.Coverage = &p.CoverageType.Name
	}
	if p.EducationLevel != nil {
		r.Education = &p.EducationLevel.Name
	}
	if p.ProfileImage != "" {
		r.ProfileImageURL = &p.ProfileImage
	}
	return r
}

func toPatientResources(patients []*domain.Patient) []PatientResource {
	out := make([]PatientResource, len(patients))
	for i, p := range patients {
		out[i] = toPatientResource(p)
	}
	return out
}

// parseApiFilters parses s_f/s_v query params (JSON arrays) into a filters map.
// When s_o=or is present it adds the special key "_or_mode"="true" so repositories
// can apply OR logic instead of AND across the provided fields.
func parseApiFilters(c *gin.Context) map[string]any {
	sf := c.Query("s_f")
	sv := c.Query("s_v")
	if sf == "" || sv == "" {
		return nil
	}
	var fields, values []string
	if err := json.Unmarshal([]byte(sf), &fields); err != nil {
		return nil
	}
	if err := json.Unmarshal([]byte(sv), &values); err != nil {
		return nil
	}
	filters := make(map[string]any, len(fields)+1)
	for i, f := range fields {
		if i < len(values) {
			filters[f] = values[i]
		}
	}
	if c.Query("s_o") == "or" {
		filters["_or_mode"] = "true"
	}
	return filters
}

// ListPatients godoc
// GET /api/v1/patients
func (h *Handler) ListPatients(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := parseApiFilters(c)

	out, err := h.patient.List(filters, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"current_page": out.CurrentPage,
		"data":         toPatientResources(out.Data),
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

// GetPatient godoc
// GET /api/v1/patients/:id
func (h *Handler) GetPatient(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	p, err := h.patient.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toPatientResource(p))
}

// CreatePatient godoc
// POST /api/v1/patients
func (h *Handler) CreatePatient(c *gin.Context) {
	var input patient.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	p, err := h.patient.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toPatientResource(p))
}

// UpdatePatient godoc
// PUT /api/v1/patients/:id
func (h *Handler) UpdatePatient(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var input patient.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	p, err := h.patient.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toPatientResource(p))
}

// DeletePatient godoc
// DELETE /api/v1/patients/:id
func (h *Handler) DeletePatient(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	if err := h.patient.Delete(id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Helpers ----------

func parseID(c *gin.Context, param string) (uint, error) {
	raw := c.Param(param)
	n, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return 0, err
	}
	return uint(n), nil
}

// respondError maps domain errors to HTTP status codes using errors.As.
func respondError(c *gin.Context, err error) {
	var notFound *domain.ErrNotFound
	if errors.As(err, &notFound) {
		c.JSON(http.StatusNotFound, gin.H{"message": notFound.Error()})
		return
	}

	var conflict *domain.ErrConflict
	if errors.As(err, &conflict) {
		c.JSON(http.StatusConflict, gin.H{"message": conflict.Error()})
		return
	}

	var unauthorized *domain.ErrUnauthorized
	if errors.As(err, &unauthorized) {
		c.JSON(http.StatusForbidden, gin.H{"message": unauthorized.Error()})
		return
	}

	var validation *domain.ErrValidation
	if errors.As(err, &validation) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": validation.Error()})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
}
