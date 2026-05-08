package postgres

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/convision/api/internal/domain"
)

// Open returns a configured *gorm.DB connected to PostgreSQL.
// It reads connection details from environment variables.
func Open(log *zap.Logger) (*gorm.DB, error) {
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_DATABASE"),
		sslMode,
	)

	gormLevel := logger.Silent
	if os.Getenv("APP_ENV") == "local" {
		gormLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(gormLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("postgres: connect: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("postgres: get underlying db: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Info("database connection established")
	return db, nil
}

func renameLegacyUserPasswordColumnIfNeeded(db *gorm.DB) error {
	return db.Exec(`
DO $ren$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'users' AND column_name = 'password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users RENAME COLUMN password TO password_hash;
  END IF;
END
$ren$;
`).Error
}

// ensureCashRegisterCloseUniqueIndex creates the (user_id, branch_id, close_date::date) partial
// unique index that GORM AutoMigrate cannot express. Mirrors migration 000040 so duplicates are
// detected during local QA before staging/prod deploys (see DEVELOPMENT_GUIDE.md §10).
func ensureCashRegisterCloseUniqueIndex(db *gorm.DB) error {
	return db.Exec(`
DO $cci$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = CURRENT_SCHEMA() AND table_name = 'cash_register_closes'
    ) THEN
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id, branch_id, ((close_date AT TIME ZONE 'UTC')::date)
                    ORDER BY
                        CASE status
                            WHEN 'approved'  THEN 1
                            WHEN 'submitted' THEN 2
                            ELSE                  3
                        END,
                        created_at DESC
                ) AS rn
            FROM cash_register_closes
            WHERE status IN ('submitted', 'approved')
              AND close_date IS NOT NULL
        )
        UPDATE cash_register_closes
        SET status = 'draft', updated_at = NOW()
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

        IF EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = 'uq_cash_register_closes_user_date_active'
        ) THEN
            EXECUTE 'DROP INDEX uq_cash_register_closes_user_date_active';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = 'uq_cash_register_closes_user_branch_date_active'
        ) THEN
            EXECUTE 'CREATE UNIQUE INDEX uq_cash_register_closes_user_branch_date_active '
                 || 'ON cash_register_closes (user_id, branch_id, ((close_date AT TIME ZONE ''UTC'')::date)) '
                 || 'WHERE status IN (''submitted'', ''approved'')';
        END IF;
    END IF;
END
$cci$;
`).Error
}

// Migrate runs auto-migration for all registered domain models.
// This is safe for development; use a proper migration tool in production.
func Migrate(db *gorm.DB) error {
	if err := renameLegacyUserPasswordColumnIfNeeded(db); err != nil {
		return err
	}
	if err := db.AutoMigrate(
		// Lookup / reference tables
		&domain.Country{},
		&domain.Department{},
		&domain.City{},
		&domain.District{},
		&domain.IdentificationType{},
		&domain.AffiliationType{},
		&domain.CoverageType{},
		&domain.HealthInsuranceProvider{},
		&domain.EducationLevel{},
		&domain.PaymentMethod{},
		&domain.ProductCategory{},
		&domain.Brand{},
		// Branch / multi-clinic
		&domain.Branch{},
		&domain.UserBranch{},
		// Core entities
		&domain.User{},
		&domain.RoleModel{},
		&domain.Permission{},
		&domain.UserRole{},
		&domain.Patient{},
		// Appointments & clinical
		&domain.Appointment{},
		&domain.Prescription{},
		&domain.ClinicalHistory{},
		&domain.ClinicalEvolution{},
		&domain.ClinicalRecord{},
		&domain.Anamnesis{},
		&domain.VisualExam{},
		&domain.Diagnosis{},
		&domain.ClinicalPrescription{},
		// Catalogue
		&domain.LensType{},
		&domain.LensClass{},
		&domain.Material{},
		&domain.Treatment{},
		&domain.Photochromic{},
		&domain.Supplier{},
		&domain.Lens{},
		&domain.Product{},
		&domain.ProductLensAttributes{},
		&domain.ProductFrameAttributes{},
		&domain.ProductContactLensAttributes{},
		// Inventory
		&domain.Warehouse{},
		&domain.WarehouseLocation{},
		&domain.InventoryItem{},
		&domain.InventoryTransfer{},
		&domain.StockMovement{},
		&domain.InventoryAdjustment{},
		// Laboratory
		&domain.Laboratory{},
		&domain.LaboratoryOrder{},
		&domain.LaboratoryOrderStatusEntry{},
		&domain.LaboratoryOrderEvidence{},
		&domain.LaboratoryOrderCall{},
		// Commerce
		&domain.Order{},
		&domain.OrderItem{},
		&domain.Sale{},
		&domain.SaleItem{},
		&domain.SalePayment{},
		&domain.PartialPayment{},
		&domain.SaleLensPriceAdjustment{},
		&domain.Quote{},
		&domain.QuoteItem{},
		&domain.DiscountRequest{},
		// Purchasing & finance
		&domain.Purchase{},
		&domain.PurchaseItem{},
		&domain.PurchasePayment{},
		&domain.Expense{},
		&domain.ServiceOrder{},
		&domain.Payroll{},
		// Cash management
		&domain.CashRegisterClose{},
		&domain.CashRegisterClosePayment{},
		&domain.CashRegisterCloseActualPayment{},
		&domain.CashCountDenomination{},
		&domain.CashTransfer{},
		&domain.DailyActivityReport{},
		&domain.DailyReportEditLog{},
		// Notes & notifications
		&domain.Note{},
		&domain.LensNote{},
		&domain.AdminUserNotification{},
		// Token revocation
		&domain.RevokedToken{},
		// Bulk import audit
		&domain.BulkImportLog{},
		// Platform (multi-tenancy)
		&domain.Optica{},
		&domain.SuperAdmin{},
		&domain.OpticaFeature{},
		&domain.OpticaAllowedPermission{},
	); err != nil {
		return err
	}
	return ensureCashRegisterCloseUniqueIndex(db)
}

// MigrateTenantSchema creates all tenant-level tables inside the given PostgreSQL schema.
// It acquires a dedicated connection, pins search_path to schemaName, then runs AutoMigrate
// so every table is created in that schema without touching the platform schema.
func MigrateTenantSchema(db *gorm.DB, schemaName string) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("get sql.DB: %w", err)
	}
	conn, err := sqlDB.Conn(context.Background())
	if err != nil {
		return fmt.Errorf("get connection: %w", err)
	}
	defer conn.Close() //nolint:errcheck

	if _, err := conn.ExecContext(context.Background(),
		fmt.Sprintf("SET search_path = %s", schemaName)); err != nil {
		return fmt.Errorf("set search_path: %w", err)
	}

	tenantDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{
		Logger: db.Config.Logger,
	})
	if err != nil {
		return fmt.Errorf("gorm open: %w", err)
	}

	if err := tenantDB.AutoMigrate(
		// Lookup / reference tables
		&domain.Country{},
		&domain.Department{},
		&domain.City{},
		&domain.District{},
		&domain.IdentificationType{},
		&domain.AffiliationType{},
		&domain.CoverageType{},
		&domain.HealthInsuranceProvider{},
		&domain.EducationLevel{},
		&domain.PaymentMethod{},
		&domain.ProductCategory{},
		&domain.Brand{},
		// Branch / multi-clinic
		&domain.Branch{},
		&domain.UserBranch{},
		// Core entities
		&domain.User{},
		&domain.RoleModel{},
		&domain.Permission{},
		&domain.UserRole{},
		&domain.Patient{},
		// Appointments & clinical
		&domain.Appointment{},
		&domain.Prescription{},
		&domain.ClinicalHistory{},
		&domain.ClinicalEvolution{},
		&domain.ClinicalRecord{},
		&domain.Anamnesis{},
		&domain.VisualExam{},
		&domain.Diagnosis{},
		&domain.ClinicalPrescription{},
		// Catalogue
		&domain.LensType{},
		&domain.LensClass{},
		&domain.Material{},
		&domain.Treatment{},
		&domain.Photochromic{},
		&domain.Supplier{},
		&domain.Lens{},
		&domain.Product{},
		&domain.ProductLensAttributes{},
		&domain.ProductFrameAttributes{},
		&domain.ProductContactLensAttributes{},
		// Inventory
		&domain.Warehouse{},
		&domain.WarehouseLocation{},
		&domain.InventoryItem{},
		&domain.InventoryTransfer{},
		&domain.StockMovement{},
		&domain.InventoryAdjustment{},
		// Laboratory
		&domain.Laboratory{},
		&domain.LaboratoryOrder{},
		&domain.LaboratoryOrderStatusEntry{},
		&domain.LaboratoryOrderEvidence{},
		&domain.LaboratoryOrderCall{},
		// Commerce
		&domain.Order{},
		&domain.OrderItem{},
		&domain.Sale{},
		&domain.SaleItem{},
		&domain.SalePayment{},
		&domain.PartialPayment{},
		&domain.SaleLensPriceAdjustment{},
		&domain.Quote{},
		&domain.QuoteItem{},
		&domain.DiscountRequest{},
		// Purchasing & finance
		&domain.Purchase{},
		&domain.PurchaseItem{},
		&domain.PurchasePayment{},
		&domain.Expense{},
		&domain.ServiceOrder{},
		&domain.Payroll{},
		// Cash management
		&domain.CashRegisterClose{},
		&domain.CashRegisterClosePayment{},
		&domain.CashRegisterCloseActualPayment{},
		&domain.CashCountDenomination{},
		&domain.CashTransfer{},
		&domain.DailyActivityReport{},
		&domain.DailyReportEditLog{},
		// Notes & notifications
		&domain.Note{},
		&domain.LensNote{},
		&domain.AdminUserNotification{},
		// Bulk import audit
		&domain.BulkImportLog{},
		// RevokedToken and platform models (Optica, SuperAdmin, OpticaFeature) live
		// in the platform schema and must NOT be migrated into tenant schemas.
	); err != nil {
		return err
	}
	return ensureCashRegisterCloseUniqueIndex(tenantDB)
}

