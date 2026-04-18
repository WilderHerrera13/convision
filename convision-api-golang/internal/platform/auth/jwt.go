package jwtauth

import (
	cryptorand "crypto/rand"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/convision/api/internal/domain"
)

// Claims holds the JWT payload for an authenticated user.
type Claims struct {
	UserID uint        `json:"user_id"`
	Email  string      `json:"email"`
	Role   domain.Role `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT for the given user.
// Returns the token string, the jti (JWT ID for revocation), and the TTL in seconds.
func GenerateToken(user *domain.User) (tokenString string, jti string, expiresIn int64, err error) {
	ttlHours, _ := strconv.Atoi(os.Getenv("JWT_TTL_HOURS"))
	if ttlHours == 0 {
		ttlHours = 24
	}

	jti = newJTI()
	expiresIn = int64(ttlHours) * 3600

	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   strconv.Itoa(int(user.ID)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(ttlHours) * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err = token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	return
}

// ParseToken validates a JWT string and returns its claims.
func ParseToken(tokenStr string) (*Claims, error) {
	secret := []byte(os.Getenv("JWT_SECRET"))

	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// newJTI generates a random UUID v4 string for use as the JWT ID.
func newJTI() string {
	b := make([]byte, 16)
	_, _ = cryptorand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant bits
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
