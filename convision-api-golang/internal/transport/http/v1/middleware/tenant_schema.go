package middleware

import (
	"fmt"
	"regexp"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	jwtauth "github.com/convision/api/internal/platform/auth"
)

const tenantDBKey = "tenant_db"

var validSchemaRe = regexp.MustCompile(`^optica_[a-z0-9_]{1,60}$`)

// TenantDBKey returns the context key used to store the tenant-scoped *gorm.DB.
func TenantDBKey() string { return tenantDBKey }

func TenantSchema(globalDB *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		schemaName, _ := c.Get(schemaNameKey)
		name, _ := schemaName.(string)

		if name != "platform" && !validSchemaRe.MatchString(name) {
			c.AbortWithStatusJSON(400, gin.H{"message": "tenant inválido"})
			return
		}

		// Cross-check JWT schema claim with subdomain (active after 16-03 populates claims)
		claims, ok := jwtauth.GetClaims(c)
		if ok && claims != nil && claims.SchemaName != "" && claims.SchemaName != name {
			c.AbortWithStatusJSON(403, gin.H{"message": "token no pertenece a esta óptica"})
			return
		}

		tx := globalDB.Begin()
		if tx.Error != nil {
			c.AbortWithStatusJSON(500, gin.H{"message": "internal server error"})
			return
		}

		// SET LOCAL is scoped to this explicit transaction
		if err := tx.Exec(fmt.Sprintf("SET LOCAL search_path = %s", name)).Error; err != nil {
			tx.Rollback() //nolint:errcheck
			c.AbortWithStatusJSON(500, gin.H{"message": "internal server error"})
			return
		}

		c.Set(tenantDBKey, tx)

		defer func() {
			if r := recover(); r != nil {
				tx.Rollback() //nolint:errcheck
				panic(r)
			}
		}()

		c.Next()

		if !c.IsAborted() {
			tx.Commit() //nolint:errcheck
		} else {
			tx.Rollback() //nolint:errcheck
		}
	}
}
