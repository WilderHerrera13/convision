# Phase 21 Research: Standardize Backend Filter Pattern

**Date:** 2026-05-07
**Status:** Research complete
**Author:** Claude Code (research agent)

---

## 1. parseApiFilters() — Location, Signature, and All Callers

### Definition

File: `convision-api-golang/internal/transport/http/v1/handler.go` (lines 712–737)

```go
// parseApiFilters parses s_f/s_v query params (JSON arrays) into a filters map.
// When s_o=or is present it adds the special key "_or_mode"="true" so repositories
// can apply OR logic instead of AND across the provided fields.
func parseApiFilters(c *gin.Context) map[string]any {
    sf := c.Query("s_f")   // JSON array of field names, e.g. ["status","patient_id"]
    sv := c.Query("s_v")   // JSON array of values,      e.g. ["active","42"]
    if sf == "" || sv == "" {
        return nil
    }
    var fields, values []string
    if err := json.Unmarshal([]byte(sf), &fields); err != nil { return nil }
    if err := json.Unmarshal([]byte(sv), &values); err != nil { return nil }
    filters := make(map[string]any, len(fields)+1)
    for i, f := range fields {
        if i < len(values) { filters[f] = values[i] }
    }
    if c.Query("s_o") == "or" {
        filters["_or_mode"] = "true"
    }
    return filters
}
```

**Returns:** `map[string]any` or `nil` if either `s_f`/`s_v` is absent.

### All Direct Callers

| Handler file | Handler function | Notes |
|---|---|---|
| `handler.go` | `ListPatients` | Patient search, passes to `patient.List()` |
| `handler_appointment.go` | `parseAppointmentApiFilters()` | Wraps `parseApiFilters`, adds direct `status` param |
| `handler_prescription.go` | `ListPrescriptions` | `appointment_id` lookup via s_f/s_v |
| `handler_clinical.go` | `ListClinicalHistories` | `patient_id`, `created_by` lookup |
| `handler_finance.go` | `ListSuppliers` | Supplier text search |
| `handler_finance.go` | `ListPurchases` | Purchase filter |
| `handler_finance.go` | `ListExpenses` | Expense filter |
| `handler_t9.go` | `ListPayrolls` | Payroll filter |
| `handler_t9.go` | `ListServiceOrders` | Service order filter |
| `handler_t9.go` | `ListCashTransfers` | Cash transfer filter |

### Indirect Callers (via parseAppointmentApiFilters)

| Handler file | Handler function |
|---|---|
| `handler_appointment.go` | `ListAppointments` |

---

## 2. c.Query() Call Inventory by Handler File

This table covers every raw `c.Query()` / `c.DefaultQuery()` call used for filter/sort/search logic (pagination `page`/`per_page` is counted separately).

### handler.go (patients + users)

| Handler | Query params used |
|---|---|
| `ListPatients` | `page`, `per_page`, `s_f`, `s_v`, `s_o` (via `parseApiFilters`) |
| `ListUsers` | `page`, `per_page`, `branch_id` |

### handler_appointment.go

| Handler | Query params used |
|---|---|
| `ListAppointments` | `page`, `per_page`, `s_f`, `s_v`, `s_o`, `status`, `start_date`, `end_date` |
| `GetAvailableSlots` | `specialist_id`, `date` |

### handler_clinical.go

| Handler | Query params used |
|---|---|
| `ListClinicalHistories` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |
| `ListClinicalRecords` | `page`, `per_page` |
| `ListClinicalEvolutions` | `page`, `per_page` |

### handler_prescription.go

| Handler | Query params used |
|---|---|
| `ListPrescriptions` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |

### handler_finance.go

| Handler | Query params used |
|---|---|
| `ListSuppliers` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |
| `ListPurchases` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |
| `ListExpenses` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |

### handler_t9.go

| Handler | Query params used |
|---|---|
| `ListPayrolls` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |
| `ListServiceOrders` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |
| `ListCashTransfers` | `page`, `per_page`, `s_f`, `s_v`, `s_o` |

### handler_inventory.go

