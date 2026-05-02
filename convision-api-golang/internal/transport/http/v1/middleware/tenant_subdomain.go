package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/platform/opticacache"
)

const (
	schemaNameKey = "schema_name"
	opticaIDKey   = "optica_id"
)

func TenantFromSubdomain(cache *opticacache.Cache, baseDomain string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("APP_ENV") == "local" {
			slug := os.Getenv("DEFAULT_TENANT_SLUG")
			if slug == "" {
				slug = "main"
			}
			if slug == "admin" {
				c.Set(schemaNameKey, "platform")
				c.Set(opticaIDKey, uint(0))
				c.Next()
				return
			}
			schemaName := "optica_" + slug
			opticaID := uint(0)
			if entry, ok := cache.GetBySlug(slug); ok {
				opticaID = entry.ID
			}
			c.Set(schemaNameKey, schemaName)
			c.Set(opticaIDKey, opticaID)
			c.Next()
			return
		}

		host := c.GetHeader("X-Forwarded-Host")
		if host == "" {
			host = c.Request.Host
		}
		host = strings.Split(host, ":")[0]

		slug := extractSlug(host, baseDomain)
		if slug == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "subdominio inválido"})
			return
		}

		if slug == "admin" {
			c.Set(schemaNameKey, "platform")
			c.Set(opticaIDKey, uint(0))
			c.Next()
			return
		}

		entry, ok := cache.GetBySlug(slug)
		if !ok {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"message": "óptica no encontrada"})
			return
		}
		if !entry.IsActive {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "óptica inactiva"})
			return
		}

		c.Set(schemaNameKey, entry.SchemaName)
		c.Set(opticaIDKey, entry.ID)
		c.Next()
	}
}

func extractSlug(host, baseDomain string) string {
	suffix := "." + baseDomain
	if !strings.HasSuffix(host, suffix) {
		return ""
	}
	prefix := strings.TrimSuffix(host, suffix)
	if prefix == "" || prefix == "app" {
		return ""
	}
	return prefix
}

func SchemaNameKey() string { return schemaNameKey }

func OpticaIDKey() string { return opticaIDKey }

func SchemaNameFromCtx(c *gin.Context) string {
	v, _ := c.Get(schemaNameKey)
	s, _ := v.(string)
	return s
}

func OpticaIDFromCtx(c *gin.Context) uint {
	v, _ := c.Get(opticaIDKey)
	id, _ := v.(uint)
	return id
}
