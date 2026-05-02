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