| Handler | Query params used |
|---|---|
| `ListWarehouses` | `page`, `per_page`, `status` |
| `ListWarehouseLocations` | `page`, `per_page`, `warehouse_id`, `status` |
| `ListInventoryItems` | `page`, `per_page`, `product_id`, `warehouse_id`, `warehouse_location_id`, `status` |
| `GetTotalStock` | `page`, `per_page`, `warehouse_id`, `warehouse_location_id`, `brand_id`, `supplier_id`, `category_id` |
| `ListLensCatalog` | `page`, `per_page`, `brand_id`, `supplier_id`, `status`, `search`, `sphere_od`, `cylinder_od`, `addition_od`, `sphere_os`, `cylinder_os`, `addition_os` |
| `ListInventoryTransfers` | `page`, `per_page`, `status` |
| `ListInventoryAdjustments` | `page`, `per_page`, `status` |
| `ListStockMovements` | `page`, `per_page`, `product_id`, `warehouse_id`, `movement_type` |

### handler_product.go

| Handler | Query params used |
|---|---|
| `ListProducts` | `page`, `per_page`, `status`, `product_category_id`, `brand_id`, `supplier_id`, `search` |
| `SearchProducts` | `q`, `category` |
| `ListProductsByCategory` | dynamic attribute keys (sphere_od, cylinder_od, etc.) |
| `ListByPrescription` (inline) | `patient_id` |

### handler_sale.go

| Handler | Query params used |
|---|---|
| `ListSales` | `page`, `per_page`, `patient_id`, `status`, `payment_status` |

### handler_order.go

| Handler | Query params used |
|---|---|
| `ListOrders` | `page`, `per_page`, `patient_id`, `status`, `payment_status`, `laboratory_id` |

### handler_quote.go

| Handler | Query params used |
|---|---|
| `ListQuotes` | `page`, `per_page`, `patient_id`, `status` |

### handler_laboratory.go

| Handler | Query params used |
|---|---|
| `ListLaboratories` | `page`, `per_page`, `status` |
| `ListLaboratoryOrders` | `page`, `per_page`, `patient_id`, `laboratory_id`, `status`, `priority`, `assigned_uid`, `branch_id` |
| `GetLaboratoryOrderTransitions` | `transition_type` |

### handler_cash_register_close.go

| Handler | Query params used |
|---|---|
| `ListCashRegisterCloses` | `page`, `per_page`, `status`, `user_id`, `close_date`, `date_from`, `date_to` |
| `GetConsolidated` | `date_from`, `date_to` |
| `GetCalendarForAdvisor` | `user_id`, `date_from`, `date_to` |

### handler_discount.go

| Handler | Query params used |
|---|---|
| `ListDiscounts` | `status`, `product_id` |
| `GetBestDiscount` | `product_id`, `lens_id`, `patient_id` |
| `GetBestLensDiscount` | `lens_id`, `patient_id` |

### handler_role.go

| Handler | Query params used |
|---|---|
| `ListRoles` | `page`, `per_page`, `name` |

### handler_bulk_import.go

| Handler | Query params used |
|---|---|
| `ListBulkImports` | `type`, `page`, `per_page` |

### handler_portfolio.go

| Handler | Query params used |
|---|---|
| `ListPortfolio` | `page`, `per_page`, `search` |

### handler_specialist_report.go

| Handler | Query params used |
|---|---|
| `GetSpecialistSummary` | `from`, `to`, `specialist_ids`, `branch_id` |
| `ListSpecialistAppointments` | `from`, `to`, `page`, `per_page`, `search` |

### handler_management_report.go

| Handler | Query params used |
|---|---|
| `ListManagementReport` | `page`, `per_page`, `specialist_id`, `status`, `branch_id`, `search`, `start_date`, `end_date`, `consultation_type`, `pending_report` |

### handler_t10.go

| Handler | Query params used |
|---|---|
| `ListNotifications` | `page`, `per_page`, `archived`, `unread` |
| `ListDailyActivityReports` | `page`, `per_page`, `user_id`, `date_from`, `date_to`, `status` |

### handler_location.go

| Handler | Query params used |
|---|---|
| `ListDepartments` | `country_id` |
| `ListCities` | `department_id` |
| `ListNeighborhoods` | `city_id` |

