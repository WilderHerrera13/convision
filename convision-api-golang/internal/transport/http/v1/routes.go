package v1

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
	"github.com/convision/api/internal/platform/opticacache"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

// RegisterRoutes mounts all v1 API routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, opticaCache *opticacache.Cache, globalDB *gorm.DB) {
	// Platform login — no subdomain middleware, always uses platform schema.
	// Allows super admin to log in from app.opticaconvision.com/platform/login.
	platformAuth := rg.Group("/v1/platform/auth")
	{
		platformAuth.POST("/login", h.PlatformLogin)
	}

	v1 := rg.Group("/v1")
	v1.Use(branchmw.TenantFromSubdomain(opticaCache, "app.opticaconvision.com"))

	// Public routes — no authentication required
	auth := v1.Group("/auth")
	{
		auth.POST("/login", h.Login)
	}

	// Guest PDF routes — no authentication required
	guest := v1.Group("/guest")
	{
		guest.GET("/orders/:id/pdf", h.GuestOrderPdf)
		guest.GET("/orders/:id/laboratory-pdf", h.GuestOrderLabPdf)
		guest.GET("/laboratory-orders/:id/pdf", h.GuestLaboratoryOrderPdf)
		guest.GET("/sales/:id/pdf", h.GuestSalePdf)
		guest.GET("/quotes/:id/pdf", h.GuestQuotePdf)
		guest.GET("/clinical-histories/:id/pdf", h.GuestClinicalHistoryPdf)
	}

	// Clinical histories — no auth required (matches Laravel spec)
	histories := v1.Group("/clinical-histories")
	{
		histories.GET("", h.ListClinicalHistories)
		histories.GET("/:id", h.GetClinicalHistory)
		histories.POST("", h.CreateClinicalHistory)
		histories.PUT("/:id", h.UpdateClinicalHistory)
		histories.GET("/:id/evolutions", h.ListClinicalEvolutions)
	}

	// Clinical evolutions — no auth required (matches Laravel spec)
	evolutions := v1.Group("/clinical-evolutions")
	{
		evolutions.GET("/:id", h.GetClinicalEvolution)
		evolutions.POST("", h.CreateClinicalEvolution)
		evolutions.PUT("/:id", h.UpdateClinicalEvolution)
		evolutions.DELETE("/:id", h.DeleteClinicalEvolution)
	}

	// Super admin routes — operate on platform schema, no TenantSchema middleware.
	superAdmin := v1.Group("/super-admin")
	superAdmin.Use(jwtauth.Authenticate(h.revokedTokens, globalDB))
	superAdmin.Use(jwtauth.RequirePermission("super_admin:access"))
	{
		superAdmin.GET("/opticas", h.ListOpticas)
		superAdmin.POST("/opticas", h.CreateOptica)
		superAdmin.GET("/opticas/:id", h.GetOptica)
		superAdmin.PATCH("/opticas/:id", h.UpdateOptica)
		superAdmin.GET("/opticas/:id/features", h.ListOpticaFeatures)
		superAdmin.PUT("/opticas/:id/features", h.BulkUpdateOpticaFeatures)
		superAdmin.PATCH("/opticas/:id/features/:key", h.ToggleOpticaFeature)
		superAdmin.GET("/opticas/:id/admins", h.ListOpticaAdmins)
		superAdmin.POST("/opticas/:id/admins", h.CreateOpticaAdmin)
		superAdmin.DELETE("/opticas/:id/admins/:userId", h.DeleteOpticaAdmin)
		superAdmin.GET("/feature-keys", h.ListFeatureKeys)
		superAdmin.GET("/permissions", h.ListAllPermissionsForSuperAdmin)
		// Optica permission scoping
		superAdmin.GET("/opticas/:id/permissions", h.GetOpticaPermissions)
		superAdmin.PUT("/opticas/:id/permissions", h.UpdateOpticaPermissions)
	}

	// Protected routes — require a valid JWT (revocation-checked) + tenant schema scoping
	protected := v1.Group("/")
	protected.Use(jwtauth.Authenticate(h.revokedTokens, globalDB))
	protected.Use(branchmw.TenantSchema(globalDB))
	{
		// Auth endpoints that require a valid token
		auth := protected.Group("/auth")
		{
			auth.POST("/logout", h.Logout)
			auth.POST("/change-password", h.ChangePassword)
			auth.GET("/me", h.Me)
			auth.POST("/refresh", h.Refresh)
		}

		// Branches — list/get are readable by any authenticated user so the
		// frontend can resolve branch names for chips, filters and switchers.
		// Mutations are still admin-only (branches:manage).
		branchesPublic := protected.Group("/branches")
		{
			branchesPublic.GET("", h.ListBranches)
			branchesPublic.GET("/:id", h.GetBranch)
		}

		branchesAdmin := protected.Group("/branches")
		branchesAdmin.Use(jwtauth.RequirePermission("branches:manage"))
		{
			branchesAdmin.POST("/users/:id/assign", h.AssignUserBranches)
			branchesAdmin.POST("", h.CreateBranch)
			branchesAdmin.PUT("/:id", h.UpdateBranch)
		}

		// Branch-scoped routes: require X-Branch-ID header
		branchScoped := protected.Group("/")
		branchScoped.Use(branchmw.BranchContext(h.branchRepo, globalDB))

		// Users — admin only
		users := protected.Group("/users")
		users.Use(jwtauth.RequirePermission("users:view"))
		{
			users.GET("", h.ListUsers)
			users.GET("/:id", h.GetUser)
			users.POST("", h.CreateUser)
			users.PUT("/:id", h.UpdateUser)
			users.DELETE("/:id", h.DeleteUser)
		}

		// Roles & Permissions — admin only (requires roles_permissions:manage)
		rolesGroup := protected.Group("/roles")
		rolesGroup.Use(jwtauth.RequirePermission("roles_permissions:manage"))
		{
			rolesGroup.GET("", h.ListRoles)
			rolesGroup.POST("", h.CreateRole)
			rolesGroup.GET("/:id", h.GetRole)
			rolesGroup.PUT("/:id", h.UpdateRole)
			rolesGroup.DELETE("/:id", h.DeleteRole)
			rolesGroup.GET("/:id/users", h.GetRoleUsers)
		}

		protected.GET("/permissions",
			jwtauth.RequirePermission("roles_permissions:manage"),
			h.ListAllPermissions,
		)

		userRolesGroup := protected.Group("/users/:id/roles")
		userRolesGroup.Use(jwtauth.RequirePermission("roles_permissions:manage"))
		{
			userRolesGroup.GET("", h.GetUserRoles)
			userRolesGroup.POST("", h.AssignRoleToUser)
			userRolesGroup.DELETE("/:roleId", h.RemoveRoleFromUser)
		}

		protected.GET("/users/:id/permissions",
			jwtauth.RequirePermission("roles_permissions:manage"),
			h.GetUserPermissions,
		)

		// Specialists list — all authenticated roles (needed for appointment creation)
		protected.GET("/specialists", h.ListSpecialists)

		// Patients — all authenticated roles can read; only admin and receptionist can write
		patients := protected.Group("/patients")
		{
			patients.GET("", h.ListPatients)
			patients.GET("/:id", h.GetPatient)
			patients.POST("",
				jwtauth.RequireAnyPermission("patients:create", "patients:edit"),
				h.CreatePatient,
			)
			patients.PUT("/:id",
				jwtauth.RequireAnyPermission("patients:create", "patients:edit"),
				h.UpdatePatient,
			)
			patients.DELETE("/:id",
				jwtauth.RequirePermission("patients:delete"),
				h.DeletePatient,
			)
			// Nested: prescriptions and clinical history for a patient
			patients.GET("/:id/prescriptions", h.ListPatientPrescriptions)
			patients.GET("/:id/clinical-history", h.GetPatientClinicalHistory)
			patients.GET("/:id/records", h.ListClinicalRecords)
			patients.GET("/:id/latest-clinical-record", h.GetPatientLatestClinicalRecord)
			// Longitudinal history — docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md section 11.
			patients.GET("/:id/clinical-records", h.GetPatientClinicalRecordHistory)
		}

		// Prescriptions — all authenticated roles can read; admin and specialist can write
		prescriptions := protected.Group("/prescriptions")
		{
			prescriptions.GET("", h.ListPrescriptions)
			prescriptions.GET("/:id", h.GetPrescription)
			prescriptions.POST("",
				jwtauth.RequireAnyPermission("prescriptions:create", "prescriptions:edit"),
				h.CreatePrescription,
			)
			prescriptions.PUT("/:id",
				jwtauth.RequireAnyPermission("prescriptions:create", "prescriptions:edit"),
				h.UpdatePrescription,
			)
			prescriptions.DELETE("/:id",
				jwtauth.RequirePermission("prescriptions:delete"),
				h.DeletePrescription,
			)
		}

		// Appointments — all authenticated roles (CRUD); take/lens-annotation are specialist-only
		appointments := branchScoped.Group("/appointments")
		{
			appointments.GET("", h.ListAppointments)
			appointments.GET("/available-slots", h.GetAppointmentAvailableSlots)
			appointments.GET("/:id", h.GetAppointment)
			appointments.POST("",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.CreateAppointment,
			)
			appointments.PUT("/:id",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.UpdateAppointment,
			)
			appointments.DELETE("/:id",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.DeleteAppointment,
			)
			appointments.POST("/:id/take",
				jwtauth.RequirePermission("appointments:edit"),
				h.TakeAppointment,
			)
			appointments.POST("/:id/pause",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.PauseAppointment,
			)
			appointments.POST("/:id/resume",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.ResumeAppointment,
			)
			appointments.POST("/:id/annotations",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.SaveAppointmentAnnotations,
			)
			appointments.GET("/:id/lens-annotation",
				jwtauth.RequirePermission("appointments:view"),
				h.GetLensAnnotation,
			)
			appointments.PUT("/:id/lens-annotation",
				jwtauth.RequireAnyPermission("appointments:create", "appointments:edit", "appointments:delete"),
				h.SaveLensAnnotation,
			)

			// Appointment clinical record (specialist-only writes)
			appointments.GET("/:id/clinical-record",
				jwtauth.RequireAnyPermission("clinical_histories:view", "clinical_histories:create"),
				h.GetAppointmentClinicalRecord,
			)
			appointments.POST("/:id/clinical-record",
				jwtauth.RequirePermission("clinical_histories:create"),
				h.CreateAppointmentClinicalRecord,
			)
			appointments.PUT("/:id/clinical-record/anamnesis",
				jwtauth.RequirePermission("clinical_histories:create"),
				h.UpsertAppointmentAnamnesis,
			)
			appointments.PUT("/:id/clinical-record/visual-exam",
				jwtauth.RequirePermission("clinical_histories:create"),
				h.UpsertAppointmentVisualExam,
			)
			appointments.PUT("/:id/clinical-record/diagnosis",
				jwtauth.RequirePermission("clinical_histories:create"),
				h.UpsertAppointmentDiagnosis,
			)
			appointments.PUT("/:id/clinical-record/prescription",
				jwtauth.RequirePermission("clinical_histories:create"),
				h.UpsertAppointmentPrescription,
			)
			appointments.POST("/:id/clinical-record/sign",
				jwtauth.RequirePermission("clinical_histories:create"),
				h.SignAppointmentClinicalRecord,
			)
		}

		// Management report ("Informe de gestión") — specialist writes their own
		// report; admin can read any.
		managementReport := protected.Group("/management-report")
		{
			managementReport.GET("",
				jwtauth.RequireAnyPermission("management_report:view", "management_report:create"),
				h.ListManagementReport,
			)
			managementReport.GET("/:id",
				jwtauth.RequireAnyPermission("management_report:view", "management_report:create"),
				h.GetManagementReport,
			)
			managementReport.POST("/:id",
				jwtauth.RequirePermission("management_report:create"),
				h.SaveManagementReport,
			)
		}

		// Specialist reports — admin-only consolidated and detail views.
		specialistReports := protected.Group("/specialist-reports")
		{
			specialistReports.GET("/consolidated",
				jwtauth.RequireAnyPermission("specialist_reports:view", "specialist_reports:manage"),
				h.GetConsolidatedSpecialistReport,
			)
			specialistReports.GET("/specialists/:id",
				jwtauth.RequireAnyPermission("specialist_reports:view", "specialist_reports:manage"),
				h.GetSpecialistReportDetail,
			)
			specialistReports.POST("/bulk-upload",
				jwtauth.RequireAnyPermission("specialist_reports:view", "specialist_reports:manage"),
				h.UploadBulkExcel,
			)
		}

		// Catalog — read: all roles; write: admin only
		brands := protected.Group("/brands")
		{
			brands.GET("", h.ListBrands)
			brands.GET("/:id", h.GetBrand)
			brands.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateBrand)
			brands.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateBrand)
			brands.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteBrand)
		}

		lensTypes := protected.Group("/lens-types")
		{
			lensTypes.GET("", h.ListLensTypes)
			lensTypes.GET("/:id", h.GetLensType)
			lensTypes.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateLensType)
			lensTypes.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateLensType)
			lensTypes.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteLensType)
		}

		materials := protected.Group("/materials")
		{
			materials.GET("", h.ListMaterials)
			materials.GET("/:id", h.GetMaterial)
			materials.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateMaterial)
			materials.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateMaterial)
			materials.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteMaterial)
		}

		lensClasses := protected.Group("/lens-classes")
		{
			lensClasses.GET("", h.ListLensClasses)
			lensClasses.GET("/:id", h.GetLensClass)
			lensClasses.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateLensClass)
			lensClasses.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateLensClass)
			lensClasses.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteLensClass)
		}

		treatments := protected.Group("/treatments")
		{
			treatments.GET("", h.ListTreatments)
			treatments.GET("/:id", h.GetTreatment)
			treatments.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateTreatment)
			treatments.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateTreatment)
			treatments.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteTreatment)
		}

		photochromics := protected.Group("/photochromics")
		{
			photochromics.GET("", h.ListPhotochromics)
			photochromics.GET("/:id", h.GetPhotochromic)
			photochromics.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreatePhotochromic)
			photochromics.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdatePhotochromic)
			photochromics.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeletePhotochromic)
		}

		paymentMethods := protected.Group("/payment-methods")
		{
			paymentMethods.GET("", h.ListPaymentMethods)
			paymentMethods.GET("/:id", h.GetPaymentMethod)
			paymentMethods.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreatePaymentMethod)
			paymentMethods.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdatePaymentMethod)
			paymentMethods.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeletePaymentMethod)
		}

		// Lookup / Locations — all authenticated roles, read-only
		lookup := protected.Group("/lookup")
		{
			lookup.GET("/patient-data", h.LookupPatientData)
			lookup.GET("/countries", h.LookupCountries)
			lookup.GET("/departments", h.LookupDepartments)
			lookup.GET("/cities", h.LookupCities)
			lookup.GET("/districts", h.LookupDistricts)
		}

		// ICD-10 (CIE-10) catalog — all authenticated roles, read-only.
		// Backs the diagnosis search combobox (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 03/08).
		icd10Codes := protected.Group("/icd10-codes")
		{
			icd10Codes.GET("", h.ListIcd10Codes)
		}

		// RIPS (Resolución 2275/2023) — admin only, compliance/regulatory data.
		// See docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md section 07.
		rips := protected.Group("/rips")
		{
			rips.GET("", jwtauth.RequireRole(domain.RoleAdmin), h.ListRipsRecords)
			rips.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.GetRipsRecord)
			rips.POST("/:id/attach-invoice", jwtauth.RequireRole(domain.RoleAdmin), h.AttachRipsInvoice)
		}

		// Product categories — read: all; write: admin only
		productCategories := protected.Group("/product-categories")
		{
			productCategories.GET("", h.ListProductCategories)
			productCategories.GET("/all", h.ListAllProductCategories)
			productCategories.GET("/products-count", h.ListProductCategoriesWithCount)
			productCategories.GET("/:id", h.GetProductCategory)
			productCategories.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateProductCategory)
			productCategories.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateProductCategory)
			productCategories.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteProductCategory)
		}

		// Alias: categories → product-categories (GOQA-008)
		categories := protected.Group("/categories")
		{
			categories.GET("", h.ListProductCategories)
			categories.GET("/all", h.ListAllProductCategories)
			categories.GET("/products-count", h.ListProductCategoriesWithCount)
			categories.GET("/:id", h.GetProductCategory)
			categories.POST("", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.CreateProductCategory)
			categories.PUT("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.UpdateProductCategory)
			categories.DELETE("/:id", jwtauth.RequireAnyPermission("catalog:create", "catalog:edit", "catalog:delete"), h.DeleteProductCategory)
		}

		// Products — read: all; write: admin only
		products := protected.Group("/products")
		{
			products.GET("", h.ListProducts)
			products.GET("/search", h.SearchProducts)
			products.POST("/bulk-status", jwtauth.RequireAnyPermission("products:create", "products:edit", "products:delete"), h.BulkProductStatus)
			products.POST("/lenses/by-prescription", h.ListLensesByPrescription)
			products.GET("/category/:slug", h.ListProductsByCategory)
			products.POST("", jwtauth.RequireAnyPermission("products:create", "products:edit", "products:delete"), h.CreateProduct)
			products.GET("/:id", h.GetProduct)
			products.PUT("/:id", jwtauth.RequireAnyPermission("products:create", "products:edit", "products:delete"), h.UpdateProduct)
			products.DELETE("/:id", jwtauth.RequireAnyPermission("products:create", "products:edit", "products:delete"), h.DeleteProduct)
			products.GET("/:id/stock", h.GetProductStock)
			products.GET("/:id/discounts", h.GetProductDiscounts)
			products.GET("/:id/discount-info", h.GetProductDiscountInfo)
			products.GET("/:id/active-discounts", h.GetProductActiveDiscounts)
			products.GET("/:id/calculate-price", h.CalculateProductPrice)
			products.GET("/:id/inventory-summary", h.GetProductInventorySummary)
			products.GET("/:id/inventory", h.GetProductInventorySummary)
		}

		// Alias for lens inventory lookups: /lenses/:id/inventory → GetProductInventorySummary
		lenses := protected.Group("/lenses")
		{
			lenses.GET("/:id/inventory", h.GetProductInventorySummary)
		}

		// Warehouses — admin only for write
		warehouses := branchScoped.Group("/warehouses")
		{
			warehouses.GET("", h.ListWarehouses)
			warehouses.GET("/:id", h.GetWarehouse)
			warehouses.GET("/:id/locations", h.GetWarehouseLocations)
			warehouses.POST("", jwtauth.RequireAnyPermission("warehouses:create", "warehouses:edit", "warehouses:delete"), h.CreateWarehouse)
			warehouses.PUT("/:id", jwtauth.RequireAnyPermission("warehouses:create", "warehouses:edit", "warehouses:delete"), h.UpdateWarehouse)
			warehouses.DELETE("/:id", jwtauth.RequireAnyPermission("warehouses:create", "warehouses:edit", "warehouses:delete"), h.DeleteWarehouse)
		}

		// Warehouse locations — admin only for write
		warehouseLocations := branchScoped.Group("/warehouse-locations")
		{
			warehouseLocations.GET("", h.ListWarehouseLocations)
			warehouseLocations.GET("/:id", h.GetWarehouseLocation)
			warehouseLocations.GET("/:id/inventory", h.ListLocationInventoryItems)
			warehouseLocations.POST("", jwtauth.RequireAnyPermission("warehouses:create", "warehouses:edit", "warehouses:delete"), h.CreateWarehouseLocation)
			warehouseLocations.PUT("/:id", jwtauth.RequireAnyPermission("warehouses:create", "warehouses:edit", "warehouses:delete"), h.UpdateWarehouseLocation)
			warehouseLocations.DELETE("/:id", jwtauth.RequireAnyPermission("warehouses:create", "warehouses:edit", "warehouses:delete"), h.DeleteWarehouseLocation)
		}

		// Inventory items — all roles read; admin write
		inventoryItems := branchScoped.Group("/inventory-items")
		{
			inventoryItems.GET("", h.ListInventoryItems)
			inventoryItems.GET("/:id", h.GetInventoryItem)
			inventoryItems.POST("", jwtauth.RequireAnyPermission("inventory:create", "inventory:edit"), h.CreateInventoryItem)
			inventoryItems.PUT("/:id", jwtauth.RequireAnyPermission("inventory:create", "inventory:edit"), h.UpdateInventoryItem)
			inventoryItems.DELETE("/:id", jwtauth.RequireAnyPermission("inventory:create", "inventory:edit"), h.DeleteInventoryItem)
		}

		// Inventory summary and operations (GOQA-010)
		inventoryGroup := branchScoped.Group("/inventory")
		{
			inventoryGroup.GET("", h.ListInventoryItems)
			inventoryGroup.POST("/adjust", jwtauth.RequirePermission("inventory:manage"), h.AdjustInventory)
			inventoryGroup.GET("/total-stock", h.GetTotalStock)
			inventoryGroup.GET("/lens-catalog", h.ListLensCatalog)
			inventoryGroup.POST("/adjustments", jwtauth.RequirePermission("inventory:manage"), h.CreateInventoryAdjustment)
			inventoryGroup.GET("/adjustments", h.ListInventoryAdjustments)
			inventoryGroup.PATCH("/adjustments/:id/approve", jwtauth.RequirePermission("inventory:manage"), h.ApproveInventoryAdjustment)
			inventoryGroup.PATCH("/adjustments/:id/reject", jwtauth.RequirePermission("inventory:manage"), h.RejectInventoryAdjustment)
			inventoryGroup.GET("/movements", h.ListStockMovements)
		}

		// Inventory transfers — admin only for write
		inventoryTransfers := branchScoped.Group("/inventory-transfers")
		{
			inventoryTransfers.GET("", h.ListInventoryTransfers)
			inventoryTransfers.GET("/:id", h.GetInventoryTransfer)
			inventoryTransfers.POST("", jwtauth.RequirePermission("inventory:manage"), h.CreateInventoryTransfer)
			inventoryTransfers.PUT("/:id", jwtauth.RequirePermission("inventory:manage"), h.UpdateInventoryTransfer)
			inventoryTransfers.DELETE("/:id", jwtauth.RequirePermission("inventory:manage"), h.DeleteInventoryTransfer)
			inventoryTransfers.POST("/:id/complete", jwtauth.RequirePermission("inventory:manage"), h.CompleteInventoryTransfer)
			inventoryTransfers.POST("/:id/cancel", jwtauth.RequirePermission("inventory:manage"), h.CancelInventoryTransfer)
		}

		// Discount requests — admin approves; receptionist creates
		discountRequests := protected.Group("/discount-requests")
		{
			discountRequests.GET("", h.ListDiscountRequests)
			discountRequests.GET("/:id", h.GetDiscountRequest)
			discountRequests.POST("",
				jwtauth.RequireAnyPermission("discounts:view", "discounts:create", "discounts:edit"),
				h.CreateDiscountRequest,
			)
			discountRequests.PUT("/:id",
				jwtauth.RequireAnyPermission("discounts:view", "discounts:create", "discounts:edit"),
				h.UpdateDiscountRequest,
			)
			discountRequests.DELETE("/:id", jwtauth.RequireAnyPermission("discounts:delete", "discounts:approve"), h.DeleteDiscountRequest)
			discountRequests.POST("/:id/approve", jwtauth.RequireAnyPermission("discounts:delete", "discounts:approve"), h.ApproveDiscountRequest)
			discountRequests.POST("/:id/reject", jwtauth.RequireAnyPermission("discounts:delete", "discounts:approve"), h.RejectDiscountRequest)
		}

		// Discounts — read: all; best discount lookup (GOQA-011)
		discounts := protected.Group("/discounts")
		{
			discounts.GET("", h.ListActiveDiscounts)
			discounts.GET("/best", h.GetBestDiscount)
		}

		// Active discounts query (legacy)
		protected.GET("/active-discounts", h.ListActiveDiscounts)

		// Promotions — marketing campaigns. Management is admin-only; the evaluate
		// endpoint is available to any authenticated seller for checkout preview.
		protected.POST("/promotions/evaluate", h.EvaluatePromotions)
		promotions := protected.Group("/promotions")
		promotions.Use(jwtauth.RequireRole(domain.RoleAdmin))
		{
			promotions.GET("", h.ListPromotions)
			promotions.GET("/:id", h.GetPromotion)
			promotions.POST("", h.CreatePromotion)
			promotions.PUT("/:id", h.UpdatePromotion)
			promotions.DELETE("/:id", h.DeletePromotion)
		}

		// Quotes — admin and receptionist
		quotes := protected.Group("/quotes")
		{
			quotes.GET("", h.ListQuotes)
			quotes.POST("",
				jwtauth.RequireAnyPermission("quotes:view", "quotes:create", "quotes:edit"),
				h.CreateQuote,
			)
			quotes.GET("/:id", h.GetQuote)
			quotes.PUT("/:id",
				jwtauth.RequireAnyPermission("quotes:view", "quotes:create", "quotes:edit"),
				h.UpdateQuote,
			)
			quotes.DELETE("/:id",
				jwtauth.RequirePermission("quotes:delete"),
				h.DeleteQuote,
			)
			quotes.POST("/:id/status",
				jwtauth.RequireAnyPermission("quotes:view", "quotes:create", "quotes:edit"),
				h.UpdateQuoteStatus,
			)
			quotes.POST("/:id/convert",
				jwtauth.RequireAnyPermission("quotes:view", "quotes:create", "quotes:edit"),
				h.ConvertQuote,
			)
			quotes.GET("/:id/pdf", h.GetQuotePdf)
			quotes.GET("/:id/pdf-token", h.GetQuotePdfToken)
		}

		// Sales — admin and receptionist
		sales := branchScoped.Group("/sales")
		{
			// Static routes BEFORE /:id to avoid conflicts
			sales.GET("/stats", h.GetSaleStats)
			sales.GET("/stats/today", h.GetSaleTodayStats)
			sales.GET("", h.ListSales)
			sales.POST("",
				jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
				h.CreateSale,
			)
			sales.GET("/:id", h.GetSale)
			sales.PUT("/:id",
				jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
				h.UpdateSale,
			)
			sales.DELETE("/:id",
				jwtauth.RequirePermission("sales:delete"),
				h.DeleteSale,
			)
			sales.POST("/:id/payments",
				jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
				h.AddSalePayment,
			)
			sales.POST("/:id/cancel",
				jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
				h.CancelSale,
			)
			sales.POST("/:id/retry-invoicing",
				jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
				h.RetrySaleInvoicing,
			)
			sales.POST("/:id/partial-payments",
				jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
				h.AddSalePartialPayment,
			)
			sales.GET("/:id/partial-payments", h.ListSalePartialPayments)
			sales.GET("/:id/pdf-token", h.GetSalePdfToken)
			sales.GET("/:id/lens-price-adjustments", h.ListLensPriceAdjustments)
			sales.POST("/:id/lens-price-adjustments",
				jwtauth.RequireAnyPermission("sales:edit"),
				h.CreateLensPriceAdjustment,
			)
		}
		// These routes use additional param segments — registered directly to avoid wildcard conflicts
		branchScoped.DELETE("/sales/:id/payments/:paymentId",
			jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
			h.RemoveSalePayment,
		)
		branchScoped.DELETE("/sales/:id/partial-payments/:paymentId",
			jwtauth.RequireAnyPermission("sales:create", "sales:edit"),
			h.RemoveSalePartialPayment,
		)
		branchScoped.DELETE("/sales/:id/lens-price-adjustments/:adjId",
			jwtauth.RequireAnyPermission("sales:edit"),
			h.DeleteLensPriceAdjustment,
		)
		branchScoped.GET("/sales/:id/lenses/:lensId/adjusted-price", h.GetAdjustedLensPrice)

		// Orders — read: all roles; write: admin + specialist
		orders := protected.Group("/orders")
		{
			orders.GET("", h.ListOrders)
			orders.GET("/:id", h.GetOrder)
			orders.POST("",
				jwtauth.RequireAnyPermission("orders:create"),
				h.CreateOrder,
			)
			orders.PUT("/:id",
				jwtauth.RequireAnyPermission("orders:edit"),
				h.UpdateOrder,
			)
			orders.DELETE("/:id",
				jwtauth.RequirePermission("orders:delete"),
				h.DeleteOrder,
			)
			orders.POST("/:id/status",
				jwtauth.RequireAnyPermission("orders:edit"),
				h.UpdateOrderStatus,
			)
			orders.POST("/:id/payment-status",
				jwtauth.RequireAnyPermission("orders:edit"),
				h.UpdateOrderPaymentStatus,
			)
		}

		// Laboratories — admin only for write
		laboratories := protected.Group("/laboratories")
		{
			laboratories.GET("", h.ListLaboratories)
			laboratories.GET("/:id", h.GetLaboratory)
			laboratories.POST("",
				jwtauth.RequireAnyPermission("laboratory:create", "laboratory:edit", "laboratory:delete"),
				h.CreateLaboratory,
			)
			laboratories.PUT("/:id",
				jwtauth.RequireAnyPermission("laboratory:create", "laboratory:edit", "laboratory:delete"),
				h.UpdateLaboratory,
			)
			laboratories.DELETE("/:id",
				jwtauth.RequireAnyPermission("laboratory:create", "laboratory:edit", "laboratory:delete"),
				h.DeleteLaboratory,
			)
		}

		// Laboratory orders — admin + specialist; laboratory role can update status
		labOrders := protected.Group("/laboratory-orders")
		{
			labOrders.GET("/stats", h.GetLaboratoryOrderStats)
			labOrders.GET("", h.ListLaboratoryOrders)
			labOrders.GET("/:id", h.GetLaboratoryOrder)
			labOrders.POST("",
				jwtauth.RequireAnyPermission("laboratory_orders:create", "laboratory_orders:edit"),
				h.CreateLaboratoryOrder,
			)
			labOrders.PUT("/:id",
				jwtauth.RequireAnyPermission("laboratory_orders:create", "laboratory_orders:edit"),
				h.UpdateLaboratoryOrder,
			)
			labOrders.DELETE("/:id",
				jwtauth.RequirePermission("laboratory_orders:delete"),
				h.DeleteLaboratoryOrder,
			)
			labOrders.POST("/:id/status",
				jwtauth.RequireAnyPermission("laboratory_orders:edit"),
				h.UpdateLaboratoryOrderStatus,
			)
			labOrders.POST("/:id/assign",
				jwtauth.RequireAnyPermission("laboratory_orders:assign", "laboratory_orders:manage"),
				h.AssignLaboratoryOrderSpecialist,
			)
			labOrders.GET("/:id/evidence", h.GetLaboratoryOrderEvidence)
			labOrders.POST("/:id/evidence",
				jwtauth.RequireAnyPermission("laboratory_orders:edit"),
				h.UploadLaboratoryOrderEvidence,
			)
			labOrders.GET("/:id/pdf-token", h.GetLaboratoryOrderPdfToken)
		}

		// Portfolio (cartera) — admin + receptionist
		portfolio := protected.Group("/portfolio")
		{
			portfolio.GET("/stats",
				jwtauth.RequireAnyPermission("portfolio:view", "portfolio:manage"),
				h.GetPortfolioStats,
			)
			portfolio.GET("/orders",
				jwtauth.RequireAnyPermission("portfolio:view", "portfolio:manage"),
				h.ListPortfolioOrders,
			)
			portfolio.GET("/orders/:id",
				jwtauth.RequireAnyPermission("portfolio:view", "portfolio:manage"),
				h.GetPortfolioOrder,
			)
			portfolio.POST("/orders/:id/calls",
				jwtauth.RequireAnyPermission("portfolio:view", "portfolio:manage"),
				h.RegisterPortfolioCall,
			)
			portfolio.GET("/orders/:id/calls",
				jwtauth.RequireAnyPermission("portfolio:view", "portfolio:manage"),
				h.GetPortfolioOrderCalls,
			)
			portfolio.POST("/orders/:id/close",
				jwtauth.RequireAnyPermission("portfolio:view", "portfolio:manage"),
				h.ClosePortfolioOrder,
			)
		}

		// Suppliers — read: admin + receptionist; write: admin only
		suppliers := protected.Group("/suppliers")
		{
			suppliers.GET("", jwtauth.RequireAnyPermission("suppliers:view"), h.ListSuppliers)
			suppliers.GET("/:id", jwtauth.RequireAnyPermission("suppliers:view"), h.GetSupplier)
			suppliers.POST("", jwtauth.RequireAnyPermission("suppliers:create", "suppliers:edit", "suppliers:delete"), h.CreateSupplier)
			suppliers.PUT("/:id", jwtauth.RequireAnyPermission("suppliers:create", "suppliers:edit", "suppliers:delete"), h.UpdateSupplier)
			suppliers.DELETE("/:id", jwtauth.RequireAnyPermission("suppliers:create", "suppliers:edit", "suppliers:delete"), h.DeleteSupplier)
		}

		// Purchases — admin + receptionist
		purchases := protected.Group("/purchases")
		{
			purchases.GET("", jwtauth.RequireAnyPermission("purchases:view", "purchases:create", "purchases:edit"), h.ListPurchases)
			purchases.GET("/:id", jwtauth.RequireAnyPermission("purchases:view", "purchases:create", "purchases:edit"), h.GetPurchase)
			purchases.POST("", jwtauth.RequireAnyPermission("purchases:view", "purchases:create", "purchases:edit"), h.CreatePurchase)
			purchases.PUT("/:id", jwtauth.RequireAnyPermission("purchases:view", "purchases:create", "purchases:edit"), h.UpdatePurchase)
			purchases.DELETE("/:id", jwtauth.RequirePermission("purchases:delete"), h.DeletePurchase)
			purchases.POST("/:id/receive", jwtauth.RequireAnyPermission("purchases:view", "purchases:create", "purchases:edit"), h.ReceivePurchase)
		}

		// Expenses — admin + receptionist; delete: admin only
		expenses := protected.Group("/expenses")
		{
			expenses.GET("/stats", jwtauth.RequireAnyPermission("expenses:view", "expenses:create", "expenses:edit"), h.GetExpenseStats)
			expenses.GET("", jwtauth.RequireAnyPermission("expenses:view", "expenses:create", "expenses:edit"), h.ListExpenses)
			expenses.GET("/:id", jwtauth.RequireAnyPermission("expenses:view", "expenses:create", "expenses:edit"), h.GetExpense)
			expenses.POST("", jwtauth.RequireAnyPermission("expenses:view", "expenses:create", "expenses:edit"), h.CreateExpense)
			expenses.PUT("/:id", jwtauth.RequireAnyPermission("expenses:view", "expenses:create", "expenses:edit"), h.UpdateExpense)
			expenses.DELETE("/:id", jwtauth.RequirePermission("expenses:delete"), h.DeleteExpense)
		}

		// Supplier Payments — admin + receptionist (stub endpoint)
		supplierPayments := protected.Group("/supplier-payments")
		{
			supplierPayments.GET("", jwtauth.RequireAnyPermission("suppliers:view"), h.ListSupplierPayments)
		}

		// Payrolls — admin only
		payrolls := protected.Group("/payrolls")
		{
			payrolls.GET("/stats", jwtauth.RequireAnyPermission("payrolls:view", "payrolls:create", "payrolls:edit", "payrolls:delete"), h.GetPayrollStats)
			payrolls.GET("", jwtauth.RequireAnyPermission("payrolls:view", "payrolls:create", "payrolls:edit", "payrolls:delete"), h.ListPayrolls)
			payrolls.GET("/:id", jwtauth.RequireAnyPermission("payrolls:view", "payrolls:create", "payrolls:edit", "payrolls:delete"), h.GetPayroll)
			payrolls.POST("", jwtauth.RequireAnyPermission("payrolls:view", "payrolls:create", "payrolls:edit", "payrolls:delete"), h.CreatePayroll)
			payrolls.PUT("/:id", jwtauth.RequireAnyPermission("payrolls:view", "payrolls:create", "payrolls:edit", "payrolls:delete"), h.UpdatePayroll)
			payrolls.DELETE("/:id", jwtauth.RequireAnyPermission("payrolls:view", "payrolls:create", "payrolls:edit", "payrolls:delete"), h.DeletePayroll)
		}

		// Service Orders — admin + receptionist + specialist
		serviceOrders := protected.Group("/service-orders")
		{
			serviceOrders.GET("/stats", jwtauth.RequireAnyPermission("service_orders:view"), h.GetServiceOrderStats)
			serviceOrders.GET("", jwtauth.RequireAnyPermission("service_orders:view"), h.ListServiceOrders)
			serviceOrders.GET("/:id", jwtauth.RequireAnyPermission("service_orders:view"), h.GetServiceOrder)
			serviceOrders.POST("", jwtauth.RequireAnyPermission("service_orders:create", "service_orders:edit"), h.CreateServiceOrder)
			serviceOrders.PUT("/:id", jwtauth.RequireAnyPermission("service_orders:create", "service_orders:edit"), h.UpdateServiceOrder)
			serviceOrders.DELETE("/:id", jwtauth.RequirePermission("service_orders:delete"), h.DeleteServiceOrder)
		}

		// Cash Transfers — admin + receptionist
		cashTransfers := protected.Group("/cash-transfers")
		{
			cashTransfers.GET("/stats", jwtauth.RequireAnyPermission("cash_transfers:view", "cash_transfers:create", "cash_transfers:edit"), h.GetCashTransferStats)
			cashTransfers.GET("", jwtauth.RequireAnyPermission("cash_transfers:view", "cash_transfers:create", "cash_transfers:edit"), h.ListCashTransfers)
			cashTransfers.GET("/:id", jwtauth.RequireAnyPermission("cash_transfers:view", "cash_transfers:create", "cash_transfers:edit"), h.GetCashTransfer)
			cashTransfers.POST("", jwtauth.RequireAnyPermission("cash_transfers:view", "cash_transfers:create", "cash_transfers:edit"), h.CreateCashTransfer)
			cashTransfers.PUT("/:id", jwtauth.RequireAnyPermission("cash_transfers:view", "cash_transfers:create", "cash_transfers:edit"), h.UpdateCashTransfer)
			cashTransfers.DELETE("/:id", jwtauth.RequireAnyPermission("cash_transfers:delete", "cash_transfers:approve"), h.DeleteCashTransfer)
			cashTransfers.POST("/:id/approve", jwtauth.RequireAnyPermission("cash_transfers:delete", "cash_transfers:approve"), h.ApproveCashTransfer)
			cashTransfers.POST("/:id/cancel", jwtauth.RequireAnyPermission("cash_transfers:view", "cash_transfers:create", "cash_transfers:edit"), h.CancelCashTransfer)
		}

		// Cash Register Closes — admin + specialist + receptionist
		cashRegisterCloses := branchScoped.Group("/cash-register-closes")
		{
			cashRegisterCloses.GET("", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.ListCashRegisterCloses)
			cashRegisterCloses.GET("/:id", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.GetCashRegisterClose)
			cashRegisterCloses.POST("", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.CreateCashRegisterClose)
			cashRegisterCloses.PUT("/:id", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.UpdateCashRegisterClose)
			cashRegisterCloses.POST("/:id/submit", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.SubmitCashRegisterClose)
			cashRegisterCloses.POST("/:id/approve", jwtauth.RequirePermission("cash_close:approve"), h.ApproveCashRegisterClose)
			cashRegisterCloses.POST("/:id/return", jwtauth.RequirePermission("cash_close:approve"), h.ReturnCashRegisterCloseToDraft)
			cashRegisterCloses.POST("/:id/adjust", jwtauth.RequirePermission("cash_close:approve"), h.AdjustCashRegisterClose)
			cashRegisterCloses.GET("/:id/adjustments", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.ListCashRegisterCloseAdjustments)
			cashRegisterCloses.PUT("/:id/admin-actuals", jwtauth.RequirePermission("cash_close:approve"), h.PutCashRegisterCloseAdminActuals)
			cashRegisterCloses.DELETE("/:id", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.DeleteCashRegisterClose)
		}

		// Adjustment acknowledgement lives outside the /:id group to avoid a wildcard
		// route conflict with the static "adjustments" segment.
		branchScoped.POST("/cash-register-close-adjustments/:id/acknowledge", jwtauth.RequireAnyPermission("cash_close:view", "cash_close:create"), h.AcknowledgeCashRegisterCloseAdjustment)

		branchScoped.GET("/cash-register-closes-advisors-pending", jwtauth.RequirePermission("cash_close:view"), h.ListCashRegisterClosesAdvisorsPending)
		branchScoped.GET("/cash-register-closes-calendar", jwtauth.RequirePermission("cash_close:view"), h.GetCashRegisterClosesCalendar)
		branchScoped.GET("/cash-register-closes-consolidated", jwtauth.RequirePermission("cash_close:view"), h.GetCashRegisterClosesConsolidated)
		branchScoped.GET("/cash-register-closes-export", jwtauth.RequirePermission("cash_close:view"), h.ExportCashRegisterCloses)

		// Dashboard — all authenticated roles
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/summary", jwtauth.RequirePermission("dashboard:view"), h.GetDashboardSummary)
		}

		// Admin Notifications — admin only
		adminNotifications := protected.Group("/admin/notifications")
		{
			adminNotifications.GET("/summary", jwtauth.RequirePermission("notifications:manage"), h.GetNotificationSummary)
			adminNotifications.GET("", jwtauth.RequirePermission("notifications:manage"), h.ListNotifications)
			adminNotifications.PATCH("/read-all", jwtauth.RequirePermission("notifications:manage"), h.MarkAllNotificationsRead)
			adminNotifications.PATCH("/:id/read", jwtauth.RequirePermission("notifications:manage"), h.MarkNotificationRead)
			adminNotifications.PATCH("/:id/unread", jwtauth.RequirePermission("notifications:manage"), h.MarkNotificationUnread)
			adminNotifications.PATCH("/:id/archive", jwtauth.RequirePermission("notifications:manage"), h.ArchiveNotification)
			adminNotifications.PATCH("/:id/unarchive", jwtauth.RequirePermission("notifications:manage"), h.UnarchiveNotification)
			adminNotifications.DELETE("/:id", jwtauth.RequirePermission("notifications:manage"), h.DeleteNotification)
		}

		// Notifications — self-scoped inbox for any authenticated user (each caller
		// only ever sees/mutates notifications addressed to them). Reuses the same
		// per-user handlers as the admin group above.
		notifications := protected.Group("/notifications")
		{
			notifications.GET("/summary", h.GetNotificationSummary)
			notifications.GET("", h.ListNotifications)
			notifications.PATCH("/read-all", h.MarkAllNotificationsRead)
			notifications.PATCH("/:id/read", h.MarkNotificationRead)
			notifications.PATCH("/:id/unread", h.MarkNotificationUnread)
			notifications.PATCH("/:id/archive", h.ArchiveNotification)
			notifications.PATCH("/:id/unarchive", h.UnarchiveNotification)
			notifications.DELETE("/:id", h.DeleteNotification)
		}

		// Notes — all authenticated roles; polymorphic /:type/:id/notes
		notes := protected.Group("/:type/:id/notes")
		{
			notes.GET("", jwtauth.RequireAnyPermission("notes:create", "notes:view"), h.ListNotes)
			notes.POST("", jwtauth.RequireAnyPermission("notes:create", "notes:view"), h.CreateNote)
		}

		// Bulk Import — admin only
		// Single polymorphic endpoint: POST /bulk-import  (form field "type" selects the importer)
		// Typed convenience routes are kept for backwards compatibility.
		bulkImportGroup := protected.Group("/bulk-import")
		bulkImportGroup.Use(jwtauth.RequirePermission("bulk_import:manage"))
		{
			bulkImportGroup.POST("", h.BulkImport)
			bulkImportGroup.POST("/patients", h.BulkImportPatients)
			bulkImportGroup.POST("/doctors", h.BulkImportDoctors)
			bulkImportGroup.POST("/scheduled-appointments", h.BulkImportScheduledAppointments)
			bulkImportGroup.POST("/lenses", h.BulkImportLenses)
			bulkImportGroup.POST("/staff-users", h.BulkImportStaffUsers)
			bulkImportGroup.POST("/inventory", h.BulkImportInventory)
			bulkImportGroup.POST("/promotions", h.BulkImportPromotions)
			bulkImportGroup.GET("/history", h.BulkImportHistory)
		}

		// Daily Activity Reports — all authenticated roles
		dailyActivity := branchScoped.Group("/daily-activity-reports")
		{
			dailyActivity.GET("", jwtauth.RequireAnyPermission("daily_reports:view"), h.ListDailyActivityReports)
			dailyActivity.GET("/:id", jwtauth.RequireAnyPermission("daily_reports:view"), h.GetDailyActivityReport)
			dailyActivity.POST("", jwtauth.RequireAnyPermission("daily_reports:create"), h.CreateDailyActivityReport)
			dailyActivity.PUT("/:id", jwtauth.RequireAnyPermission("daily_reports:create"), h.UpdateDailyActivityReport)
			dailyActivity.POST("/:id/close", jwtauth.RequireAnyPermission("daily_reports:create"), h.CloseReport)
			dailyActivity.POST("/:id/reopen", jwtauth.RequirePermission("daily_reports:view"), h.ReopenReport)
			dailyActivity.POST("/quick-attention", jwtauth.RequireAnyPermission("daily_reports:create"), h.QuickAttentionDailyActivity)
			dailyActivity.GET("/:id/edit-logs", jwtauth.RequirePermission("daily_reports:view"), h.GetDailyActivityReportEditLogs)
		}

		invoicing := protected.Group("/invoicing/documents")
		{
			invoicing.GET("", jwtauth.RequireRole(domain.RoleAdmin), h.ListElectronicDocuments)
			invoicing.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.GetElectronicDocument)
			invoicing.GET("/:id/xml", jwtauth.RequireRole(domain.RoleAdmin), h.DownloadElectronicDocumentXML)
			invoicing.POST("/:id/retry", jwtauth.RequireRole(domain.RoleAdmin), h.RetryElectronicDocument)
		}
	}
}
