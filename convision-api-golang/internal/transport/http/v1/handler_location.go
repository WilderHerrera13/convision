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
	data, err := h.location.ListCountries()
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
	countryID, err := strconv.ParseUint(c.Query("country_id"), 10, 64)
	if err != nil || countryID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "country_id is required"})
		return
	}
	data, err := h.location.ListDepartments(uint(countryID))
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
	departmentID, err := strconv.ParseUint(c.Query("department_id"), 10, 64)
	if err != nil || departmentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "department_id is required"})
		return
	}
	data, err := h.location.ListCities(uint(departmentID))
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
	cityID, err := strconv.ParseUint(c.Query("city_id"), 10, 64)
	if err != nil || cityID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "city_id is required"})
		return
	}
	data, err := h.location.ListDistricts(uint(cityID))
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
