package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	rolesvc "github.com/convision/api/internal/role"
)

// ListRoles godoc
// GET /api/v1/roles
func (h *Handler) ListRoles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := map[string]any{"name": c.Query("name")}

	out, err := h.role.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetRole godoc
// GET /api/v1/roles/:id
func (h *Handler) GetRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de rol inválido"})
		return
	}
	role, err := h.role.GetByID(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, role)
}

// CreateRole godoc
// POST /api/v1/roles
func (h *Handler) CreateRole(c *gin.Context) {
	var input rolesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	role, err := h.role.Create(input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, role)
}

// UpdateRole godoc
// PUT /api/v1/roles/:id
func (h *Handler) UpdateRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de rol inválido"})
		return
	}
	var input rolesvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	role, err := h.role.Update(uint(id), input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, role)
}

// DeleteRole godoc
// DELETE /api/v1/roles/:id
func (h *Handler) DeleteRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de rol inválido"})
		return
	}
	if err := h.role.Delete(uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ListAllPermissions godoc
// GET /api/v1/permissions
func (h *Handler) ListAllPermissions(c *gin.Context) {
	perms, err := h.role.ListAllPermissions()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": perms})
}

// AssignRoleToUser godoc
// POST /api/v1/users/:id/roles
func (h *Handler) AssignRoleToUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de usuario inválido"})
		return
	}
	var input rolesvc.AssignInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	input.UserID = uint(userID)
	if err := h.role.AssignRoleToUser(input); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// RemoveRoleFromUser godoc
// DELETE /api/v1/users/:id/roles/:roleId
func (h *Handler) RemoveRoleFromUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de usuario inválido"})
		return
	}
	roleID, err := strconv.ParseUint(c.Param("roleId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de rol inválido"})
		return
	}
	input := rolesvc.RemoveInput{UserID: uint(userID), RoleID: uint(roleID)}
	if err := h.role.RemoveRoleFromUser(input); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GetUserPermissions godoc
// GET /api/v1/users/:id/permissions
func (h *Handler) GetUserPermissions(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de usuario inválido"})
		return
	}
	perms, err := h.role.GetUserPermissionKeys(uint(userID))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": perms})
}