### handler_optica.go

| Handler | Query params used |
|---|---|
| `ListOpticas` | `page`, `per_page` |

### handler_guest_pdf.go

| Handler | Query params used |
|---|---|
| (all PDF handlers) | `token` (auth, not a filter) |

---

## 3. filterAllowlist Inventory in postgres/ Repositories

All 25 discovered allowlist maps, with their fields:

| Repository file | Variable name | Type | Fields |
|---|---|---|---|
| `appointment_repository.go` | `appointmentFilterAllowlist` | `map[string]bool` | `branch_id`, `status`, `patient_id`, `specialist_id`, `taken_by_id`, `consultation_type` |
| `cash_register_close_repository.go` | `cashRegisterCloseFilterAllowlist` | `map[string]bool` | `branch_id`, `user_id`, `status`, `close_date`, `date_from`, `date_to` |
| `cash_transfer_repository.go` | `cashTransferFilterAllowlist` | `map[string]bool` | `status`, `type` |
| `clinical_history_repository.go` | `allowedFilters` (inline) | `map[string]bool` | `patient_id`, `created_by` |
| `discount_repository.go` | `discountFilterAllowlist` | `map[string]bool` | `status`, `product_id`, `patient_id`, `user_id`, `is_global` |
| `expense_repository.go` | `expenseFilterAllowlist` | `map[string]string` | `supplier_id=`, `status=`, `payment_method_id=` |
| `inventory_item_repository.go` | `inventoryItemFilterAllowlist` | `map[string]bool` | `branch_id`, `product_id`, `warehouse_id`, `warehouse_location_id`, `status` |
| `inventory_item_repository.go` | `totalStockItemFilterAllowlist` | `map[string]bool` | `warehouse_id`, `warehouse_location_id` |
| `inventory_item_repository.go` | `totalStockProductFilterAllowlist` | `map[string]bool` | (exact fields — see source) |
| `inventory_transfer_repository.go` | `inventoryTransferFilterAllowlist` | `map[string]bool` | `status`, `product_id`, `source_location_id`, `destination_location_id`, `transferred_by` |
| `laboratory_repository.go` | `laboratoryFilterAllowlist` | `map[string]bool` | `status` |
| `laboratory_repository.go` | `laboratoryOrderFilterAllowlist` | `map[string]bool` | `patient_id`, `laboratory_id`, `status`, `priority`, `created_by`, `order_id`, `sale_id`, `branch` |
| `lens_repository.go` | `lensFilterAllowlist` | `map[string]bool` | `status`, `type_id`, `brand_id`, `material_id`, `lens_class_id`, `treatment_id`, `supplier_id` |
| `order_repository.go` | `orderFilterAllowlist` | `map[string]bool` | `patient_id`, `status`, `payment_status`, `created_by`, `laboratory_id` |
| `patient_repository.go` | `patientFilterAllowlist` | `map[string]string` | `first_name=ILIKE`, `last_name=ILIKE`, `email=ILIKE`, `phone=ILIKE`, `identification=ILIKE`, `status==`, `gender==` |
| `payroll_repository.go` | `payrollFilterAllowlist` | `map[string]bool` | `status`, `employee_position` |
| `prescription_repository.go` | `prescriptionFilterAllowlist` | `map[string]bool` | `appointment_id`, `correction_type`, `usage_type` |
| `product_category_repository.go` | `productCategoryFilterAllowlist` | `map[string]bool` | `is_active` |
| `product_repository.go` | `productFilterAllowlist` | `map[string]bool` | `status`, `product_category_id`, `brand_id`, `supplier_id`, `product_type`, `tracks_stock`, `internal_code` |
| `purchase_repository.go` | `purchaseFilterAllowlist` | `map[string]string` | `supplier_id=`, `payment_status=` |
| `quote_repository.go` | `quoteFilterAllowlist` | `map[string]bool` | `patient_id`, `status`, `created_by` |
| `role_repository.go` | (inline) | — | `name` (direct if-check) |
| `sale_repository.go` | `saleFilterAllowlist` | `map[string]bool` | `branch_id`, `patient_id`, `status`, `payment_status`, `created_by`, `order_id` |
| `service_order_repository.go` | `serviceOrderFilterAllowlist` | `map[string]bool` | `status`, `supplier_id`, `priority` |
| `supplier_repository.go` | `supplierFilterAllowlist` | `map[string]string` | `name=ILIKE`, `nit=ILIKE`, `email=ILIKE`, `phone=ILIKE`, `person_type==` |
| `user_repository.go` | `allowedUserFilters` | `map[string]string` | `name=LIKE`, `last_name=LIKE`, `email=LIKE`, `identification=LIKE`, `phone=LIKE`, `role_type==` |
| `warehouse_location_repository.go` | `warehouseLocationFilterAllowlist` | `map[string]bool` | `warehouse_id`, `status`, `type` |
| `warehouse_repository.go` | `warehouseFilterAllowlist` | `map[string]bool` | `branch_id`, `status` |

