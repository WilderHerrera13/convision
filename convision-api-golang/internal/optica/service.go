package optica

import (
	"fmt"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/featurecache"
	"github.com/convision/api/internal/platform/opticacache"
)

// SchemaProvisioner creates all tenant tables inside the given PostgreSQL schema.
type SchemaProvisioner func(schemaName string) error

// Service handles optica management use-cases including schema provisioning.
type Service struct {
	repo            domain.OpticaRepository
	featureRepo     domain.OpticaFeatureRepository
	featureCache    *featurecache.Cache
	opticaCache     *opticacache.Cache
	provisionSchema SchemaProvisioner
	db              *gorm.DB
	logger          *zap.Logger
}

// NewService creates a new optica Service.
func NewService(
	repo domain.OpticaRepository,
	featureRepo domain.OpticaFeatureRepository,
	featureCache *featurecache.Cache,
	opticaCache *opticacache.Cache,
	provisionSchema SchemaProvisioner,
	db *gorm.DB,
	logger *zap.Logger,
) *Service {
	return &Service{
		repo:            repo,
		featureRepo:     featureRepo,
		featureCache:    featureCache,
		opticaCache:     opticaCache,
		provisionSchema: provisionSchema,
		db:              db,
		logger:          logger,
	}
}

// CreateOpticaInput holds validated fields for creating an optica.
type CreateOpticaInput struct {
	Name  string                 `json:"name"  binding:"required,min=2,max=150"`
	Slug  string                 `json:"slug"  binding:"required,min=2,max=60"`
	Plan  string                 `json:"plan"  binding:"required,oneof=standard premium enterprise"`
	Admin CreateTenantAdminInput `json:"admin" binding:"required"`
}

// CreateTenantAdminInput holds validated fields for the first admin of a new tenant.
type CreateTenantAdminInput struct {
	Name     string `json:"name"     binding:"required,min=2,max=150"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// UpdateOpticaInput holds optional fields for updating an optica.
type UpdateOpticaInput struct {
	Name     *string `json:"name"`
	Plan     *string `json:"plan"`
	IsActive *bool   `json:"is_active"`
}

// Create provisions a new optica: inserts row, creates schema, runs migrations, seeds admin+branch+flags.
// Uses a two-phase approach because CREATE SCHEMA auto-commits in PostgreSQL.
func (s *Service) Create(input CreateOpticaInput) (*domain.Optica, error) {
	if domain.IsReservedSlug(input.Slug) {
		return nil, &domain.ErrReservedSlug{Slug: input.Slug}
	}

	schemaName := "optica_" + input.Slug
	optica := &domain.Optica{
		Slug:       input.Slug,
		Name:       input.Name,
		Plan:       input.Plan,
		IsActive:   true,
		SchemaName: schemaName,
	}

	// Phase 1: insert the optica row in the platform schema.
	if err := s.repo.Create(optica); err != nil {
		return nil, err
	}

	// Phase 2: create the schema (DDL auto-commits, cannot be in a transaction).
	if err := s.db.Exec("CREATE SCHEMA " + schemaName).Error; err != nil {
		_ = s.repo.Delete(optica.ID)
		return nil, &domain.ErrSchemaCreationFailed{Schema: schemaName, Err: err}
	}

	// Phase 3: provision all tenant tables via AutoMigrate on a schema-scoped connection.
	if err := s.provisionSchema(schemaName); err != nil {
		_ = s.db.Exec("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE")
		_ = s.repo.Delete(optica.ID)
		return nil, fmt.Errorf("schema provisioning: %w", err)
	}

	// Phase 4: seed initial admin user and primary branch inside a transaction.
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		tx.Exec(fmt.Sprintf("SET LOCAL search_path = %s", schemaName))
		return s.seedTenant(tx, input.Admin)
	}); err != nil {
		_ = s.db.Exec("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE")
		_ = s.repo.Delete(optica.ID)
		return nil, fmt.Errorf("seed: %w", err)
	}

	// Seed feature flags (non-fatal: log on failure).
	if err := s.featureRepo.SeedDefaults(optica.ID); err != nil {
		s.logger.Error("failed to seed feature flags", zap.Uint("optica_id", optica.ID), zap.Error(err))
	}

	s.opticaCache.Upsert(&opticacache.Entry{
		ID:         optica.ID,
		Slug:       optica.Slug,
		SchemaName: optica.SchemaName,
		IsActive:   optica.IsActive,
	})

	s.logger.Info("optica created", zap.Uint("id", optica.ID), zap.String("slug", optica.Slug))
	return optica, nil
}

// List returns a paginated list of opticas.
func (s *Service) List(page, perPage int) ([]*domain.Optica, int64, error) {
	return s.repo.List(page, perPage)
}

// GetByID returns an optica by its primary key.
func (s *Service) GetByID(id uint) (*domain.Optica, error) {
	return s.repo.GetByID(id)
}

// Update applies partial updates to an optica and refreshes the optica cache.
func (s *Service) Update(id uint, input UpdateOpticaInput) (*domain.Optica, error) {
	optica, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		optica.Name = *input.Name
	}
	if input.Plan != nil {
		optica.Plan = *input.Plan
	}
	if input.IsActive != nil {
		optica.IsActive = *input.IsActive
	}
	if err := s.repo.Update(optica); err != nil {
		return nil, err
	}
	s.opticaCache.Upsert(&opticacache.Entry{
		ID:         optica.ID,
		Slug:       optica.Slug,
		SchemaName: optica.SchemaName,
		IsActive:   optica.IsActive,
	})
	return optica, nil
}

// seedTenant inserts the first admin user and "Sede Principal" branch into the tenant schema.
func (s *Service) seedTenant(tx *gorm.DB, admin CreateTenantAdminInput) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(admin.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := tx.Exec(
		`INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, 'admin', true)`,
		admin.Name, admin.Email, string(hash),
	).Error; err != nil {
		return err
	}
	return tx.Exec(
		`INSERT INTO branches (name, city) VALUES ('Sede Principal', '')`,
	).Error
}
