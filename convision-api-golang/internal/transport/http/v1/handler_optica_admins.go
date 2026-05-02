package v1

import (
	"fmt"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	usersvc "github.com/convision/api/internal/user"
)

var opticaSchemaRe = regexp.MustCompile(`^optica_[a-z0-9_]{1,60}$`)

type createOpticaAdminInput struct {
	Name     string `json:"name"      binding:"required,min=2,max=150"`
	LastName string `json:"last_name" binding:"omitempty,max=255"`
	Email    string `json:"email"     binding:"required,email"`
	Password string `json:"password"  binding:"required,min=6"`
}

func (h *Handler) beginOpticaTx(c *gin.Context, opticaID uint) (*gorm.DB, bool) {
	o, err := h.optica.GetByID(opticaID)
	if err != nil {
		respondError(c, err)
		return nil, false
	}
	if !opticaSchemaRe.MatchString(o.SchemaName) {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return nil, false
	}
	tx := h.db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return nil, false
	}
	if err := tx.Exec(fmt.Sprintf("SET LOCAL search_path = %s", o.SchemaName)).Error; err != nil {
		tx.Rollback() //nolint:errcheck
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return nil, false
	}
	return tx, true
}

// ListOpticaAdmins handles GET /api/v1/super-admin/opticas/:id/admins
func (h *Handler) ListOpticaAdmins(c *gin.Context) {
	opticaID, err := parseID(c, "id")
	if err != nil {
		return
	}
	tx, ok := h.beginOpticaTx(c, opticaID)
	if !ok {
		return
	}
	defer tx.Rollback() //nolint:errcheck

	admins, err := h.user.GetAdmins(tx)
	if err != nil {
		respondError(c, err)
		return
	}
	tx.Commit() //nolint:errcheck
	c.JSON(http.StatusOK, gin.H{"data": toUserResources(admins)})
}

// CreateOpticaAdmin handles POST /api/v1/super-admin/opticas/:id/admins
func (h *Handler) CreateOpticaAdmin(c *gin.Context) {
	opticaID, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input createOpticaAdminInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	tx, ok := h.beginOpticaTx(c, opticaID)
	if !ok {
		return
	}
	defer tx.Rollback() //nolint:errcheck

	u, err := h.user.Create(tx, usersvc.CreateInput{
		Name:     input.Name,
		LastName: input.LastName,
		Email:    input.Email,
		Password: input.Password,
		Role:     domain.RoleAdmin,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	tx.Commit() //nolint:errcheck
	c.JSON(http.StatusCreated, toUserResource(u))
}

// DeleteOpticaAdmin handles DELETE /api/v1/super-admin/opticas/:id/admins/:userId
func (h *Handler) DeleteOpticaAdmin(c *gin.Context) {
	opticaID, err := parseID(c, "id")
	if err != nil {
		return
	}
	userID, err := parseID(c, "userId")
	if err != nil {
		return
	}
	tx, ok := h.beginOpticaTx(c, opticaID)
	if !ok {
		return
	}
	defer tx.Rollback() //nolint:errcheck

	if err := h.user.Delete(tx, userID); err != nil {
		respondError(c, err)
		return
	}
	tx.Commit() //nolint:errcheck
	c.Status(http.StatusNoContent)
}
