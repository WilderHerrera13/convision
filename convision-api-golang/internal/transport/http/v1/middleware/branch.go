package middleware

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

const branchIDKey = "branch_id"

func BranchContext(branchRepo domain.BranchRepository, fallbackDB *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		headerVal := c.GetHeader("X-Branch-ID")
		if headerVal == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "Sede requerida"})
			return
		}

		parsed, err := strconv.ParseUint(headerVal, 10, 64)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "ID de sede inválido"})
			return
		}
		branchID := uint(parsed)

		db := fallbackDB
		if v, ok := c.Get(tenantDBKey); ok {
			if tdb, ok := v.(*gorm.DB); ok {
				db = tdb
			}
		}

		branch, err := branchRepo.GetActiveByID(db, branchID)
		if err != nil {
			var notFound *domain.ErrBranchNotFound
			var inactive *domain.ErrBranchInactive
			if errors.As(err, &notFound) || errors.As(err, &inactive) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Sede no disponible"})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
			return
		}
		_ = branch

		claims, ok := jwtauth.GetClaims(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
			return
		}

		if claims.Role != domain.RoleAdmin {
			hasAccess, err := branchRepo.UserHasAccess(db, claims.UserID, branchID)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
				return
			}
			if !hasAccess {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Sin acceso a esta sede"})
				return
			}
		}

		c.Set(branchIDKey, branchID)
		c.Next()
	}
}

func BranchIDFromCtx(c *gin.Context) uint {
	v, _ := c.Get(branchIDKey)
	id, _ := v.(uint)
	return id
}
