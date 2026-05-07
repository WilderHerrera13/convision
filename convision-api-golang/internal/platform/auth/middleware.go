package jwtauth

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

const claimsKey = "claims"

// ErrMissingToken is returned when no Authorization header is present.
var ErrMissingToken = errors.New("missing authorization token")

// Authenticate is a Gin middleware that validates the JWT and injects Claims.
// An optional RevokedTokenRepository + globalDB can be passed to check for revoked tokens.
func Authenticate(revokedRepo domain.RevokedTokenRepository, db ...*gorm.DB) gin.HandlerFunc {
	var globalDB *gorm.DB
	if len(db) > 0 {
		globalDB = db[0]
	}

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := ParseToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"message": "invalid or expired token"})
			return
		}

		if revokedRepo != nil && globalDB != nil {
			revoked, err := revokedRepo.IsRevoked(globalDB, claims.ID)
			if err != nil {
				c.AbortWithStatusJSON(401, gin.H{"message": "token validation error"})
				return
			}
			if revoked {
				c.AbortWithStatusJSON(401, gin.H{"message": "token has been revoked"})
				return
			}
		}

		if globalDB != nil && claims.SchemaName != "" && claims.SchemaName != "platform" {
			// Qualify the table with the tenant schema so globalDB (search_path=public)
			// doesn't query an empty public.users.
			table := claims.SchemaName + ".users"
			var tokenVer int
			if err := globalDB.Table(table).
				Select("token_version").
				Where("id = ?", claims.UserID).
				Scan(&tokenVer).Error; err != nil {
				c.AbortWithStatusJSON(401, gin.H{"message": "token validation error"})
				return
			}
			if tokenVer != claims.TokenVersion {
				c.AbortWithStatusJSON(401, gin.H{"message": "token has been invalidated"})
				return
			}
		}

		c.Set(claimsKey, claims)
		c.Next()
	}
}


// GetClaims retrieves the authenticated user's claims from the Gin context.
func GetClaims(c *gin.Context) (*Claims, bool) {
	val, exists := c.Get(claimsKey)
	if !exists {
		return nil, false
	}
	claims, ok := val.(*Claims)
	return claims, ok
}

// RequireRole returns a middleware that enforces one or more allowed roles.
func RequireRole(roles ...domain.Role) gin.HandlerFunc {
	allowed := make(map[domain.Role]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}

	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
			return
		}

		if _, permitted := allowed[claims.Role]; !permitted {
			c.AbortWithStatusJSON(403, gin.H{"message": "forbidden: insufficient role"})
			return
		}

		c.Next()
	}
}

// RequirePermission returns a middleware that enforces a single permission key ("module:action").
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
			return
		}
		perms := buildPermissionSet(claims.Permissions)
		if _, permitted := perms[permission]; !permitted {
			c.AbortWithStatusJSON(403, gin.H{"message": "forbidden: insufficient permissions"})
			return
		}
		c.Next()
	}
}

// RequireAnyPermission returns a middleware that passes if the token holds at least one of the given permissions.
func RequireAnyPermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
			return
		}
		perms := buildPermissionSet(claims.Permissions)
		for _, p := range permissions {
			if _, permitted := perms[p]; permitted {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(403, gin.H{"message": "forbidden: insufficient permissions"})
	}
}

// RequireAllPermissions returns a middleware that passes only if the token holds every listed permission.
func RequireAllPermissions(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
			return
		}
		perms := buildPermissionSet(claims.Permissions)
		for _, p := range permissions {
			if _, permitted := perms[p]; !permitted {
				c.AbortWithStatusJSON(403, gin.H{"message": "forbidden: insufficient permissions"})
				return
			}
		}
		c.Next()
	}
}

// buildPermissionSet converts a permissions slice into an O(1) lookup map.
func buildPermissionSet(perms []string) map[string]struct{} {
	set := make(map[string]struct{}, len(perms))
	for _, p := range perms {
		set[p] = struct{}{}
	}
	return set
}
