package testutil

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// MakeTestClaims builds claims with a fixed far-future ExpiresAt (2099-01-01)
// to avoid time.Now() flakiness. role must be one of domain.RoleAdmin, etc.
func MakeTestClaims(userID uint, role domain.Role) *jwtauth.Claims {
	return &jwtauth.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Date(2099, 1, 1, 0, 0, 0, 0, time.UTC)),
		},
	}
}

// InjectClaims returns a Gin middleware that sets claims in the context
// under the same key used by the real JWT middleware, bypassing token validation.
func InjectClaims(claims *jwtauth.Claims) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("claims", claims)
		c.Next()
	}
}

func AdminClaims() *jwtauth.Claims        { return MakeTestClaims(1, domain.RoleAdmin) }
func SpecialistClaims() *jwtauth.Claims   { return MakeTestClaims(2, domain.RoleSpecialist) }
func ReceptionistClaims() *jwtauth.Claims { return MakeTestClaims(3, domain.RoleReceptionist) }
func LaboratoryClaims() *jwtauth.Claims   { return MakeTestClaims(4, domain.RoleLaboratory) }
