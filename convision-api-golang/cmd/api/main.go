package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	appointmentsvc "github.com/convision/api/internal/appointment"
	authsvc "github.com/convision/api/internal/auth"
	branchsvc "github.com/convision/api/internal/branch"
	"github.com/convision/api/internal/bulkimport"
	cashsvc "github.com/convision/api/internal/cash"
	cashclosesvc "github.com/convision/api/internal/cashclose"
	catalogsvc "github.com/convision/api/internal/catalog"
	"github.com/convision/api/internal/clinic"
	clinicalrecordsvc "github.com/convision/api/internal/clinicalrecord"
	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	discountsvc "github.com/convision/api/internal/discount"
	expensesvc "github.com/convision/api/internal/expense"
	inventorysvc "github.com/convision/api/internal/inventory"
	labsvc "github.com/convision/api/internal/laboratory"
	locationsvc "github.com/convision/api/internal/location"
	platformmigrations "github.com/convision/api/db/migrations/platform"
	notesvc "github.com/convision/api/internal/note"
	notificationsvc "github.com/convision/api/internal/notification"
	opticasvc "github.com/convision/api/internal/optica"
	ordersvc "github.com/convision/api/internal/order"
	"github.com/convision/api/internal/patient"
	payrollsvc "github.com/convision/api/internal/payroll"
	"github.com/convision/api/internal/platform/featurecache"
	"github.com/convision/api/internal/platform/opticacache"
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
	} else if bootstrapDefaultUsersEnabled() {
		if err := postgresplatform.EnsureLocalDevUsers(db, logger); err != nil {
			logger.Fatal("failed to ensure bootstrap users", zap.Error(err))
		}
	}

	// ---- Platform caches ----
	opticaCache := opticacache.New()
	if err := opticaCache.WarmUp(db); err != nil {
		logger.Fatal("failed to warm up optica cache", zap.Error(err))
	}
	logger.Info("optica cache warmed up", zap.Int("entries", opticaCache.Len()))

	featureCache := featurecache.New(db, 5*time.Minute)
	_ = featureCache // wired to auth service in 16-03

	// ---- Repositories (platform layer) ----
	userRepo := postgresplatform.NewUserRepository()
	patientRepo := postgresplatform.NewPatientRepository()
	appointmentRepo := postgresplatform.NewAppointmentRepository()
	revokedTokenRepo := postgresplatform.NewRevokedTokenRepository()
	prescriptionRepo := postgresplatform.NewPrescriptionRepository()
	clinicalHistoryRepo := postgresplatform.NewClinicalHistoryRepository()
	clinicalEvolutionRepo := postgresplatform.NewClinicalEvolutionRepository()
	clinicalRecordRepo := postgresplatform.NewClinicalRecordRepository()

	// Catalog repos
	brandRepo := postgresplatform.NewBrandRepository()
	lensTypeRepo := postgresplatform.NewLensTypeRepository()
	materialRepo := postgresplatform.NewMaterialRepository()
	lensClassRepo := postgresplatform.NewLensClassRepository()
	treatmentRepo := postgresplatform.NewTreatmentRepository()
	photochromicRepo := postgresplatform.NewPhotochromicRepository()
	paymentMethodRepo := postgresplatform.NewPaymentMethodRepository()

	// Location repo
	locationRepo := postgresplatform.NewLocationRepository()
	patientLookupRepo := postgresplatform.NewPatientLookupRepository()

	// Product repos
	productRepo := postgresplatform.NewProductRepository()
	productCategoryRepo := postgresplatform.NewProductCategoryRepository()

	// Inventory repos
	warehouseRepo := postgresplatform.NewWarehouseRepository()
	warehouseLocationRepo := postgresplatform.NewWarehouseLocationRepository()
	inventoryItemRepo := postgresplatform.NewInventoryItemRepository()
	inventoryTransferRepo := postgresplatform.NewInventoryTransferRepository()
	stockMovementRepo := postgresplatform.NewStockMovementRepository()
	inventoryAdjustmentRepo := postgresplatform.NewInventoryAdjustmentRepository()

	// Discount repo
	discountRepo := postgresplatform.NewDiscountRepository()

	// Quote & Sale repos
	quoteRepo := postgresplatform.NewQuoteRepository()
	saleRepo := postgresplatform.NewSaleRepository()
	saleLensAdjRepo := postgresplatform.NewSaleLensPriceAdjustmentRepository()

	// Order & Laboratory repos
	orderRepo := postgresplatform.NewOrderRepository()
	laboratoryRepo := postgresplatform.NewLaboratoryRepository()
	laboratoryOrderRepo := postgresplatform.NewLaboratoryOrderRepository()
	laboratoryOrderCallRepo := postgresplatform.NewLaboratoryOrderCallRepository()
	laboratoryOrderEvidenceRepo := postgresplatform.NewLaboratoryOrderEvidenceRepository()

	// Supplier, Purchase, Expense repos
	supplierRepo := postgresplatform.NewSupplierRepository()
	purchaseRepo := postgresplatform.NewPurchaseRepository()
	expenseRepo := postgresplatform.NewExpenseRepository()
	payrollRepo := postgresplatform.NewPayrollRepository()
	serviceOrderRepo := postgresplatform.NewServiceOrderRepository()
	cashTransferRepo := postgresplatform.NewCashTransferRepository()
	cashRegisterCloseRepo := postgresplatform.NewCashRegisterCloseRepository()
	notificationRepo := postgresplatform.NewNotificationRepository()
	noteRepo := postgresplatform.NewNoteRepository()
	dailyActivityRepo := postgresplatform.NewDailyActivityRepository()
	dashboardRepo := postgresplatform.NewDashboardRepository()

	// Branch repo
	branchRepo := postgresplatform.NewBranchRepository()

	// Platform repositories (multi-tenancy)
	superAdminRepo := postgresplatform.NewSuperAdminRepository(db)
	opticaRepo := postgresplatform.NewOpticaRepository(db)
	opticaFeatureRepo := postgresplatform.NewOpticaFeatureRepository(db)

	// ---- Services (use-case layer) ----
	authService := authsvc.NewService(db, userRepo, revokedTokenRepo, branchRepo, superAdminRepo, featureCache, logger)
	patientService := patient.NewService(patientRepo, logger)
	userService := usersvc.NewService(userRepo, logger)
	appointmentService := appointmentsvc.NewService(appointmentRepo, logger)
	prescriptionService := prescriptionsvc.NewService(prescriptionRepo, logger)
	clinicService := clinic.NewService(clinicalHistoryRepo, clinicalEvolutionRepo, patientRepo, logger)
	clinicalRecordService := clinicalrecordsvc.NewService(clinicalRecordRepo, logger)
	catalogService := catalogsvc.NewService(
		brandRepo, lensTypeRepo, materialRepo, lensClassRepo,
		treatmentRepo, photochromicRepo, paymentMethodRepo, logger,
	)
	locationService := locationsvc.NewService(locationRepo, patientLookupRepo, logger)
	productService := productsvc.NewService(productRepo, discountRepo, logger)
	categoryService := productsvc.NewCategoryService(productCategoryRepo, logger)
	inventoryService := inventorysvc.NewService(db, warehouseRepo, warehouseLocationRepo, inventoryItemRepo, inventoryTransferRepo, stockMovementRepo, inventoryAdjustmentRepo, logger)
	discountService := discountsvc.NewService(discountRepo, db, logger)
	quoteService := quotesvc.NewService(quoteRepo, saleRepo, logger)
	saleService := salesvc.NewService(db, saleRepo, saleLensAdjRepo, productRepo, laboratoryOrderRepo, laboratoryRepo, appointmentRepo, logger)
	orderService := ordersvc.NewService(orderRepo, logger)
	laboratoryService := labsvc.NewService(laboratoryRepo, laboratoryOrderRepo, laboratoryOrderCallRepo, laboratoryOrderEvidenceRepo, saleRepo, logger)
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
	bulkImportService := bulkimport.NewService(patientRepo, userRepo, branchRepo, appointmentRepo, productRepo, lensTypeRepo, brandRepo, materialRepo, lensClassRepo, treatmentRepo, photochromicRepo, supplierRepo, logger)
	bulkImportLogRepo := postgresplatform.NewBulkImportLogRepository(db)

	// Branch service
	branchService := branchsvc.NewService(branchRepo, logger)

	// Super admin / multi-tenancy services
	opticaService := opticasvc.NewService(opticaRepo, opticaFeatureRepo, featureCache, opticaCache, platformmigrations.FS, db, logger)
	featureService := opticasvc.NewFeatureService(opticaFeatureRepo, featureCache, logger)

	// ---- HTTP Router (Gin) ----
	if os.Getenv("APP_ENV") != "local" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.Recovery(logger))
	router.Use(middleware.Logger(logger))
	router.Use(corsMiddleware())

	// Health-check — publicly accessible
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().UTC()})
	})

	// Serve uploaded files
	uploadPath := os.Getenv("UPLOAD_PATH")
	if uploadPath == "" {
		uploadPath = "./uploads"
	}
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		logger.Warn("could not create upload directory", zap.Error(err))
	}
	router.Static("/uploads", uploadPath)

	// Mount versioned API
	api := router.Group("/api")
	handler := v1.NewHandler(db, authService, branchService, patientService, clinicService, clinicalRecordService, userService, appointmentService, prescriptionService, catalogService, locationService, productService, categoryService, inventoryService, discountService, quoteService, saleService, orderService, laboratoryService, supplierService, purchaseService, expenseService, payrollService, serviceOrderService, cashService, cashCloseService, notificationService, noteService, dailyActivityService, dashboardRepo, bulkImportService, bulkImportLogRepo, revokedTokenRepo, branchRepo, opticaService, featureService)
	handler.RegisterRoutes(api, opticaCache, db)

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

func corsMiddleware() gin.HandlerFunc {
	allowedOriginSuffix := ".app.opticaconvision.com"
	localOrigins := map[string]bool{
		"http://localhost:4300": true,
		"http://localhost:5173": true,
	}
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowed := localOrigins[origin] || strings.HasSuffix(origin, allowedOriginSuffix)
		if extra := os.Getenv("CORS_ALLOWED_ORIGINS"); extra != "" && !allowed {
			for _, o := range strings.Split(extra, ",") {
				if strings.TrimSpace(o) == origin {
					allowed = true
					break
				}
			}
		}
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			requestHeaders := c.Request.Header.Get("Access-Control-Request-Headers")
			if requestHeaders != "" {
				c.Header("Access-Control-Allow-Headers", requestHeaders)
			} else {
				c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Branch-ID, Cache-Control, Pragma, Expires, X-Requested-With")
			}
			c.Header("Access-Control-Max-Age", "86400")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func bootstrapDefaultUsersEnabled() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("BOOTSTRAP_DEFAULT_USERS")))
	return v == "1" || v == "true" || v == "yes"
}