// NewSchemaConnection creates a *gorm.DB pinned to a single connection from the pool
// with search_path set to schemaName. The returned cleanup func releases the connection
// back to the pool — the caller must always defer it.
func NewSchemaConnection(base *gorm.DB, schemaName string) (*gorm.DB, func(), error) {
	sqlDB, err := base.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("get sql.DB: %w", err)
	}
	conn, err := sqlDB.Conn(context.Background())
	if err != nil {
		return nil, nil, fmt.Errorf("acquire connection: %w", err)
	}
	cleanup := func() { _ = conn.Close() }
	if _, err := conn.ExecContext(context.Background(), "SET search_path = "+schemaName); err != nil {
		cleanup()
		return nil, nil, fmt.Errorf("set search_path: %w", err)
	}
	schemaDB, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{
		Logger: base.Config.Logger,
	})
	if err != nil {
		cleanup()
		return nil, nil, fmt.Errorf("gorm open: %w", err)
	}
	return schemaDB, cleanup, nil
}

// MigrateAllTenantSchemas runs MigrateTenantSchema for every optica that already exists.
// Call this on startup so new tables added to MigrateTenantSchema are applied to
// existing tenants, not only to newly-created ones.
func MigrateAllTenantSchemas(db *gorm.DB) error {
	var schemas []string
	if err := db.Raw(`SELECT schema_name FROM platform.opticas WHERE schema_name IS NOT NULL AND schema_name <> ''`).Scan(&schemas).Error; err != nil {
		return err
	}
	for _, s := range schemas {
		if err := MigrateTenantSchema(db, s); err != nil {
			return err
		}
	}
	return nil
}