**Notable:** Two map types are used: `map[string]bool` (simple existence check; uses exact `=` match), and `map[string]string` (maps column to operator: `=`, `ILIKE`, `LIKE`). Some repos use neither and handle filters with explicit `if v, ok := filters[k]; ok` switch cases.

---

## 4. Existing Domain Filter/Pagination Structs

Only one named Filter struct exists in domain today:

```go
// internal/domain/product.go
type PrescriptionFilter struct {
    SphereOD   *float64 `json:"sphere_od"`
    CylinderOD *float64 `json:"cylinder_od"`
    AdditionOD *float64 `json:"addition_od"`
    SphereOS   *float64 `json:"sphere_os"`
    CylinderOS *float64 `json:"cylinder_os"`
    AdditionOS *float64 `json:"addition_os"`
}
```

This is used by `ProductRepository.ListByPrescription()` — already typed, not part of the `map[string]any` pattern. It is a good model for what the new Filter structs should look like.

No `Pagination`, `PageInput`, or `ListFilter` base structs exist anywhere. Pagination is always passed as raw `page int, perPage int` parameters. A shared `domain.Pagination` base struct would be a useful addition.

---

## 5. Repository Signature Analysis

The current universal signature for list methods is:

```go
List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*T, int64, error)
```

This is codified in all domain interfaces. Exceptions:

| Repository | Signature deviation |
|---|---|
| `LensTypeRepository.List` | No filters: `(db, page, perPage)` |
| `LensClassRepository.List` | No filters: `(db, page, perPage)` |
| `MaterialRepository.List` | No filters: `(db, page, perPage)` |
| `TreatmentRepository.List` | No filters: `(db, page, perPage)` |
| `PhotochromicRepository.List` | No filters: `(db, page, perPage)` |
| `PaymentMethodRepository.List` | No filters: `(db, page, perPage)` |
| `BrandRepository.List` | No filters: `(db, page, perPage)` |
| `NoteRepository.List` | `(db, noteableType, noteableID, page, perPage)` — entity-scoped |
| `BulkImportLogRepository.List` | `(db, importType, page, perPage)` — typed param |
| `SuperAdminRepository.List` | `(page, perPage)` — no db, no filters |
| `OpticaRepository.List` | `(page, perPage)` — no db, no filters |
| `SaleService.List` | `(filters map[string]any, page, perPage)` — no db (service carries db) |
| `CashRegisterCloseService.List` | `(db, filters, page, perPage, role, userID)` — role-scoped |

All mocks mirror the `map[string]any` signature, meaning a signature change requires updating all mock files.

---

## 6. Frontend s_f/s_v/s_o Usage

### Files actively sending s_f/s_v params

