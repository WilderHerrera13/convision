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

	authsvc "github.com/convision/api/internal/auth"
	appointmentsvc "github.com/convision/api/internal/appointment"
	catalogsvc "github.com/convision/api/internal/catalog"
	"github.com/convision/api/internal/clinic"
	discountsvc "github.com/convision/api/internal/discount"
	expensesvc "github.com/convision/api/internal/expense"
	inventorysvc "github.com/convision/api/internal/inventory"
	labsvc "github.com/convision/api/internal/laboratory"
	locationsvc "github.com/convision/api/internal/location"
	ordersvc "github.com/convision/api/internal/order"
	"github.com/convision/api/internal/patient"
	prescriptionsvc "github.com/convision/api/internal/prescription"
	productsvc "github.com/convision/api/internal/product"
	purchasesvc "github.com/convision/api/internal/purchase"
	quotesvc "github.com/convision/api/internal/quote"
	salesvc "github.com/convision/api/internal/sale"
	suppliersvc "github.com/convision/api/internal/supplier"
	payrollsvc "github.com/convision/api/internal/payroll"
	serviceordersvc "github.com/convision/api/internal/serviceorder"
	cashsvc "github.com/convision/api/internal/cash"
	notificationsvc "github.com/convision/api/internal/notification"
	notesvc "github.com/convision/api/internal/note"
	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	mysqlplatform "github.com/convision/api/internal/platform/storage/mysql"
	usersvc "github.com/convision/api/internal/user"
	"github.com/convision/api/internal/transport/http/middleware"
	v1 "github.com/convision/api/internal/transport/http/v1"
)

func main() {
	// Load environment variables from .env (ignored in production if not present)
	_ = godotenv.Load()

	logger := buildLogger()
	defer logger.Sync() //nolint:errcheck

	// ---- Database ----
	db, err := mysqlplatform.Open(logger)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	if os.Getenv("APP_ENV") == "local" {
		if err := mysqlplatform.Migrate(db); err != nil {
			logger.Fatal("auto-migration failed", zap.Error(err))
		}
	}

	// ---- Repositories (platform layer) ----
	userRepo := mysqlplatform.NewUserRepository(db)
	patientRepo := mysqlplatform.NewPatientRepository(db)
	appointmentRepo := mysqlplatform.NewAppointmentRepository(db)
	revokedTokenRepo := mysqlplatform.NewRevokedTokenRepository(db)
	prescriptionRepo := mysqlplatform.NewPrescriptionRepository(db)
	clinicalHistoryRepo := mysqlplatform.NewClinicalHistoryRepository(db)
	clinicalEvolutionRepo := mysqlplatform.NewClinicalEvolutionRepository(db)

	// Catalog repos
	brandRepo := mysqlplatform.NewBrandRepository(db)
	lensTypeRepo := mysqlplatform.NewLensTypeRepository(db)
	materialRepo := mysqlplatform.NewMaterialRepository(db)
	lensClassRepo := mysqlplatform.NewLensClassRepository(db)
	treatmentRepo := mysqlplatform.NewTreatmentRepository(db)
	photochromicRepo := mysqlplatform.NewPhotochromicRepository(db)
	paymentMethodRepo := mysqlplatform.NewPaymentMethodRepository(db)

	// Location repo
	locationRepo := mysqlplatform.NewLocationRepository(db)

	// Product repos
	productRepo := mysqlplatform.NewProductRepository(db)
	productCategoryRepo := mysqlplatform.NewProductCategoryRepository(db)

	// Inventory repos
	warehouseRepo := mysqlplatform.NewWarehouseRepository(db)
	warehouseLocationRepo := mysqlplatform.NewWarehouseLocationRepository(db)
	inventoryItemRepo := mysqlplatform.NewInventoryItemRepository(db)
	inventoryTransferRepo := mysqlplatform.NewInventoryTransferRepository(db)

	// Discount repo
	discountRepo := mysqlplatform.NewDiscountRepository(db)

	// Quote & Sale repos
	quoteRepo := mysqlplatform.NewQuoteRepository(db)
	saleRepo := mysqlplatform.NewSaleRepository(db)
	saleLensAdjRepo := mysqlplatform.NewSaleLensPriceAdjustmentRepository(db)

	// Order & Laboratory repos
	orderRepo := mysqlplatform.NewOrderRepository(db)
	laboratoryRepo := mysqlplatform.NewLaboratoryRepository(db)
	laboratoryOrderRepo := mysqlplatform.NewLaboratoryOrderRepository(db)

	// Supplier, Purchase, Expense repos
	supplierRepo := mysqlplatform.NewSupplierRepository(db)
	purchaseRepo := mysqlplatform.NewPurchaseRepository(db)
	expenseRepo := mysqlplatform.NewExpenseRepository(db)
	payrollRepo := mysqlplatform.NewPayrollRepository(db)
	serviceOrderRepo := mysqlplatform.NewServiceOrderRepository(db)
	cashTransferRepo := mysqlplatform.NewCashTransferRepository(db)
	notificationRepo := mysqlplatform.NewNotificationRepository(db)
	noteRepo := mysqlplatform.NewNoteRepository(db)
	dailyActivityRepo := mysqlplatform.NewDailyActivityRepository(db)
	dashboardRepo := mysqlplatform.NewDashboardRepository(db)

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
	locationService := locationsvc.NewService(locationRepo, logger)
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
	notificationService := notificationsvc.NewService(notificationRepo, logger)
	noteService := notesvc.NewService(noteRepo, logger)
	dailyActivityService := dailyactivitysvc.NewService(dailyActivityRepo, logger)

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
	handler := v1.NewHandler(authService, patientService, clinicService, userService, appointmentService, prescriptionService, catalogService, locationService, productService, categoryService, inventoryService, discountService, quoteService, saleService, orderService, laboratoryService, supplierService, purchaseService, expenseService, payrollService, serviceOrderService, cashService, notificationService, noteService, dailyActivityService, dashboardRepo, revokedTokenRepo)
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
