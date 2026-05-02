package auth

import (
	"errors"
	"fmt"
	"strings"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
	"github.com/convision/api/internal/platform/featurecache"
)

type Service struct {
	db            *gorm.DB
	users         domain.UserRepository
	revokedTokens domain.RevokedTokenRepository
	branches      domain.BranchRepository
	superAdmins   domain.SuperAdminRepository
	featureCache  *featurecache.Cache
	logger        *zap.Logger
}

func NewService(
	db *gorm.DB,
	users domain.UserRepository,
	revokedTokens domain.RevokedTokenRepository,
	branches domain.BranchRepository,
	superAdmins domain.SuperAdminRepository,
	featureCache *featurecache.Cache,
	logger *zap.Logger,
) *Service {
	return &Service{
		db:            db,
		users:         users,
		revokedTokens: revokedTokens,
		branches:      branches,
		superAdmins:   superAdmins,
		featureCache:  featureCache,
		logger:        logger,
	}
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginContext struct {
	SchemaName string
	OpticaID   uint
	DB         *gorm.DB
}

type LoginOutput struct {
	AccessToken            string       `json:"access_token"`
	TokenType              string       `json:"token_type"`
	ExpiresIn              int64        `json:"expires_in"`
	JTI                    string       `json:"-"`
	User                   *domain.User `json:"-"`
	Branches               []BranchInfo `json:"branches"`
	FeatureFlags           []string     `json:"feature_flags"`
	RequirePasswordChange  bool         `json:"require_password_change"`
}

type BranchInfo struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	City      string `json:"city"`
	IsPrimary bool   `json:"is_primary"`
}

func (s *Service) Login(input LoginInput, ctx LoginContext) (*LoginOutput, error) {
	if ctx.SchemaName == "platform" {
		return s.loginSuperAdmin(input)
	}
	return s.loginTenantUser(input, ctx)
}