| Service file | Endpoint targeted | Pattern used | Fields sent |
|---|---|---|---|
| `patientService.ts` | `GET /api/v1/patients` | `s_f=JSON(fields)&s_v=JSON(values)&s_o=or` | `first_name`, `last_name`, `email`, `phone`, `identification` |
| `appointmentsService.ts` | `GET /api/v1/appointments` | `s_f/s_v` built dynamically | `status`, `specialist_id`, `patient_id`, etc. |
| `appointmentsService.ts` | `GET /api/v1/patients` (search) | `s_f/s_v/s_o=or` | `identification`, `first_name`, `last_name`, `email` |
| `prescriptionService.ts` | `GET /api/v1/prescriptions` | Inline URL string | `appointment_id` |
| `clinicalEvolutionService.ts` | `GET /api/v1/prescriptions` | `s_f/s_v` | `appointment_id` |
| `laboratoryService.ts` | `GET /api/v1/laboratories` | `s_f/s_v/s_o=or` | `name`, `contact_person`, `email`, `phone` |
| `supplierService.ts` | `GET /api/v1/suppliers` | `s_f/s_v/s_o=or` | `name`, `nit`, `legal_name`, `email` |
| `brandService.ts` | `GET /api/v1/brands` (catalog) | `s_f/s_v/s_o=or` | `name`, `description` |
| `categoryService.ts` | `GET /api/v1/product-categories` | `s_f/s_v/s_o=or` | `name`, `description`, `slug` |
| `catalogService.ts` | catalog search endpoints | `s_f/s_v` | variable |
| `lensService.ts` | lens lookup endpoints | `s_f/s_v` | `name` (type/class/material/treatment) |
| `inventoryService.ts` | `GET /api/v1/warehouses` | `s_f/s_v` | `status` |
| `inventoryService.ts` | `GET /api/v1/inventory-items` | `s_f/s_v` | `warehouse_id`, `warehouse_location_id`, `status` |
| `userService.ts` | `GET /api/v1/users` | `s_f/s_v/s_o=or` | `name`, `email` |
| `purchaseService.ts` | `GET /api/v1/purchases` | `s_f`/`s_v` typed in interface | — |

**Critical finding:** The `userService.ts` sends `s_f/s_v` to `/api/v1/users` but the backend `ListUsers` handler **does not call `parseApiFilters`** — those params are silently ignored. This is an existing dead feature.

**Also noteworthy:** `brandService.ts` sends s_f/s_v to `/api/v1/brands` (catalog), but `ListBrands` handler takes no filters either. Same dead-param issue.

**Frontend migration required:** Once backend switches to typed params, all 15 service files above must be updated to send individual query params instead of `s_f/s_v` arrays. This is a **mandatory coordinated change** — the frontend and backend must be updated in tandem or the frontend must be updated first with a backward-compatible period.

---

## 7. Special Filter Keys

These pseudo-field keys are not real column names and receive special handling in repos:

| Key | Set by | Repository | SQL produced |
|---|---|---|---|
| `_or_mode` | `parseApiFilters` when `s_o=or` | `patient_repository.go` | Groups ILIKE conditions with `OR`; exact fields remain `AND` |
| `_start_date` | `handler_appointment.go` (direct) | `appointment_repository.go` | `scheduled_at IS NOT NULL AND scheduled_at >= ?` |
| `_end_date` | `handler_appointment.go` (direct) | `appointment_repository.go` | `scheduled_at IS NOT NULL AND scheduled_at <= ? 23:59:59` |
| `_patient_search` | `handler_appointment.go` (direct) | `appointment_repository.go` | JOIN patients + ILIKE on first_name/last_name/identification |
| `_attended_by` | `handler_appointment.go` (direct) | `appointment_repository.go` | `specialist_id = ? OR taken_by_id = ?` |
| `_pending_report` | `handler_appointment.go` (direct) | `appointment_repository.go` | `consultation_type IS NULL OR consultation_type = ''` |
| `_search` | `handler_laboratory.go` (direct) | `laboratory_repository.go` | ILIKE on order_number + patient name subquery |
| `_assigned_uid` | `handler_laboratory.go` (direct) | `laboratory_repository.go` | Subquery on `laboratory_order_statuses` table for quality notes containing `[uid:X]` |

**Migration note:** The underscore-prefix keys encode query semantics that do not map 1-to-1 to a struct field. When migrating to typed Filter structs, these should become explicit named fields (e.g., `PatientSearch string`, `AssignedUID string`, `DateFrom *time.Time`) rather than attempting to retain the underscore convention.

---

## 8. Gin ShouldBindQuery Pattern

`c.ShouldBindQuery()` unmarshals URL query parameters into a struct using `form` tags. It does **not** fail on unknown params (unlike `ShouldBindJSON`). Below are canonical patterns for Convision:

