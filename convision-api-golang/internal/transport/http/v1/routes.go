package v1

import (
	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

// RegisterRoutes mounts all v1 API routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	v1 := rg.Group("/v1")

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

	// Protected routes — require a valid JWT (revocation-checked)
	protected := v1.Group("/")
	protected.Use(jwtauth.Authenticate(h.revokedTokens))
	{
		// Auth endpoints that require a valid token
		auth := protected.Group("/auth")
		{
			auth.POST("/logout", h.Logout)
			auth.GET("/me", h.Me)
			auth.POST("/refresh", h.Refresh)
		}

		// Branches — admin only for management (no branch context required)
		branchesAdmin := protected.Group("/branches")
		branchesAdmin.Use(jwtauth.RequireRole(domain.RoleAdmin))
		{
			branchesAdmin.GET("", h.ListBranches)
			branchesAdmin.GET("/:id", h.GetBranch)
			branchesAdmin.POST("", h.CreateBranch)
			branchesAdmin.PUT("/:id", h.UpdateBranch)
			branchesAdmin.POST("/users/:id/assign", h.AssignUserBranches)
		}

		// Branch-scoped routes: require X-Branch-ID header
		branchScoped := protected.Group("/")
		branchScoped.Use(branchmw.BranchContext(h.branchRepo))

		// Users — admin only
		users := protected.Group("/users")
		users.Use(jwtauth.RequireRole(domain.RoleAdmin))
		{
			users.GET("", h.ListUsers)
			users.GET("/:id", h.GetUser)
			users.POST("", h.CreateUser)
			users.PUT("/:id", h.UpdateUser)
			users.DELETE("/:id", h.DeleteUser)
		}

		// Specialists list — all authenticated roles (needed for appointment creation)
		protected.GET("/specialists", h.ListSpecialists)

		// Patients — all authenticated roles can read; only admin and receptionist can write
		patients := protected.Group("/patients")
		{
			patients.GET("", h.ListPatients)
			patients.GET("/:id", h.GetPatient)
			patients.POST("",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.CreatePatient,
			)
			patients.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UpdatePatient,
			)
			patients.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.DeletePatient,
			)
			// Nested: prescriptions and clinical history for a patient
			patients.GET("/:id/prescriptions", h.ListPatientPrescriptions)
			patients.GET("/:id/clinical-history", h.GetPatientClinicalHistory)
			patients.GET("/:id/records", h.ListClinicalRecords)
		}

		// Prescriptions — all authenticated roles can read; admin and specialist can write
		prescriptions := protected.Group("/prescriptions")
		{
			prescriptions.GET("", h.ListPrescriptions)
			prescriptions.GET("/:id", h.GetPrescription)
			prescriptions.POST("",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.CreatePrescription,
			)
			prescriptions.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.UpdatePrescription,
			)
			prescriptions.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
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
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.CreateAppointment,
			)
			appointments.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.UpdateAppointment,
			)
			appointments.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.DeleteAppointment,
			)
			appointments.POST("/:id/take",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.TakeAppointment,
			)
			appointments.POST("/:id/pause",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.PauseAppointment,
			)
			appointments.POST("/:id/resume",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.ResumeAppointment,
			)
			appointments.POST("/:id/annotations",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.SaveAppointmentAnnotations,
			)
			appointments.GET("/:id/lens-annotation",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.GetLensAnnotation,
			)

			// Appointment clinical record (specialist-only writes)
			appointments.GET("/:id/clinical-record",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.GetAppointmentClinicalRecord,
			)
			appointments.POST("/:id/clinical-record",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.CreateAppointmentClinicalRecord,
			)
			appointments.PUT("/:id/clinical-record/anamnesis",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.UpsertAppointmentAnamnesis,
			)
			appointments.PUT("/:id/clinical-record/visual-exam",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.UpsertAppointmentVisualExam,
			)
			appointments.PUT("/:id/clinical-record/diagnosis",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.UpsertAppointmentDiagnosis,
			)
			appointments.PUT("/:id/clinical-record/prescription",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.UpsertAppointmentPrescription,
			)
			appointments.POST("/:id/clinical-record/sign",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.SignAppointmentClinicalRecord,
			)
		}

		// Management report ("Informe de gestión") — specialist writes their own
		// report; admin can read any.
		managementReport := protected.Group("/management-report")
		{
			managementReport.GET("",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.ListManagementReport,
			)
			managementReport.GET("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.GetManagementReport,
			)
			managementReport.POST("/:id",
				jwtauth.RequireRole(domain.RoleSpecialist),
				h.SaveManagementReport,
			)
		}

		// Specialist reports — admin-only consolidated and detail views.
		specialistReports := protected.Group("/specialist-reports")
		{
			specialistReports.GET("/consolidated",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.GetConsolidatedSpecialistReport,
			)
			specialistReports.GET("/specialists/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.GetSpecialistReportDetail,
			)
			specialistReports.POST("/bulk-upload",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.UploadBulkExcel,
			)
		}

		// Catalog — read: all roles; write: admin only
		brands := protected.Group("/brands")
		{
			brands.GET("", h.ListBrands)
			brands.GET("/:id", h.GetBrand)
			brands.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateBrand)
			brands.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateBrand)
			brands.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteBrand)
		}

		lensTypes := protected.Group("/lens-types")
		{
			lensTypes.GET("", h.ListLensTypes)
			lensTypes.GET("/:id", h.GetLensType)
			lensTypes.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateLensType)
			lensTypes.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateLensType)
			lensTypes.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteLensType)
		}

		materials := protected.Group("/materials")
		{
			materials.GET("", h.ListMaterials)
			materials.GET("/:id", h.GetMaterial)
			materials.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateMaterial)
			materials.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateMaterial)
			materials.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteMaterial)
		}

		lensClasses := protected.Group("/lens-classes")
		{
			lensClasses.GET("", h.ListLensClasses)
			lensClasses.GET("/:id", h.GetLensClass)
			lensClasses.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateLensClass)
			lensClasses.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateLensClass)
			lensClasses.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteLensClass)
		}

		treatments := protected.Group("/treatments")
		{
			treatments.GET("", h.ListTreatments)
			treatments.GET("/:id", h.GetTreatment)
			treatments.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateTreatment)
			treatments.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateTreatment)
			treatments.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteTreatment)
		}

		photochromics := protected.Group("/photochromics")
		{
			photochromics.GET("", h.ListPhotochromics)
			photochromics.GET("/:id", h.GetPhotochromic)
			photochromics.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreatePhotochromic)
			photochromics.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdatePhotochromic)
			photochromics.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeletePhotochromic)
		}

		paymentMethods := protected.Group("/payment-methods")
		{
			paymentMethods.GET("", h.ListPaymentMethods)
			paymentMethods.GET("/:id", h.GetPaymentMethod)
			paymentMethods.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreatePaymentMethod)
			paymentMethods.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdatePaymentMethod)
			paymentMethods.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeletePaymentMethod)
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

		// Product categories — read: all; write: admin only
		productCategories := protected.Group("/product-categories")
		{
			productCategories.GET("", h.ListProductCategories)
			productCategories.GET("/all", h.ListAllProductCategories)
			productCategories.GET("/products-count", h.ListProductCategoriesWithCount)
			productCategories.GET("/:id", h.GetProductCategory)
			productCategories.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateProductCategory)
			productCategories.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateProductCategory)
			productCategories.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteProductCategory)
		}

		// Alias: categories → product-categories (GOQA-008)
		categories := protected.Group("/categories")
		{
			categories.GET("", h.ListProductCategories)
			categories.GET("/all", h.ListAllProductCategories)
			categories.GET("/products-count", h.ListProductCategoriesWithCount)
			categories.GET("/:id", h.GetProductCategory)
			categories.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateProductCategory)
			categories.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateProductCategory)
			categories.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteProductCategory)
		}

		// Products — read: all; write: admin only
		products := protected.Group("/products")
		{
			products.GET("", h.ListProducts)
			products.GET("/search", h.SearchProducts)
			products.POST("/bulk-status", jwtauth.RequireRole(domain.RoleAdmin), h.BulkProductStatus)
			products.POST("/lenses/by-prescription", h.ListLensesByPrescription)
			products.GET("/category/:slug", h.ListProductsByCategory)
			products.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateProduct)
			products.GET("/:id", h.GetProduct)
			products.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateProduct)
			products.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteProduct)
			products.GET("/:id/stock", h.GetProductStock)
			products.GET("/:id/discounts", h.GetProductDiscounts)
			products.GET("/:id/discount-info", h.GetProductDiscountInfo)
			products.GET("/:id/active-discounts", h.GetProductActiveDiscounts)
			products.GET("/:id/calculate-price", h.CalculateProductPrice)
			products.GET("/:id/inventory-summary", h.GetProductInventorySummary)
			products.GET("/:id/inventory", h.GetProductInventorySummary)
		}

		// Warehouses — admin only for write
		warehouses := branchScoped.Group("/warehouses")
		{
			warehouses.GET("", h.ListWarehouses)
			warehouses.GET("/:id", h.GetWarehouse)
			warehouses.GET("/:id/locations", h.GetWarehouseLocations)
			warehouses.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateWarehouse)
			warehouses.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateWarehouse)
			warehouses.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteWarehouse)
		}

		// Warehouse locations — admin only for write
		warehouseLocations := branchScoped.Group("/warehouse-locations")
		{
			warehouseLocations.GET("", h.ListWarehouseLocations)
			warehouseLocations.GET("/:id", h.GetWarehouseLocation)
			warehouseLocations.GET("/:id/inventory", h.ListLocationInventoryItems)
			warehouseLocations.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateWarehouseLocation)
			warehouseLocations.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateWarehouseLocation)
			warehouseLocations.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteWarehouseLocation)
		}

		// Inventory items — all roles read; admin write
		inventoryItems := branchScoped.Group("/inventory-items")
		{
			inventoryItems.GET("", h.ListInventoryItems)
			inventoryItems.GET("/:id", h.GetInventoryItem)
			inventoryItems.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateInventoryItem)
			inventoryItems.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateInventoryItem)
			inventoryItems.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteInventoryItem)
		}

		// Inventory summary and operations (GOQA-010)
		inventoryGroup := branchScoped.Group("/inventory")
		{
			inventoryGroup.GET("", h.ListInventoryItems)
			inventoryGroup.POST("/adjust", jwtauth.RequireRole(domain.RoleAdmin), h.AdjustInventory)
			inventoryGroup.GET("/total-stock", h.GetTotalStock)
			inventoryGroup.GET("/lens-catalog", h.ListLensCatalog)
			inventoryGroup.POST("/adjustments", jwtauth.RequireRole(domain.RoleAdmin), h.CreateInventoryAdjustment)
			inventoryGroup.GET("/adjustments", h.ListInventoryAdjustments)
			inventoryGroup.PATCH("/adjustments/:id/approve", jwtauth.RequireRole(domain.RoleAdmin), h.ApproveInventoryAdjustment)
			inventoryGroup.PATCH("/adjustments/:id/reject", jwtauth.RequireRole(domain.RoleAdmin), h.RejectInventoryAdjustment)
			inventoryGroup.GET("/movements", h.ListStockMovements)
		}

		// Inventory transfers — admin only for write
		inventoryTransfers := branchScoped.Group("/inventory-transfers")
		{
			inventoryTransfers.GET("", h.ListInventoryTransfers)
			inventoryTransfers.GET("/:id", h.GetInventoryTransfer)
			inventoryTransfers.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateInventoryTransfer)
			inventoryTransfers.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateInventoryTransfer)
			inventoryTransfers.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteInventoryTransfer)
			inventoryTransfers.POST("/:id/complete", jwtauth.RequireRole(domain.RoleAdmin), h.CompleteInventoryTransfer)
			inventoryTransfers.POST("/:id/cancel", jwtauth.RequireRole(domain.RoleAdmin), h.CancelInventoryTransfer)
		}

		// Discount requests — admin approves; receptionist creates
		discountRequests := protected.Group("/discount-requests")
		{
			discountRequests.GET("", h.ListDiscountRequests)
			discountRequests.GET("/:id", h.GetDiscountRequest)
			discountRequests.POST("",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.CreateDiscountRequest,
			)
			discountRequests.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UpdateDiscountRequest,
			)
			discountRequests.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteDiscountRequest)
			discountRequests.POST("/:id/approve", jwtauth.RequireRole(domain.RoleAdmin), h.ApproveDiscountRequest)
			discountRequests.POST("/:id/reject", jwtauth.RequireRole(domain.RoleAdmin), h.RejectDiscountRequest)
		}

		// Discounts — read: all; best discount lookup (GOQA-011)
		discounts := protected.Group("/discounts")
		{
			discounts.GET("", h.ListActiveDiscounts)
			discounts.GET("/best", h.GetBestDiscount)
		}

		// Active discounts query (legacy)
		protected.GET("/active-discounts", h.ListActiveDiscounts)

		// Quotes — admin and receptionist
		quotes := protected.Group("/quotes")
		{
			quotes.GET("", h.ListQuotes)
			quotes.POST("",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.CreateQuote,
			)
			quotes.GET("/:id", h.GetQuote)
			quotes.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UpdateQuote,
			)
			quotes.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.DeleteQuote,
			)
			quotes.POST("/:id/status",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UpdateQuoteStatus,
			)
			quotes.POST("/:id/convert",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
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
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.CreateSale,
			)
			sales.GET("/:id", h.GetSale)
			sales.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UpdateSale,
			)
			sales.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.DeleteSale,
			)
			sales.POST("/:id/payments",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.AddSalePayment,
			)
			sales.POST("/:id/cancel",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.CancelSale,
			)
			sales.GET("/:id/pdf-token", h.GetSalePdfToken)
			sales.GET("/:id/lens-price-adjustments", h.ListLensPriceAdjustments)
			sales.POST("/:id/lens-price-adjustments",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.CreateLensPriceAdjustment,
			)
		}
		// These routes use additional param segments — registered directly to avoid wildcard conflicts
		branchScoped.DELETE("/sales/:id/payments/:paymentId",
			jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
			h.RemoveSalePayment,
		)
		branchScoped.DELETE("/sales/:id/lens-price-adjustments/:adjId",
			jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
			h.DeleteLensPriceAdjustment,
		)
		branchScoped.GET("/sales/:id/lenses/:lensId/adjusted-price", h.GetAdjustedLensPrice)

		// Orders — read: all roles; write: admin + specialist
		orders := protected.Group("/orders")
		{
			orders.GET("", h.ListOrders)
			orders.GET("/:id", h.GetOrder)
			orders.POST("",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.CreateOrder,
			)
			orders.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.UpdateOrder,
			)
			orders.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.DeleteOrder,
			)
			orders.POST("/:id/status",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
				h.UpdateOrderStatus,
			)
			orders.POST("/:id/payment-status",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UpdateOrderPaymentStatus,
			)
		}

		// Laboratories — admin only for write
		laboratories := protected.Group("/laboratories")
		{
			laboratories.GET("", h.ListLaboratories)
			laboratories.GET("/:id", h.GetLaboratory)
			laboratories.POST("",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.CreateLaboratory,
			)
			laboratories.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.UpdateLaboratory,
			)
			laboratories.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
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
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.CreateLaboratoryOrder,
			)
			labOrders.PUT("/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
				h.UpdateLaboratoryOrder,
			)
			labOrders.DELETE("/:id",
				jwtauth.RequireRole(domain.RoleAdmin),
				h.DeleteLaboratoryOrder,
			)
			labOrders.POST("/:id/status",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleLaboratory, domain.RoleReceptionist),
				h.UpdateLaboratoryOrderStatus,
			)
			labOrders.GET("/:id/evidence", h.GetLaboratoryOrderEvidence)
			labOrders.POST("/:id/evidence",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.UploadLaboratoryOrderEvidence,
			)
			labOrders.GET("/:id/pdf-token", h.GetLaboratoryOrderPdfToken)
		}

		// Portfolio (cartera) — admin + receptionist
		portfolio := protected.Group("/portfolio")
		{
			portfolio.GET("/stats",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.GetPortfolioStats,
			)
			portfolio.GET("/orders",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.ListPortfolioOrders,
			)
			portfolio.GET("/orders/:id",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.GetPortfolioOrder,
			)
			portfolio.POST("/orders/:id/calls",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.RegisterPortfolioCall,
			)
			portfolio.GET("/orders/:id/calls",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.GetPortfolioOrderCalls,
			)
			portfolio.POST("/orders/:id/close",
				jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
				h.ClosePortfolioOrder,
			)
		}

		// Suppliers — read: admin + receptionist; write: admin only
		suppliers := protected.Group("/suppliers")
		{
			suppliers.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.ListSuppliers)
			suppliers.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.GetSupplier)
			suppliers.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreateSupplier)
			suppliers.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdateSupplier)
			suppliers.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteSupplier)
		}

		// Purchases — admin + receptionist
		purchases := protected.Group("/purchases")
		{
			purchases.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.ListPurchases)
			purchases.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.GetPurchase)
			purchases.POST("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.CreatePurchase)
			purchases.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.UpdatePurchase)
			purchases.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeletePurchase)
			purchases.POST("/:id/receive", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.ReceivePurchase)
		}

		// Expenses — admin + receptionist; delete: admin only
		expenses := protected.Group("/expenses")
		{
			expenses.GET("/stats", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.GetExpenseStats)
			expenses.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.ListExpenses)
			expenses.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.GetExpense)
			expenses.POST("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.CreateExpense)
			expenses.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.UpdateExpense)
			expenses.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteExpense)
		}

		// Supplier Payments — admin + receptionist (stub endpoint)
		supplierPayments := protected.Group("/supplier-payments")
		{
			supplierPayments.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.ListSupplierPayments)
		}

		// Payrolls — admin only
		payrolls := protected.Group("/payrolls")
		{
			payrolls.GET("/stats", jwtauth.RequireRole(domain.RoleAdmin), h.GetPayrollStats)
			payrolls.GET("", jwtauth.RequireRole(domain.RoleAdmin), h.ListPayrolls)
			payrolls.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.GetPayroll)
			payrolls.POST("", jwtauth.RequireRole(domain.RoleAdmin), h.CreatePayroll)
			payrolls.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.UpdatePayroll)
			payrolls.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeletePayroll)
		}

		// Service Orders — admin + receptionist + specialist
		serviceOrders := protected.Group("/service-orders")
		{
			serviceOrders.GET("/stats", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist, domain.RoleSpecialist), h.GetServiceOrderStats)
			serviceOrders.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist, domain.RoleSpecialist), h.ListServiceOrders)
			serviceOrders.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist, domain.RoleSpecialist), h.GetServiceOrder)
			serviceOrders.POST("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.CreateServiceOrder)
			serviceOrders.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.UpdateServiceOrder)
			serviceOrders.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteServiceOrder)
		}

		// Cash Transfers — admin + receptionist
		cashTransfers := protected.Group("/cash-transfers")
		{
			cashTransfers.GET("/stats", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.GetCashTransferStats)
			cashTransfers.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.ListCashTransfers)
			cashTransfers.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.GetCashTransfer)
			cashTransfers.POST("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.CreateCashTransfer)
			cashTransfers.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.UpdateCashTransfer)
			cashTransfers.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteCashTransfer)
			cashTransfers.POST("/:id/approve", jwtauth.RequireRole(domain.RoleAdmin), h.ApproveCashTransfer)
			cashTransfers.POST("/:id/cancel", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist), h.CancelCashTransfer)
		}

		// Cash Register Closes — admin + specialist + receptionist
		cashRegisterCloses := branchScoped.Group("/cash-register-closes")
		{
			cashRegisterCloses.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.ListCashRegisterCloses)
			cashRegisterCloses.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.GetCashRegisterClose)
			cashRegisterCloses.POST("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.CreateCashRegisterClose)
			cashRegisterCloses.PUT("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.UpdateCashRegisterClose)
			cashRegisterCloses.POST("/:id/submit", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.SubmitCashRegisterClose)
			cashRegisterCloses.POST("/:id/approve", jwtauth.RequireRole(domain.RoleAdmin), h.ApproveCashRegisterClose)
			cashRegisterCloses.POST("/:id/return", jwtauth.RequireRole(domain.RoleAdmin), h.ReturnCashRegisterCloseToDraft)
			cashRegisterCloses.PUT("/:id/admin-actuals", jwtauth.RequireRole(domain.RoleAdmin), h.PutCashRegisterCloseAdminActuals)
		}

		branchScoped.GET("/cash-register-closes-advisors-pending", jwtauth.RequireRole(domain.RoleAdmin), h.ListCashRegisterClosesAdvisorsPending)
		branchScoped.GET("/cash-register-closes-calendar", jwtauth.RequireRole(domain.RoleAdmin), h.GetCashRegisterClosesCalendar)
		branchScoped.GET("/cash-register-closes-consolidated", jwtauth.RequireRole(domain.RoleAdmin), h.GetCashRegisterClosesConsolidated)

		// Dashboard — all authenticated roles
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/summary", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.GetDashboardSummary)
		}

		// Admin Notifications — admin only
		adminNotifications := protected.Group("/admin/notifications")
		{
			adminNotifications.GET("/summary", jwtauth.RequireRole(domain.RoleAdmin), h.GetNotificationSummary)
			adminNotifications.GET("", jwtauth.RequireRole(domain.RoleAdmin), h.ListNotifications)
			adminNotifications.PATCH("/read-all", jwtauth.RequireRole(domain.RoleAdmin), h.MarkAllNotificationsRead)
			adminNotifications.PATCH("/:id/read", jwtauth.RequireRole(domain.RoleAdmin), h.MarkNotificationRead)
			adminNotifications.PATCH("/:id/unread", jwtauth.RequireRole(domain.RoleAdmin), h.MarkNotificationUnread)
			adminNotifications.PATCH("/:id/archive", jwtauth.RequireRole(domain.RoleAdmin), h.ArchiveNotification)
			adminNotifications.PATCH("/:id/unarchive", jwtauth.RequireRole(domain.RoleAdmin), h.UnarchiveNotification)
			adminNotifications.DELETE("/:id", jwtauth.RequireRole(domain.RoleAdmin), h.DeleteNotification)
		}

		// Notes — all authenticated roles; polymorphic /:type/:id/notes
		notes := protected.Group("/:type/:id/notes")
		{
			notes.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.ListNotes)
			notes.POST("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.CreateNote)
		}

		// Bulk Import — admin only
		// Single polymorphic endpoint: POST /bulk-import  (form field "type" selects the importer)
		// Typed convenience routes are kept for backwards compatibility.
		bulkImportGroup := protected.Group("/bulk-import")
		bulkImportGroup.Use(jwtauth.RequireRole(domain.RoleAdmin))
		{
			bulkImportGroup.POST("", h.BulkImport)
			bulkImportGroup.POST("/patients", h.BulkImportPatients)
			bulkImportGroup.POST("/doctors", h.BulkImportDoctors)
			bulkImportGroup.POST("/scheduled-appointments", h.BulkImportScheduledAppointments)
			bulkImportGroup.POST("/lenses", h.BulkImportLenses)
			bulkImportGroup.GET("/history", h.BulkImportHistory)
		}

		// Daily Activity Reports — all authenticated roles
		dailyActivity := branchScoped.Group("/daily-activity-reports")
		{
			dailyActivity.GET("", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.ListDailyActivityReports)
			dailyActivity.GET("/:id", jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist), h.GetDailyActivityReport)
			dailyActivity.POST("", jwtauth.RequireRole(domain.RoleSpecialist, domain.RoleReceptionist), h.CreateDailyActivityReport)
			dailyActivity.PUT("/:id", jwtauth.RequireRole(domain.RoleSpecialist, domain.RoleReceptionist), h.UpdateDailyActivityReport)
			dailyActivity.POST("/:id/close", jwtauth.RequireRole(domain.RoleSpecialist, domain.RoleReceptionist), h.CloseReport)
			dailyActivity.POST("/:id/reopen", jwtauth.RequireRole(domain.RoleAdmin), h.ReopenReport)
			dailyActivity.POST("/quick-attention", jwtauth.RequireRole(domain.RoleSpecialist, domain.RoleReceptionist), h.QuickAttentionDailyActivity)
		}
	}
}