func (s *Service) loginSuperAdmin(input LoginInput) (*LoginOutput, error) {
	sa, err := s.superAdmins.GetByEmail(input.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if !sa.IsActive {
		return nil, errors.New("account is disabled")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(sa.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	user := &domain.User{
		ID:    sa.ID,
		Email: sa.Email,
		Name:  sa.Name,
		Role:  domain.RoleSuperAdmin,
	}
	tokenStr, jti, expiresIn, err := jwtauth.GenerateToken(user, 0, "platform", nil)
	if err != nil {
		return nil, err
	}
	return &LoginOutput{
		AccessToken:  tokenStr,
		TokenType:    "bearer",
		ExpiresIn:    expiresIn,
		JTI:          jti,
		User:         user,
		Branches:     nil,
		FeatureFlags: nil,
	}, nil
}

func (s *Service) loginTenantUser(input LoginInput, ctx LoginContext) (*LoginOutput, error) {
	tx := ctx.DB.Begin()
	if tx.Error != nil {
		return nil, errors.New("internal error")
	}
	defer tx.Rollback()

	if err := tx.Exec(fmt.Sprintf("SET LOCAL search_path = %s", ctx.SchemaName)).Error; err != nil {
		return nil, errors.New("internal error")
	}

	user, err := s.users.GetByEmail(tx, input.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if !user.Active {
		return nil, errors.New("account is disabled")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		s.logger.Warn("failed login attempt", zap.String("email", input.Email))
		return nil, errors.New("invalid credentials")
	}
	if err := s.ensureOperatorBranchesForLogin(tx, user); err != nil {
		return nil, err
	}
	flags, _ := s.featureCache.GetEnabled(ctx.OpticaID)
	tokenStr, jti, expiresIn, err := jwtauth.GenerateToken(user, ctx.OpticaID, ctx.SchemaName, flags)
	if err != nil {
		return nil, err
	}
	s.logger.Info("user logged in", zap.Uint("user_id", user.ID), zap.String("role", string(user.Role)))
	return &LoginOutput{
		AccessToken:           tokenStr,
		TokenType:             "bearer",
		ExpiresIn:             expiresIn,
		JTI:                   jti,
		User:                  user,
		Branches:              s.loadBranches(tx, user),
		FeatureFlags:          flags,
		RequirePasswordChange: user.MustChangePassword,
	}, nil
}

func (s *Service) ChangePassword(db *gorm.DB, userID uint, newPassword string) error {
	if len(strings.TrimSpace(newPassword)) < 8 {
		return errors.New("la contraseña debe tener al menos 8 caracteres")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.users.UpdatePassword(db, userID, string(hashed))
}

func (s *Service) Logout(jti string) error {
	return s.revokedTokens.Revoke(s.db, jti)
}

func (s *Service) Me(userID uint) (*domain.User, error) {
	return s.users.GetByID(s.db, userID)
}

func (s *Service) Refresh(oldJti string, userID uint, opticaID uint, schemaName string) (*LoginOutput, error) {
	user, err := s.users.GetByID(s.db, userID)
	if err != nil {
		return nil, err
	}

	if err := s.ensureOperatorBranchesForLogin(s.db, user); err != nil {
		return nil, err
	}

	if err := s.revokedTokens.Revoke(s.db, oldJti); err != nil {
		return nil, err
	}

	flags, _ := s.featureCache.GetEnabled(opticaID)
	tokenStr, jti, expiresIn, err := jwtauth.GenerateToken(user, opticaID, schemaName, flags)
	if err != nil {
		return nil, err
	}

	s.logger.Info("token refreshed", zap.Uint("user_id", user.ID))
	return &LoginOutput{
		AccessToken:  tokenStr,
		TokenType:    "bearer",
		ExpiresIn:    expiresIn,
		JTI:          jti,
		User:         user,
		Branches:     s.loadBranches(s.db, user),
		FeatureFlags: flags,
	}, nil
}

func (s *Service) ensureOperatorBranchesForLogin(db *gorm.DB, user *domain.User) error {
	if user.Role != domain.RoleSpecialist && user.Role != domain.RoleReceptionist {
		return nil
	}
	branches, err := s.branches.ListForUser(db, user.ID)
	if err != nil {
		s.logger.Warn("branch list failed on login", zap.Uint("user_id", user.ID), zap.Error(err))
		return errors.New("invalid credentials")
	}
	if len(branches) == 0 {
		s.logger.Warn("login denied: no active branches for role", zap.Uint("user_id", user.ID), zap.String("role", string(user.Role)))
		return &domain.ErrLoginNoBranches{}
	}
	return nil
}

func (s *Service) loadBranches(db *gorm.DB, user *domain.User) []BranchInfo {
	if user.Role == domain.RoleAdmin {
		rawBranches, err := s.branches.ListAll(db)
		if err != nil {
			s.logger.Warn("could not load branches for admin", zap.Uint("user_id", user.ID), zap.Error(err))
			return []BranchInfo{}
		}
		primaryMap, err := s.branches.GetUserBranchPrimaryMap(db, user.ID)
		if err != nil {
			s.logger.Warn("could not load primary map for admin", zap.Uint("user_id", user.ID), zap.Error(err))
			primaryMap = map[uint]bool{}
		}
		out := make([]BranchInfo, len(rawBranches))
		for i, b := range rawBranches {
			out[i] = BranchInfo{ID: b.ID, Name: b.Name, City: b.City, IsPrimary: primaryMap[b.ID]}
		}
		return out
	}

	rawBranches, err := s.branches.ListForUser(db, user.ID)
	if err != nil {
		s.logger.Warn("could not load branches for user", zap.Uint("user_id", user.ID), zap.Error(err))
		return []BranchInfo{}
	}

	primaryMap, err := s.branches.GetUserBranchPrimaryMap(db, user.ID)
	if err != nil {
		s.logger.Warn("could not load primary map for user", zap.Uint("user_id", user.ID), zap.Error(err))
		primaryMap = map[uint]bool{}
	}

	out := make([]BranchInfo, len(rawBranches))
	for i, b := range rawBranches {
		out[i] = BranchInfo{ID: b.ID, Name: b.Name, City: b.City, IsPrimary: primaryMap[b.ID]}
	}
	return out
}