### Basic typed Filter struct

```go
// internal/domain/patient.go
type PatientFilter struct {
    Search     string `form:"search"`
    Status     string `form:"status"    validate:"omitempty,oneof=active inactive"`
    Gender     string `form:"gender"    validate:"omitempty,oneof=M F"`
    Page       int    `form:"page,default=1"`
    PerPage    int    `form:"per_page,default=15"`
}
```

### Optional FK filter (uint pointer = absent when not sent)

```go
type SaleFilter struct {
    PatientID     *uint  `form:"patient_id"`
    Status        string `form:"status"         validate:"omitempty,oneof=pending completed cancelled"`
    PaymentStatus string `form:"payment_status" validate:"omitempty,oneof=pending paid partial"`
    Page          int    `form:"page,default=1"`
    PerPage       int    `form:"per_page,default=15"`
}
```

### Date range filter

```go
type CashCloseFilter struct {
    Status    string     `form:"status"`
    UserID    *uint      `form:"user_id"`
    CloseDate string     `form:"close_date"`          // date string, keep as string for DB
    DateFrom  *time.Time `form:"date_from" time_format:"2006-01-02"`
    DateTo    *time.Time `form:"date_to"   time_format:"2006-01-02"`
    Page      int        `form:"page,default=1"`
    PerPage   int        `form:"per_page,default=15"`
}
```

### Multi-field text search replacing OR mode

```go
type PatientFilter struct {
    Search  string `form:"search"`   // replaces s_f + s_v + s_o=or
    Status  string `form:"status"`
    Page    int    `form:"page,default=1"`
    PerPage int    `form:"per_page,default=15"`
}
// In repo: if f.Search != "" { WHERE first_name ILIKE ? OR last_name ILIKE ? ... }
```

### Handler usage pattern

```go
func (h *Handler) ListSales(c *gin.Context) {
    var f domain.SaleFilter
    if err := c.ShouldBindQuery(&f); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
        return
    }
    // Inject branch from middleware (not from client query)
    branchID := branchmw.BranchIDFromCtx(c)
    if branchID > 0 {
        f.BranchID = &branchID
    }
    out, err := h.sale.List(f)
    if err != nil {
        respondError(c, err)
        return
    }
    c.JSON(http.StatusOK, out)
}
```

### Shared pagination base (recommended new domain type)

```go
// internal/domain/pagination.go  (new file)
type Pagination struct {
    Page    int `form:"page,default=1"`
    PerPage int `form:"per_page,default=15"`
}
```

Each Filter struct embeds `Pagination`:

```go
type SaleFilter struct {
    domain.Pagination
    PatientID     *uint  `form:"patient_id"`
    Status        string `form:"status"`
    PaymentStatus string `form:"payment_status"`
}
```

---

## 9. Repository Design Decision: Filter Struct vs. map Conversion

### Option A — Repository accepts typed Filter struct directly

```go
// domain interface
List(db *gorm.DB, f PatientFilter) ([]*Patient, int64, error)

// repository
func (r *PatientRepository) List(db *gorm.DB, f domain.PatientFilter) ([]*Patient, int64, error) {
    q := db.Model(&domain.Patient{})
    if f.Search != "" {
        like := "%" + f.Search + "%"
        q = q.Where("first_name ILIKE ? OR last_name ILIKE ? OR identification ILIKE ?", like, like, like)
    }
    if f.Status != "" { q = q.Where("status = ?", f.Status) }
    // ...
    q.Count(&total)
    q.Offset((f.Page-1)*f.PerPage).Limit(f.PerPage).Find(&results)
}
```

**Pros:**
- Type-safe: compiler catches typos in field names
- No runtime column-injection risk (SQL injection surface eliminated entirely)
- IDE autocomplete; grep-verifiable
- No allowlist maps needed

**Cons:**
- Domain interface changes with every new filter field added
- All mocks must be regenerated whenever signature changes
- Tighter coupling: domain layer needs to know about filter shape

### Option B — Service converts Filter struct to map, repo keeps map[string]any

