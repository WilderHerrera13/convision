package v1

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	rolesvc "github.com/convision/api/internal/role"
)

// ListRoles godoc
// GET /api/v1/roles
func (h *Handler) ListRoles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := map[string]any{"name": c.Query("name")}

	out, err := h.role.List(tenantDBFromCtx(c), filters, page, perPage)
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
	role, err := h.role.GetByID(tenantDBFromCtx(c), uint(id))
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
	role, err := h.role.Create(tenantDBFromCtx(c), input)
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
	role, err := h.role.Update(tenantDBFromCtx(c), uint(id), input)
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
	if err := h.role.Delete(tenantDBFromCtx(c), uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GetRoleUsers godoc
// GET /api/v1/roles/:id/users
func (h *Handler) GetRoleUsers(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de rol inválido"})
		return
	}
	users, err := h.role.GetRoleUsers(tenantDBFromCtx(c), uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

// ListAllPermissions godoc
// GET /api/v1/permissions
// Returns permissions filtered by the optica's allowed scope (when restrictions exist).
// Super admin users (schemaName == "platform") receive the full unfiltered list.
func (h *Handler) ListAllPermissions(c *gin.Context) {
	perms, err := h.role.ListAllPermissions(tenantDBFromCtx(c))
	if err != nil {
		respondError(c, err)
		return
	}

	claims, ok := jwtauth.GetClaims(c)
	if ok && claims.SchemaName != "platform" && h.opticaPermRepo != nil {
		if hasRestriction, err := h.opticaPermRepo.HasAny(claims.OpticaID); err == nil && hasRestriction {
			allowedKeys, _ := h.opticaPermRepo.ListByOpticaID(claims.OpticaID)
			allowedSet := make(map[string]struct{}, len(allowedKeys))
			for _, k := range allowedKeys {
				allowedSet[k] = struct{}{}
			}
			filtered := perms[:0]
			for _, p := range perms {
				if _, ok := allowedSet[p.Key()]; ok {
					filtered = append(filtered, p)
				}
			}
			perms = filtered
		}
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
	if claims, ok := jwtauth.GetClaims(c); ok {
		input.RequestingUserID = claims.UserID
	}
	if err := h.role.AssignRoleToUser(tenantDBFromCtx(c), input); err != nil {
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
	if claims, ok := jwtauth.GetClaims(c); ok {
		input.RequestingUserID = claims.UserID
	}
	if err := h.role.RemoveRoleFromUser(tenantDBFromCtx(c), input); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// GetUserRoles godoc
// GET /api/v1/users/:id/roles
func (h *Handler) GetUserRoles(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de usuario inválido"})
		return
	}
	roles, err := h.role.GetUserRoles(tenantDBFromCtx(c), uint(userID))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": roles})
}

// GetUserPermissions godoc
// GET /api/v1/users/:id/permissions
func (h *Handler) GetUserPermissions(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de usuario inválido"})
		return
	}
	perms, err := h.role.GetUserPermissionKeys(tenantDBFromCtx(c), uint(userID))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": perms})
}

// ListAllPermissionsForSuperAdmin godoc
// GET /api/v1/super-admin/permissions
// Returns the full permissions catalog unfiltered by optica scope.
// Used by super admin to populate the optica permission matrix UI.
func (h *Handler) ListAllPermissionsForSuperAdmin(c *gin.Context) {
	if h.superAdminPermSchema == "" {
		c.JSON(http.StatusOK, gin.H{"data": []any{}})
		return
	}
	tx := h.db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	defer tx.Rollback() //nolint:errcheck

	if err := tx.Exec(fmt.Sprintf("SET LOCAL search_path = %s", h.superAdminPermSchema)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	perms, err := h.role.ListAllPermissions(tx)
	if err != nil {
		respondError(c, err)
		return
	}
	tx.Commit() //nolint:errcheck
	c.JSON(http.StatusOK, gin.H{"data": perms})
}
