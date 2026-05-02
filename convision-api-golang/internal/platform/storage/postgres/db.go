package postgres

import (
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

// Migrate runs auto-migration for all registered domain models.
// This is safe for development; use a proper migration tool in production.
func Migrate(db *gorm.DB) error {
	if err := renameLegacyUserPasswordColumnIfNeeded(db); err != nil {
		return err
	}
	return db.AutoMigrate(
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
	)
}