```go
// service
func (s *Service) List(db *gorm.DB, f domain.SaleFilter) (*ListOutput, error) {
    filters := map[string]any{}
    if f.PatientID != nil { filters["patient_id"] = *f.PatientID }
    if f.Status != ""     { filters["status"] = f.Status }
    data, total, err := s.repo.List(db, filters, f.Page, f.PerPage)
    // ...
}
```

**Pros:**
- Repo interface stays stable (no mock churn)
- Easier to migrate incrementally (change one layer at a time)
- Repos can still be reused from other internal callers that build maps

**Cons:**
- Two representations (struct in transport, map in repo): conversion overhead
- Type safety only at transport/service boundary, not at DB layer
- allowlist maps remain in repos (SQL injection protection stays scattered)

### Recommendation

**Use Option A (typed Filter struct in domain) for new domains; Option B (conversion at service layer) for the 3 most complex existing repos (appointment, laboratory, product) as an interim step.**

Rationale: The SQL injection risk in the existing pattern comes from the allowlist maps. Moving to typed structs eliminates that entirely. For repos with complex special keys (`_patient_search`, `_assigned_uid`, `_or_mode`), those semantics become explicit struct fields in the domain Filter type — which is cleaner and more discoverable.

**Final recommended repo signature:**

```go
// domain interface
List(db *gorm.DB, f SaleFilter) ([]*Sale, int64, error)

// Pagination embedded in filter — repo reads f.Page and f.PerPage directly
```

---

## 10. Migration Order Recommendation

Ordered safest-to-riskiest based on: (a) number of callers, (b) complexity of SQL logic, (c) frontend coupling, (d) whether s_f/s_v is actually wired up on the backend.

| Priority | Domain | Handler | Rationale |
|---|---|---|---|
| 1 | **Role** | `handler_role.go` | Only 1 param (`name`); simple inline map; no s_f; already typed string |
| 2 | **Notification** | `handler_t10.go` | 2 params (`archived`, `unread`); simple bool-string; no s_f; small scope |
| 3 | **Warehouse** | `handler_inventory.go` | 2 params (`branch_id`, `status`); no s_f; branch injected by middleware |
| 4 | **WarehouseLocation** | `handler_inventory.go` | 2 params (`warehouse_id`, `status`); no s_f |
| 5 | **InventoryTransfer** | `handler_inventory.go` | 1 param (`status`); no s_f |
| 6 | **InventoryAdjustment** | `handler_inventory.go` | 1 param (`status`); no s_f |
| 7 | **StockMovement** | `handler_inventory.go` | 3 params; no s_f |
| 8 | **Sale** | `handler_sale.go` | 3 params; no s_f; branch injected; well-isolated |
| 9 | **Quote** | `handler_quote.go` | 2 params; no s_f |
| 10 | **Order** | `handler_order.go` | 4 params; no s_f |
| 11 | **CashRegisterClose** | `handler_cash_register_close.go` | 5 params; no s_f; date handling complexity |
| 12 | **Laboratory** | `handler_laboratory.go` | uses `_search` and `_assigned_uid` special keys; medium complexity |
| 13 | **LaboratoryOrder** | `handler_laboratory.go` | complex special keys; branch name lookup via repo call |
| 14 | **Payroll/ServiceOrder/CashTransfer** | `handler_t9.go` | All use `parseApiFilters`; low field count; safe to batch |
| 15 | **Expense** | `handler_finance.go` | Uses `parseApiFilters`; `expenseFilterAllowlist` uses `=` operator map |
| 16 | **Purchase** | `handler_finance.go` | Uses `parseApiFilters`; `purchaseFilterAllowlist` uses `=` operator map |
| 17 | **Supplier** | `handler_finance.go` | Uses `parseApiFilters`; ILIKE operator map; frontend sends s_f/s_v OR |
| 18 | **Prescription** | `handler_prescription.go` | Uses `parseApiFilters`; frontend sends `appointment_id` via s_f |
| 19 | **ClinicalHistory** | `handler_clinical.go` | Uses `parseApiFilters`; `patient_id`, `created_by` |
| 20 | **Patient** | `handler.go` | Uses `parseApiFilters` + OR mode; most complex frontend coupling |
| 21 | **Appointment** | `handler_appointment.go` | Most complex: parseApiFilters + 4 special keys + date range |
| 22 | **Product/LensCatalog** | `handler_product.go`, `handler_inventory.go` | Prescription-range filters are already typed; catalog filters complex |
| 23 | **User** | `handler.go` | Frontend sends s_f/s_v but backend ignores them; fix the disconnect first |

