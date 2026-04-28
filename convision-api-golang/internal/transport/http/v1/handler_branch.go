package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	branchsvc "github.com/convision/api/internal/branch"
)

type BranchResource struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Address  string `json:"address"`
	City     string `json:"city"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	IsActive bool   `json:"is_active"`
}

func (h *Handler) ListBranches(c *gin.Context) {
	branches, err := h.branch.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	out := make([]BranchResource, len(branches))
	for i, b := range branches {
		out[i] = BranchResource{
			ID: b.ID, Name: b.Name, Address: b.Address,
			City: b.City, Phone: b.Phone, Email: b.Email, IsActive: b.IsActive,
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": out})
}

func (h *Handler) GetBranch(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	b, err := h.branch.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, BranchResource{
		ID: b.ID, Name: b.Name, Address: b.Address,
		City: b.City, Phone: b.Phone, Email: b.Email, IsActive: b.IsActive,
	})
}

func (h *Handler) CreateBranch(c *gin.Context) {
	var input branchsvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	b, err := h.branch.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, BranchResource{
		ID: b.ID, Name: b.Name, Address: b.Address,
		City: b.City, Phone: b.Phone, Email: b.Email, IsActive: b.IsActive,
	})
}

func (h *Handler) UpdateBranch(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input branchsvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	b, err := h.branch.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, BranchResource{
		ID: b.ID, Name: b.Name, Address: b.Address,
		City: b.City, Phone: b.Phone, Email: b.Email, IsActive: b.IsActive,
	})
}

func (h *Handler) AssignUserBranches(c *gin.Context) {
	rawID := c.Param("id")
	parsed, err := strconv.ParseUint(rawID, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid user id"})
		return
	}
	userID := uint(parsed)
	var input branchsvc.AssignInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	if err := h.branch.AssignUserBranches(userID, input); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Sedes asignadas correctamente"})
}
