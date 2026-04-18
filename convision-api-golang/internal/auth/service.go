package auth

import (
	"errors"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// Service handles authentication use-cases.
type Service struct {
	users         domain.UserRepository
	revokedTokens domain.RevokedTokenRepository
	logger        *zap.Logger
}

// NewService creates a new auth Service.
func NewService(users domain.UserRepository, revokedTokens domain.RevokedTokenRepository, logger *zap.Logger) *Service {
	return &Service{users: users, revokedTokens: revokedTokens, logger: logger}
}

// LoginInput holds credentials for the login use-case.
type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginOutput holds the response after a successful login or token refresh.
type LoginOutput struct {
	AccessToken string       `json:"access_token"`
	TokenType   string       `json:"token_type"`
	ExpiresIn   int64        `json:"expires_in"`
	JTI         string       `json:"-"` // used internally for revocation; not sent to client
	User        *domain.User `json:"-"` // handler converts to UserResource
}

// Login validates credentials and returns a signed JWT.
func (s *Service) Login(input LoginInput) (*LoginOutput, error) {
	user, err := s.users.GetByEmail(input.Email)
	if err != nil {
		// Do not leak whether the email exists.
		return nil, errors.New("invalid credentials")
	}

	if !user.Active {
		return nil, errors.New("account is disabled")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		s.logger.Warn("failed login attempt", zap.String("email", input.Email))
		return nil, errors.New("invalid credentials")
	}

	tokenStr, jti, expiresIn, err := jwtauth.GenerateToken(user)
	if err != nil {
		return nil, err
	}

	s.logger.Info("user logged in", zap.Uint("user_id", user.ID), zap.String("role", string(user.Role)))
	return &LoginOutput{
		AccessToken: tokenStr,
		TokenType:   "bearer",
		ExpiresIn:   expiresIn,
		JTI:         jti,
		User:        user,
	}, nil
}

// Logout revokes the token identified by jti.
func (s *Service) Logout(jti string) error {
	return s.revokedTokens.Revoke(jti)
}

// Me fetches the currently authenticated user by their ID.
func (s *Service) Me(userID uint) (*domain.User, error) {
	return s.users.GetByID(userID)
}

// Refresh revokes the old token and issues a new one for the same user.
func (s *Service) Refresh(oldJti string, userID uint) (*LoginOutput, error) {
	if err := s.revokedTokens.Revoke(oldJti); err != nil {
		return nil, err
	}

	user, err := s.users.GetByID(userID)
	if err != nil {
		return nil, err
	}

	tokenStr, jti, expiresIn, err := jwtauth.GenerateToken(user)
	if err != nil {
		return nil, err
	}

	s.logger.Info("token refreshed", zap.Uint("user_id", user.ID))
	return &LoginOutput{
		AccessToken: tokenStr,
		TokenType:   "bearer",
		ExpiresIn:   expiresIn,
		JTI:         jti,
		User:        user,
	}, nil
}
