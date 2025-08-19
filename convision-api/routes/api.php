<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\LensTypeController;
use App\Http\Controllers\Api\V1\MaterialController;
use App\Http\Controllers\Api\V1\LensClassController;
use App\Http\Controllers\Api\V1\TreatmentController;
use App\Http\Controllers\Api\V1\PhotochromicController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\PatientController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\PrescriptionController;
use App\Http\Controllers\Api\V1\LensNoteController;
use App\Http\Controllers\Api\V1\NoteController;
use App\Http\Controllers\Api\V1\WarehouseController;
use App\Http\Controllers\Api\V1\WarehouseLocationController;
use App\Http\Controllers\Api\V1\InventoryItemController;
use App\Http\Controllers\Api\V1\InventoryTransferController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\OrderPDFController;
use App\Http\Controllers\Api\V1\LaboratoryController;
use App\Http\Controllers\Api\V1\LaboratoryOrderController;
use App\Http\Controllers\Api\V1\LaboratoryOrderPDFController;
use App\Http\Controllers\Api\V1\DiscountRequestController;
use App\Http\Controllers\Api\V1\ClinicalHistoryController;
use App\Http\Controllers\Api\V1\ClinicalEvolutionController;
use App\Http\Controllers\Api\V1\LocationController;
use App\Http\Controllers\Api\V1\PatientLookupController;
use App\Http\Controllers\Api\V1\SalesController;
use App\Http\Controllers\Api\V1\SalePDFController;
use App\Http\Controllers\Api\V1\PaymentMethodController;
use App\Http\Controllers\Api\V1\GuestPDFController;
use App\Http\Controllers\Api\V1\QuotesController;
use App\Http\Controllers\Api\V1\PartialPaymentController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ProductCategoryController;
use App\Http\Controllers\Api\V1\ProductImportController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\PayrollController;
use App\Http\Controllers\Api\V1\ServiceOrderController;
use App\Http\Controllers\Api\V1\CashTransferController;
use App\Http\Controllers\Api\V1\SaleLensPriceAdjustmentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::prefix('v1')->group(function () {
    // Auth routes
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::middleware('jwt.auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
        });
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });

    // User routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    // Lens routes (Old - to be removed)
    // Route::middleware('auth:api')->group(function () {
    //     Route::apiResource('lenses', LensController::class);
    //     Route::post('lenses/bulk-upload', [LensController::class, 'bulkUpload']);
    //     Route::post('/lenses/import', [LensImportController::class, 'import']);
    // });

    // Brand routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('brands', BrandController::class);
    });

    // Lens Type routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('lens-types', LensTypeController::class);
    });

    // Material routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('materials', MaterialController::class);
    });

    // Lens Class routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('lens-classes', LensClassController::class);
    });

    // Treatment routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('treatments', TreatmentController::class);
    });

    // Photochromic routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('photochromics', PhotochromicController::class);
    });

    // Supplier routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('suppliers', SupplierController::class);
    });

    // Laboratory routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('laboratories', LaboratoryController::class);
    });

    // Laboratory Order routes
    Route::middleware('auth:api')->group(function () {
        Route::get('laboratory-orders/stats', [LaboratoryOrderController::class, 'stats']);
        Route::apiResource('laboratory-orders', LaboratoryOrderController::class);
        Route::post('laboratory-orders/{id}/status', [LaboratoryOrderController::class, 'updateStatus']);
    });

    // Patient routes
    Route::middleware(['auth:api', 'role:admin|specialist|receptionist'])->group(function () {
        Route::apiResource('patients', PatientController::class);
        Route::post('patients/{id}/restore', [PatientController::class, 'restore']);
        Route::post('patients/{id}/profile-image', [PatientController::class, 'uploadProfileImage']);
    });

    // Appointment routes
    Route::middleware(['auth:api', 'role:admin|specialist|receptionist'])->group(function () {
        Route::apiResource('appointments', AppointmentController::class);
        Route::post('appointments/{id}/take', [AppointmentController::class, 'takeAppointment']);
        Route::post('appointments/{id}/pause', [AppointmentController::class, 'pauseAppointment']);
        Route::post('appointments/{id}/resume', [AppointmentController::class, 'resumeAppointment']);
        Route::post('appointments/{id}/annotations', [AppointmentController::class, 'saveAnnotations']);
        Route::post('appointments/{id}/lens-annotation', [AppointmentController::class, 'uploadLensAnnotation']);
        Route::get('appointments/{id}/lens-annotation', [AppointmentController::class, 'getLensAnnotation']);
    });
    
    // Prescription routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('prescriptions', PrescriptionController::class);
        Route::post('prescriptions/{id}/annotation', [PrescriptionController::class, 'uploadAnnotation']);
        Route::get('prescriptions/{id}/annotation', [PrescriptionController::class, 'getAnnotation']);
    });

    // Notes Routes
    Route::middleware('auth:api')->group(function () {
        Route::get('{type}/{id}/notes', [NoteController::class, 'index']);
        Route::post('{type}/{id}/notes', [NoteController::class, 'store']);
    });
    
    // Order routes
    Route::apiResource('orders', OrderController::class);
    Route::post('orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('orders/{order}/payment-status', [OrderController::class, 'updatePaymentStatus']);
    Route::get('orders/{id}/pdf', [OrderController::class, 'downloadPdf']);
    Route::get('orders/{id}/pdf-download', [OrderPDFController::class, 'generateFromToken']);
    Route::get('orders/{id}/laboratory-pdf', [LaboratoryOrderPDFController::class, 'generate']);
    Route::get('orders/{id}/laboratory-pdf-download', [LaboratoryOrderPDFController::class, 'generateFromToken']);
    
    // Sales routes
    Route::get('sales/stats', [SalesController::class, 'stats']);
    Route::get('sales/stats/today', [SalesController::class, 'todayStats']);
    Route::apiResource('sales', SalesController::class);
    Route::post('sales/{id}/payments', [SalesController::class, 'addPayment']);
    Route::delete('sales/{id}/payments/{paymentId}', [SalesController::class, 'removePayment']);
    Route::post('sales/{id}/cancel', [SalesController::class, 'cancel']);
    Route::get('sales/{id}/pdf', [SalesController::class, 'downloadPdf']);
    Route::get('sales/{id}/pdf-token', [SalesController::class, 'generatePdfToken']);
    Route::get('sales/{id}/pdf-download', [SalePDFController::class, 'generateFromToken']);
    
    // Sale Lens Price Adjustments routes
    Route::get('sales/{sale}/lens-price-adjustments', [SaleLensPriceAdjustmentController::class, 'index']);
    Route::post('sales/{sale}/lens-price-adjustments', [SaleLensPriceAdjustmentController::class, 'store']);
    Route::get('sales/{sale}/lens-price-adjustments/{adjustment}', [SaleLensPriceAdjustmentController::class, 'show']);
    Route::delete('sales/{sale}/lens-price-adjustments/{adjustment}', [SaleLensPriceAdjustmentController::class, 'destroy']);
    Route::get('sales/{sale}/lenses/{lens}/adjusted-price', [SaleLensPriceAdjustmentController::class, 'getAdjustedPrice']);
    
    // Partial Payments (Abonos) routes
    Route::get('sales/{saleId}/partial-payments', [PartialPaymentController::class, 'index']);
    Route::post('sales/{saleId}/partial-payments', [PartialPaymentController::class, 'store']);
    Route::get('partial-payments/{id}', [PartialPaymentController::class, 'show']);
    Route::delete('sales/{saleId}/partial-payments/{paymentId}', [PartialPaymentController::class, 'destroy']);
    
    // Quotes routes
    Route::apiResource('quotes', QuotesController::class);
    Route::post('quotes/{id}/status', [QuotesController::class, 'updateStatus']);
    Route::post('quotes/{id}/convert', [QuotesController::class, 'convertToSale']);
    Route::get('quotes/{id}/pdf', [QuotesController::class, 'generatePdf']);
    
    // Payment methods routes
    Route::apiResource('payment-methods', PaymentMethodController::class);
    
    // Inventory Routes
    Route::middleware('auth:api')->group(function () {
        // Warehouse routes
        Route::apiResource('warehouses', WarehouseController::class);
        Route::get('warehouses/{warehouse}/locations', [WarehouseController::class, 'locations']);
        
        // Warehouse Location routes
        Route::apiResource('warehouse-locations', WarehouseLocationController::class);
        Route::get('warehouse-locations/{location}/inventory', [WarehouseLocationController::class, 'inventoryItems']);
        
        // Inventory Item routes
        Route::apiResource('inventory-items', InventoryItemController::class);
        Route::get('inventory/total-stock', [InventoryItemController::class, 'totalStock']);
        Route::get('products/{product}/inventory-summary', [InventoryItemController::class, 'productInventory']);
        
        // Inventory Transfer routes
        Route::apiResource('inventory-transfers', InventoryTransferController::class);
    });

    // Discount routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('discount-requests', DiscountRequestController::class);
        Route::post('discount-requests/{discount_request}/approve', [DiscountRequestController::class, 'approve']);
        Route::post('discount-requests/{discount_request}/reject', [DiscountRequestController::class, 'reject']);
        Route::get('active-discounts', [DiscountRequestController::class, 'activeDiscounts']);
    });

    // Location lookup routes
    Route::middleware('auth:api')->group(function () {
        Route::get('lookup/countries', [LocationController::class, 'countries']);
        Route::get('lookup/departments', [LocationController::class, 'departments']);
        Route::get('lookup/cities', [LocationController::class, 'cities']);
        Route::get('lookup/districts', [LocationController::class, 'districts']);
    });
    
    // Patient lookup routes
    Route::middleware('auth:api')->group(function () {
        Route::get('lookup/identification-types', [PatientLookupController::class, 'identificationTypes']);
        Route::get('lookup/health-insurance-providers', [PatientLookupController::class, 'healthInsuranceProviders']);
        Route::get('lookup/affiliation-types', [PatientLookupController::class, 'affiliationTypes']);
        Route::get('lookup/coverage-types', [PatientLookupController::class, 'coverageTypes']);
        Route::get('lookup/education-levels', [PatientLookupController::class, 'educationLevels']);
        Route::get('lookup/patient-data', [PatientLookupController::class, 'all']);
    });

    // Clinical History routes
    Route::get('clinical-histories', [ClinicalHistoryController::class, 'index']);
    Route::post('clinical-histories', [ClinicalHistoryController::class, 'store']);
    Route::get('clinical-histories/{id}', [ClinicalHistoryController::class, 'show']);
    Route::put('clinical-histories/{id}', [ClinicalHistoryController::class, 'update']);
    Route::get('patients/{patientId}/clinical-history', [ClinicalHistoryController::class, 'patientHistory']);
    
    // Clinical Evolution routes
    Route::get('clinical-histories/{historyId}/evolutions', [ClinicalEvolutionController::class, 'index']);
    Route::post('clinical-evolutions', [ClinicalEvolutionController::class, 'store']);
    Route::get('clinical-evolutions/{id}', [ClinicalEvolutionController::class, 'show']);
    Route::put('clinical-evolutions/{id}', [ClinicalEvolutionController::class, 'update']);
    Route::delete('clinical-evolutions/{id}', [ClinicalEvolutionController::class, 'destroy']);
    Route::post('appointments/{appointmentId}/evolution', [ClinicalEvolutionController::class, 'createFromAppointment']);
    
    // Guest PDF routes - no authentication required, using token-based security
    Route::get('guest/orders/{id}/pdf', [GuestPDFController::class, 'downloadOrderPdf']);
    Route::get('guest/orders/{id}/laboratory-pdf', [GuestPDFController::class, 'downloadLaboratoryOrderPdf']);
    Route::get('guest/laboratory-orders/{id}/pdf', [GuestPDFController::class, 'downloadLaboratoryOrderDirectPdf']);
    Route::get('guest/sales/{id}/pdf', [GuestPDFController::class, 'downloadSalePdf']);
    Route::get('guest/quotes/{id}/pdf', [GuestPDFController::class, 'downloadQuotePdf']);
    Route::get('guest/clinical-histories/{id}/pdf', [GuestPDFController::class, 'downloadClinicalHistoryPdf']);

    // Product routes
    Route::middleware('auth:api')->group(function () {
        Route::post('products/import', [ProductImportController::class, 'import']);
        Route::get('products/search', [ProductController::class, 'search']);
        Route::get('products/category/{categorySlug}', [ProductController::class, 'category']);
        Route::get('products/lenses/by-prescription', [ProductController::class, 'lensesByPrescription']);
        Route::post('products/bulk-status', [ProductController::class, 'bulkUpdateStatus']);
        Route::get('products/{product}/stock', [ProductController::class, 'stock']);
        Route::get('products/{product}/discounts', [ProductController::class, 'discounts']);
        Route::get('products/{product}/inventory', [ProductController::class, 'inventory']);
        Route::get('products/{product}/discount-info', [ProductController::class, 'discountInfo']);
        Route::get('products/{product}/active-discounts', [ProductController::class, 'activeDiscounts']);
        Route::get('products/{product}/calculate-price', [ProductController::class, 'calculatePrice']);
        Route::apiResource('products', ProductController::class);
    });

    // Product Category routes
    Route::middleware('auth:api')->group(function () {
        Route::get('product-categories/all', [ProductCategoryController::class, 'all']);
        Route::get('product-categories/products-count', [ProductCategoryController::class, 'productsCount']);
        Route::apiResource('product-categories', ProductCategoryController::class);
    });

    // Purchase routes
    Route::middleware('auth:api')->group(function () {
        Route::apiResource('purchases', PurchaseController::class);
        Route::post('purchases/calculate-totals', [PurchaseController::class, 'calculateTotals']);
        Route::post('purchases/{purchase}/payments', [PurchaseController::class, 'addPayment']);
    });

    // Expense routes
    Route::middleware('auth:api')->group(function () {
        Route::get('expenses/stats', [ExpenseController::class, 'stats']);
        Route::apiResource('expenses', ExpenseController::class);
        Route::post('expenses/{expense}/payments', [ExpenseController::class, 'addPayment']);
    });

    // Payroll routes
    Route::middleware('auth:api')->group(function () {
        Route::get('payrolls/stats', [PayrollController::class, 'stats']);
        Route::post('payrolls/calculate', [PayrollController::class, 'calculatePayroll']);
        Route::apiResource('payrolls', PayrollController::class);
    });

    // Service Order routes (Orden Arreglo)
    Route::middleware('auth:api')->group(function () {
        Route::get('service-orders/stats', [ServiceOrderController::class, 'stats']);
        Route::post('service-orders/{serviceOrder}/status', [ServiceOrderController::class, 'updateStatus']);
        Route::apiResource('service-orders', ServiceOrderController::class);
    });

    // Cash Transfer routes (Trasladar Efectivo)
    Route::middleware('auth:api')->group(function () {
        Route::get('cash-transfers/stats', [CashTransferController::class, 'stats']);
        Route::post('cash-transfers/{cashTransfer}/approve', [CashTransferController::class, 'approve']);
        Route::post('cash-transfers/{cashTransfer}/cancel', [CashTransferController::class, 'cancel']);
        Route::apiResource('cash-transfers', CashTransferController::class);
    });
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
