package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ---------- Lookup / Location responses ----------

type CountryResource struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type DepartmentResource struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	CountryID uint   `json:"country_id"`
}

type CityResource struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	DepartmentID uint   `json:"department_id"`
}

type DistrictResource struct {
	ID     uint   `json:"id"`
	Name   string `json:"name"`
	CityID uint   `json:"city_id"`
}

// GET /api/v1/lookup/countries
func (h *Handler) LookupCountries(c *gin.Context) {
	db := tenantDBFromCtx(c)
	data, err := h.location.ListCountries(db)
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CountryResource, len(data))
	for i, v := range data {
		items[i] = CountryResource{ID: v.ID, Name: v.Name}
	}
	c.JSON(http.StatusOK, items)
}

// GET /api/v1/lookup/departments?country_id=1
func (h *Handler) LookupDepartments(c *gin.Context) {
	db := tenantDBFromCtx(c)
	countryID, err := strconv.ParseUint(c.Query("country_id"), 10, 64)
	if err != nil || countryID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "country_id is required"})
		return
	}
	data, err := h.location.ListDepartments(db, uint(countryID))
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]DepartmentResource, len(data))
	for i, v := range data {
		items[i] = DepartmentResource{ID: v.ID, Name: v.Name, CountryID: v.CountryID}
	}
	c.JSON(http.StatusOK, items)
}

// GET /api/v1/lookup/cities?department_id=10
func (h *Handler) LookupCities(c *gin.Context) {
	db := tenantDBFromCtx(c)
	departmentID, err := strconv.ParseUint(c.Query("department_id"), 10, 64)
	if err != nil || departmentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "department_id is required"})
		return
	}
	data, err := h.location.ListCities(db, uint(departmentID))
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]CityResource, len(data))
	for i, v := range data {
		items[i] = CityResource{ID: v.ID, Name: v.Name, DepartmentID: v.DepartmentID}
	}
	c.JSON(http.StatusOK, items)
}

// GET /api/v1/lookup/districts?city_id=100
func (h *Handler) LookupDistricts(c *gin.Context) {
	db := tenantDBFromCtx(c)
	cityID, err := strconv.ParseUint(c.Query("city_id"), 10, 64)
	if err != nil || cityID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "city_id is required"})
		return
	}
	data, err := h.location.ListDistricts(db, uint(cityID))
	if err != nil {
		respondError(c, err)
		return
	}
	items := make([]DistrictResource, len(data))
	for i, v := range data {
		items[i] = DistrictResource{ID: v.ID, Name: v.Name, CityID: v.CityID}
	}
	c.JSON(http.StatusOK, items)
}

type LookupItem struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Code string `json:"code,omitempty"`
}

// GET /api/v1/lookup/patient-data
// Returns all reference tables needed by the patient form in a single request.
func (h *Handler) LookupPatientData(c *gin.Context) {
	db := tenantDBFromCtx(c)
	idTypes, err := h.location.ListIdentificationTypes(db)
	if err != nil {
		respondError(c, err)
		return
	}
	eps, err := h.location.ListHealthInsuranceProviders(db)
	if err != nil {
		respondError(c, err)
		return
	}
	aff, err := h.location.ListAffiliationTypes(db)
	if err != nil {
		respondError(c, err)
		return
	}
	cov, err := h.location.ListCoverageTypes(db)
	if err != nil {
		respondError(c, err)
		return
	}
	edu, err := h.location.ListEducationLevels(db)
	if err != nil {
		respondError(c, err)
		return
	}

	itItems := make([]LookupItem, len(idTypes))
	for i, v := range idTypes {
		itItems[i] = LookupItem{ID: v.ID, Name: v.Name, Code: v.Code}
	}
	epsItems := make([]LookupItem, len(eps))
	for i, v := range eps {
		epsItems[i] = LookupItem{ID: v.ID, Name: v.Name, Code: v.Code}
	}
	affItems := make([]LookupItem, len(aff))
	for i, v := range aff {
		affItems[i] = LookupItem{ID: v.ID, Name: v.Name, Code: v.Code}
	}
	covItems := make([]LookupItem, len(cov))
	for i, v := range cov {
		covItems[i] = LookupItem{ID: v.ID, Name: v.Name, Code: v.Code}
	}
	eduItems := make([]LookupItem, len(edu))
	for i, v := range edu {
		eduItems[i] = LookupItem{ID: v.ID, Name: v.Name, Code: v.Code}
	}

	c.JSON(http.StatusOK, gin.H{
		"identification_types":       itItems,
		"health_insurance_providers": epsItems,
		"affiliation_types":          affItems,
		"coverage_types":             covItems,
		"education_levels":           eduItems,
	})
}