---

## 11. Risk Table

| Risk | Severity | Affected domains | Mitigation |
|---|---|---|---|
| Frontend breaks when backend stops accepting s_f/s_v | HIGH | patient, appointment, prescription, supplier, laboratory, inventory-items | Deploy frontend changes first or maintain backward-compat adapter period |
| Mock files need regeneration (15+ mocks) | MEDIUM | All | Update mocks as part of each domain migration |
| Special keys `_or_mode`, `_search`, `_assigned_uid` have no direct typed equivalent | MEDIUM | patient, laboratory | Map to explicit struct fields (e.g. `Search string`, `AssignedUID string`) |
| `_or_mode` applies OR across multiple text fields — not expressible with a single struct field | MEDIUM | patient | Add `Search string` field; repo applies multi-column OR internally |
| Date strings passed as strings (not `time.Time`) in several repos | LOW | cash_close, appointment, daily_activity | Use `string` form tag for date-only fields; use `*time.Time` only where time parsing is needed |
| branch_id is injected by middleware AND potentially sent by client | MEDIUM | appointment, sale, inventory-items | Always prefer middleware value; zero-value `*uint` = "all branches" |
| `ListUsers` and `ListBrands` silently ignore s_f/s_v — dead params | LOW | user, catalog/brands | Decide: add Search filter or just drop params from frontend |
| Type mismatch: repos sometimes store `uint`, sometimes `string` for IDs | LOW | laboratory (patient_id as string) | New Filter structs use correct Go types (`*uint`, not `string`) |
| `CashRegisterClose.List` takes extra `role, userID` params outside filters | MEDIUM | cash_close | Keep as explicit service params, not part of Filter struct |

---

## 12. Validation Architecture

### Grep-verifiable checks for post-migration state

After each domain migration, these checks should pass:

```bash
# 1. parseApiFilters should have zero callers when migration is complete
grep -rn "parseApiFilters" convision-api-golang/internal/transport/http/v1/ --include="*.go"
# Expected final output: only the function definition in handler.go (or deleted entirely)

# 2. No raw s_f/s_v query reading in transport layer
grep -rn '"s_f"\|"s_v"\|"s_o"' convision-api-golang/internal/transport/http/v1/ --include="*.go"
# Expected: zero results after full migration

# 3. All List handlers use ShouldBindQuery
grep -rn "ShouldBindQuery" convision-api-golang/internal/transport/http/v1/ --include="*.go"
# Expected: one call per List handler that has filter params

# 4. No filterAllowlist maps remain in repos (they become dead code once Filter structs are used)
grep -rn "FilterAllowlist\|allowedFilters\|allowedUserFilters" convision-api-golang/internal/platform/storage/postgres/ --include="*.go"
# Expected: zero results after full migration

# 5. All domain filter structs live in domain layer
grep -rn "type.*Filter struct" convision-api-golang/internal/domain/ --include="*.go"
# Expected: one struct per domain that has filter params

# 6. No map[string]any in domain repository interfaces for List methods
grep -rn "map\[string\]any" convision-api-golang/internal/domain/ --include="*.go"
# Expected: zero results (all interface List signatures now typed)

# 7. No s_f/s_v in frontend service files
grep -rn "s_f\|s_v\|s_o" convision-front/src/services/ --include="*.ts"
# Expected: zero results after full migration
```

### Per-domain validation after each wave

For each migrated domain, confirm:

1. `make build` passes
2. `make test` passes
3. Handler function uses `ShouldBindQuery` to bind a named `*Filter` struct
4. Service `List()` method signature accepts the typed Filter
5. Repository `List()` method signature accepts the typed Filter
6. Domain interface matches repository implementation
7. Mock in `testutil/mocks/` matches domain interface

---

## RESEARCH COMPLETE
