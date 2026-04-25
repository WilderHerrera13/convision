package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	appointmentsvc "github.com/convision/api/internal/appointment"
	authsvc "github.com/convision/api/internal/auth"
	"github.com/convision/api/internal/bulkimport"
	cashsvc "github.com/convision/api/internal/cash"
	cashclosesvc "github.com/convision/api/internal/cashclose"
	catalogsvc "github.com/convision/api/internal/catalog"
	"github.com/convision/api/internal/clinic"
	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	discountsvc "github.com/convision/api/internal/discount"
	expensesvc "github.com/convision/api/internal/expense"
	inventorysvc "github.com/convision/api/internal/inventory"
	labsvc "github.com/convision/api/internal/laboratory"
	locationsvc "github.com/convision/api/internal/location"
	notesvc "github.com/convision/api/internal/note"
	notificationsvc "github.com/convision/api/internal/notification"
	ordersvc "github.com/convision/api/internal/order"
	"github.com/convision/api/internal/patient"
	payrollsvc "github.com/convision/api/internal/payroll"
	postgresplatform "github.com/convision/api/internal/platform/storage/postgres"
	prescriptionsvc "github.com/convision/api/internal/prescription"
	productsvc "github.com/convision/api/internal/product"
	purchasesvc "github.com/convision/api/internal/purchase"
	quotesvc "github.com/convision/api/internal/quote"
	salesvc "github.com/convision/api/internal/sale"
	serviceordersvc "github.com/convision/api/internal/serviceorder"
	suppliersvc "github.com/convision/api/internal/supplier"
	"github.com/convision/api/internal/transport/http/middleware"
	v1 "github.com/convision/api/internal/transport/http/v1"
	usersvc "github.com/convision/api/internal/user"
)

