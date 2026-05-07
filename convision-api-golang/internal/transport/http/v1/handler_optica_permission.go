package v1

import (
	"net/http"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"
)

var permissionKeyPattern = regexp.MustCompile(`^[a-z_]+:[a-z_]+$`)

type updateOpticaPermissionsInput struct {
	PermissionKeys []string `json:"permission_keys" binding:"required"`
}

// GetOpticaPermissions godoc
// GET /api/v1/super-admin/opticas/:id/permissions
func (h *Handler) GetOpticaPermissions(c *gin.Context) {
	opticaID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de óptica inválido"})
		return
	}
	keys, err := h.opticaPermRepo.ListByOpticaID(uint(opticaID))
	if err != nil {
		respondError(c, err)
		return
	}
	if keys == nil {
		keys = []string{}
	}
	c.JSON(http.StatusOK, gin.H{"permission_keys": keys})
}

// UpdateOpticaPermissions godoc
// PUT /api/v1/super-admin/opticas/:id/permissions
func (h *Handler) UpdateOpticaPermissions(c *gin.Context) {
	opticaID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID de óptica inválido"})
		return
	}
	var input updateOpticaPermissionsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	for _, k := range input.PermissionKeys {
		if !permissionKeyPattern.MatchString(k) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"message": "Formato de permiso inválido: " + k + " (formato requerido: modulo:accion)",
			})
			return
		}
	}
	if err := h.opticaPermRepo.ReplaceAll(uint(opticaID), input.PermissionKeys); err != nil {
		respondError(c, err)
		return
	}
	keys, _ := h.opticaPermRepo.ListByOpticaID(uint(opticaID))
	if keys == nil {
		keys = []string{}
	}
	c.JSON(http.StatusOK, gin.H{"permission_keys": keys})
}