func main() {
	// Load environment variables from .env (ignored in production if not present)
	_ = godotenv.Load()

	logger := buildLogger()
	defer logger.Sync() //nolint:errcheck

	// ---- Database ----
	db, err := postgresplatform.Open(logger)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	if os.Getenv("APP_ENV") == "local" {
		if err := postgresplatform.Migrate(db); err != nil {
			logger.Fatal("auto-migration failed", zap.Error(err))
		}
		if err := postgresplatform.EnsureLocalDevUsers(db, logger); err != nil {
			logger.Fatal("failed to ensure local dev users", zap.Error(err))
		}
	}

	// ---- Repositories (platform layer) ----
	userRepo := postgresplatform.NewUserRepository(db)
	patientRepo := postgresplatform.NewPatientRepository(db)
	appointmentRepo := postgresplatform.NewAppointmentRepository(db)
	revokedTokenRepo := postgresplatform.NewRevokedTokenRepository(db)
	prescriptionRepo := postgresplatform.NewPrescriptionRepository(db)
	clinicalHistoryRepo := postgresplatform.NewClinicalHistoryRepository(db)
	clinicalEvolutionRepo := postgresplatform.NewClinicalEvolutionRepository(db)

	// Catalog repos
	brandRepo := postgresplatform.NewBrandRepository(db)
	lensTypeRepo := postgresplatform.NewLensTypeRepository(db)
	materialRepo := postgresplatform.NewMaterialRepository(db)
	lensClassRepo := postgresplatform.NewLensClassRepository(db)
	treatmentRepo := postgresplatform.NewTreatmentRepository(db)
	photochromicRepo := postgresplatform.NewPhotochromicRepository(db)
	paymentMethodRepo := postgresplatform.NewPaymentMethodRepository(db)

	// Location repo
	locationRepo := postgresplatform.NewLocationRepository(db)
	patientLookupRepo := postgresplatform.NewPatientLookupRepository(db)

	// Product repos
	productRepo := postgresplatform.NewProductRepository(db)
	productCategoryRepo := postgresplatform.NewProductCategoryRepository(db)

	// Inventory repos
	warehouseRepo := postgresplatform.NewWarehouseRepository(db)
	warehouseLocationRepo := postgresplatform.NewWarehouseLocationRepository(db)
	inventoryItemRepo := postgresplatform.NewInventoryItemRepository(db)
	inventoryTransferRepo := postgresplatform.NewInventoryTransferRepository(db)

	// Discount repo
	discountRepo := postgresplatform.NewDiscountRepository(db)

	// Quote & Sale repos
	quoteRepo := postgresplatform.NewQuoteRepository(db)
	saleRepo := postgresplatform.NewSaleRepository(db)
	saleLensAdjRepo := postgresplatform.NewSaleLensPriceAdjustmentRepository(db)

	// Order & Laboratory repos
	orderRepo := postgresplatform.NewOrderRepository(db)
	laboratoryRepo := postgresplatform.NewLaboratoryRepository(db)
	laboratoryOrderRepo := postgresplatform.NewLaboratoryOrderRepository(db)

	// Supplier, Purchase, Expense repos
	supplierRepo := postgresplatform.NewSupplierRepository(db)
	purchaseRepo := postgresplatform.NewPurchaseRepository(db)
	expenseRepo := postgresplatform.NewExpenseRepository(db)
	payrollRepo := postgresplatform.NewPayrollRepository(db)
	serviceOrderRepo := postgresplatform.NewServiceOrderRepository(db)
	cashTransferRepo := postgresplatform.NewCashTransferRepository(db)
	cashRegisterCloseRepo := postgresplatform.NewCashRegisterCloseRepository(db)
	notificationRepo := postgresplatform.NewNotificationRepository(db)
	noteRepo := postgresplatform.NewNoteRepository(db)
	dailyActivityRepo := postgresplatform.NewDailyActivityRepository(db)
	dashboardRepo := postgresplatform.NewDashboardRepository(db)

	// ---- Services (use-case layer) ----
	authService := authsvc.NewService(userRepo, revokedTokenRepo, logger)
	patientService := patient.NewService(patientRepo, logger)
	userService := usersvc.NewService(userRepo, logger)
	appointmentService := appointmentsvc.NewService(appointmentRepo, logger)
	prescriptionService := prescriptionsvc.NewService(prescriptionRepo, logger)
	clinicService := clinic.NewService(clinicalHistoryRepo, clinicalEvolutionRepo, patientRepo, logger)
	catalogService := catalogsvc.NewService(
		brandRepo, lensTypeRepo, materialRepo, lensClassRepo,
		treatmentRepo, photochromicRepo, paymentMethodRepo, logger,
	)
	locationService := locationsvc.NewService(locationRepo, patientLookupRepo, logger)
	productService := productsvc.NewService(productRepo, discountRepo, logger)
	categoryService := productsvc.NewCategoryService(productCategoryRepo, logger)
	inventoryService := inventorysvc.NewService(warehouseRepo, warehouseLocationRepo, inventoryItemRepo, inventoryTransferRepo, logger)
	discountService := discountsvc.NewService(discountRepo, logger)
	quoteService := quotesvc.NewService(quoteRepo, saleRepo, logger)
	saleService := salesvc.NewService(saleRepo, saleLensAdjRepo, productRepo, logger)
	orderService := ordersvc.NewService(orderRepo, logger)
	laboratoryService := labsvc.NewService(laboratoryRepo, laboratoryOrderRepo, logger)
	supplierService := suppliersvc.NewService(supplierRepo, logger)
	purchaseService := purchasesvc.NewService(purchaseRepo, logger)
	expenseService := expensesvc.NewService(expenseRepo, logger)
	payrollService := payrollsvc.NewService(payrollRepo, logger)
	serviceOrderService := serviceordersvc.NewService(serviceOrderRepo, logger)
	cashService := cashsvc.NewService(cashTransferRepo, logger)
	cashCloseService := cashclosesvc.NewService(cashRegisterCloseRepo, logger)
	notificationService := notificationsvc.NewService(notificationRepo, logger)
	noteService := notesvc.NewService(noteRepo, logger)
	dailyActivityService := dailyactivitysvc.NewService(dailyActivityRepo, logger)
	bulkImportService := bulkimport.NewService(patientRepo, userRepo, appointmentRepo, logger)
	bulkImportLogRepo := postgresplatform.NewBulkImportLogRepository(db)

	// ---- HTTP Router (Gin) ----
	if os.Getenv("APP_ENV") != "local" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.Recovery(logger))
	router.Use(middleware.Logger(logger))

	// Health-check — publicly accessible
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().UTC()})
	})

	// Mount versioned API
	api := router.Group("/api")
	handler := v1.NewHandler(authService, patientService, clinicService, userService, appointmentService, prescriptionService, catalogService, locationService, productService, categoryService, inventoryService, discountService, quoteService, saleService, orderService, laboratoryService, supplierService, purchaseService, expenseService, payrollService, serviceOrderService, cashService, cashCloseService, notificationService, noteService, dailyActivityService, dashboardRepo, bulkImportService, bulkImportLogRepo, revokedTokenRepo)
	handler.RegisterRoutes(api)

	// ---- Start server ----
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8001"
	}

	logger.Info("server starting", zap.String("port", port), zap.String("env", os.Getenv("APP_ENV")))

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatal("server error", zap.Error(err))
	}
}

func buildLogger() *zap.Logger {
	level := zapcore.InfoLevel
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = zapcore.DebugLevel
	}

	cfg := zap.Config{
		Level:       zap.NewAtomicLevelAt(level),
		Development: os.Getenv("APP_ENV") == "local",
		Encoding:    "json",
		EncoderConfig: zapcore.EncoderConfig{
			TimeKey:        "ts",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "caller",
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeDuration: zapcore.StringDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		},
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	logger, err := cfg.Build()
	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}
	return logger
}
