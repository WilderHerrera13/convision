# Phase 9 Research: Go Backend Test Suite

**Researched:** 2026-04-24
**Phase:** 9 — Go Backend Test Suite

---

## 1. Codebase Inventory

### 1.1 Service Packages (with key methods)

| Package | Constructor | Key Exported Methods |
|---|---|---|
| `internal/auth` | `NewService(userRepo, revokedTokenRepo, logger)` | `Login(LoginInput)`, `Logout(jti)`, `Me(userID)`, `Refresh(jti, userID)` |
| `internal/patient` | `NewService(repo, logger)` | `GetByID`, `List`, `Create`, `Update`, `Delete` |
| `internal/user` | `NewService(repo, logger)` | `GetByID`, `List`, `GetSpecialists`, `Create`, `Update`, `Delete` |
| `internal/appointment` | `NewService(repo, logger)` | `GetByID`, `List`, `Create`, `Update`, `Delete`, `Take`, `Pause`, `Resume`, `SaveManagementReport`, `SaveAnnotations`, `ListManagementReport`, `GetConsolidatedReport` |
| `internal/prescription` | `NewService(repo, logger)` | `GetByID`, `List`, `ListByPatient`, `Create`, `Update`, `Delete` |
| `internal/clinic` | `NewService(historyRepo, evolutionRepo, patientRepo, logger)` | `GetByID`, `GetByPatientIDSingle`, `List`, `ListByPatient`, `Create`, `Update`, `GetEvolutionByID`, `ListEvolutions`, `CreateEvolution`, `UpdateEvolution`, `DeleteEvolution` |
| `internal/catalog` | `NewService(brandRepo, lensTypeRepo, materialRepo, lensClassRepo, treatmentRepo, photochromicRepo, paymentMethodRepo, logger)` | `ListBrands`, `GetBrand`, `CreateBrand`, `UpdateBrand`, `DeleteBrand` (repeated pattern for LensType, Material, LensClass, Treatment, Photochromic, PaymentMethod) |
| `internal/location` | `NewService(locationRepo, patientLookupRepo, logger)` | `ListCountries`, `ListDepartments`, `ListCities`, `ListDistricts`, `ListIdentificationTypes`, `ListHealthInsuranceProviders`, `ListAffiliationTypes`, `ListCoverageTypes`, `ListEducationLevels`, `GetPatientLookupData` |
| `internal/product` | `NewService(productRepo, discountRepo, logger)` | `List`, `GetByID`, `Create`, `Update`, `Delete`, `Search`, `BulkUpdateStatus`, `GetDiscountInfo`, `CalculatePrice` |
| `internal/product` (CategoryService) | `NewCategoryService(repo, logger)` | `List`, `GetByID`, `Create`, `Update`, `Delete` |
| `internal/inventory` | `NewService(warehouseRepo, locationRepo, itemRepo, transferRepo, logger)` | `ListWarehouses`, `GetWarehouse`, `CreateWarehouse`, `UpdateWarehouse`, `DeleteWarehouse`, `ListWarehouseLocations`, `GetLocation`, `CreateLocation`, `UpdateLocation`, `DeleteLocation`, `ListInventoryItems`, `GetInventoryItem`, `CreateInventoryItem`, `UpdateInventoryItem`, `DeleteInventoryItem`, `ListTransfers`, `GetTransfer`, `CreateTransfer`, `UpdateTransfer`, `DeleteTransfer` |
| `internal/discount` | `NewService(repo, logger)` | `List`, `GetByID`, `Create`, `Update`, `Delete`, `Approve`, `Reject`, `ListActive`, `GetBestDiscount` |
| `internal/quote` | `NewService(quoteRepo, saleRepo, logger)` | `List`, `GetByID`, `Create`, `Update`, `Delete`, `UpdateStatus`, `ConvertToSale` |
| `internal/sale` | `NewService(saleRepo, adjRepo, productRepo, logger)` | `List`, `GetByID`, `Create`, `Update`, `Delete`, `AddPayment`, `RemovePayment`, `Cancel` |
| `internal/order` | `NewService(repo, logger)` | `GetByID`, `List`, `Create`, `Update`, `UpdateStatus`, `UpdatePaymentStatus`, `Delete` |
| `internal/laboratory` | `NewService(labRepo, orderRepo, logger)` | `GetLab`, `ListLabs`, `CreateLab`, `UpdateLab`, `DeleteLab`, `GetOrder`, `ListOrders`, `CreateOrder`, `UpdateOrder`, `UpdateOrderStatus`, `DeleteOrder`, `Stats`, `UploadEvidence`, `GetOrderEvidence` |
| `internal/supplier` | `NewService(repo, logger)` | `GetByID`, `List`, `Create`, `Update`, `Delete` |
| `internal/purchase` | `NewService(repo, logger)` | `GetByID`, `List`, `Create`, `Update`, `Delete`, `Receive` |
| `internal/expense` | `NewService(repo, logger)` | `GetByID`, `GetStats`, `List`, `Create`, `Update`, `Delete` |
| `internal/payroll` | `NewService(repo, logger)` | `GetByID`, `GetStats`, `List`, `Create`, `Update`, `Delete` |
| `internal/serviceorder` | `NewService(repo, logger)` | `GetByID`, `GetStats`, `List`, `Create`, `Update`, `Delete` |
| `internal/cash` | `NewService(repo, logger)` | `GetByID`, `GetStats`, `List`, `Create`, `Update`, `Approve`, `Cancel`, `Delete` |
| `internal/cashclose` | `NewService(repo, logger)` | `List`, `GetByID`, `Create`, `Update`, `Submit`, `Approve`, `ReturnToDraft`, `PutAdminActuals` |
| `internal/notification` | `NewService(repo, logger)` | `List`, `Summary`, `GetByID`, `MarkAsRead`, `MarkAsUnread`, `Archive`, `Unarchive`, `ReadAll`, `Delete` |
| `internal/note` | `NewService(repo, logger)` | `List`, `Create` |
| `internal/dailyactivity` | `NewService(repo, logger)` | `List`, `GetByID`, `Create`, `Update`, `QuickAttention` |
| `internal/bulkimport` | `NewService(patientRepo, userRepo, appointmentRepo, logger)` | `ProcessExcel`, `RegisteredTypes` |

### 1.2 Repository Interfaces

All interfaces are defined in `internal/domain/`. Here is the complete list with method signatures:

**`UserRepository`** (`user.go`)
```go
GetByID(id uint) (*User, error)
GetByEmail(email string) (*User, error)
Create(u *User) error
Update(u *User) error
Delete(id uint) error
List(filters map[string]any, page, perPage int) ([]*User, int64, error)
```

**`RevokedTokenRepository`** (`revoked_token.go`)
```go
IsRevoked(jti string) (bool, error)
Revoke(jti string) error
```

**`PatientRepository`** (`patient.go`)
```go
GetByID(id uint) (*Patient, error)
Create(p *Patient) error
Update(p *Patient) error
Delete(id uint) error
List(filters map[string]any, page, perPage int) ([]*Patient, int64, error)
```

**`AppointmentRepository`** (`appointment.go`)
```go
GetByID(id uint) (*Appointment, error)
GetByPatientID(patientID uint, page, perPage int) ([]*Appointment, int64, error)
GetBySpecialistID(specialistID uint, page, perPage int) ([]*Appointment, int64, error)
Create(a *Appointment) error
Update(a *Appointment) error
Delete(id uint) error
List(filters map[string]any, page, perPage int) ([]*Appointment, int64, error)
SaveManagementReport(id uint, consultationType, reportNotes string) error
GetConsolidatedReport(from, to string, specialistIDs []uint) ([]*SpecialistReportSummary, error)
ExistsByPatientAndDate(patientID uint, specialistID *uint, date time.Time) (bool, error)
```

**`PrescriptionRepository`** (`prescription.go`)
```go
GetByID(id uint) (*Prescription, error)
Create(p *Prescription) error
Update(p *Prescription) error
Delete(id uint) error
List(filters map[string]any, page, perPage int) ([]*Prescription, int64, error)
```

**`ClinicalHistoryRepository`** / **`ClinicalEvolutionRepository`** (`clinic.go`) — standard CRUD plus `GetByPatientID`, `GetSingleByPatientID`, `GetByClinicalHistoryID`.

**`LaboratoryRepository`** / **`LaboratoryOrderRepository`** (`laboratory.go`)
```go
// LaboratoryRepository — standard CRUD + List
// LaboratoryOrderRepository:
GetByID(id uint) (*LaboratoryOrder, error)
GetByOrderNumber(number string) (*LaboratoryOrder, error)
Create/Update/Delete/List — standard
AddStatusEntry(entry *LaboratoryOrderStatusEntry) error
AddEvidence(e *LaboratoryOrderEvidence) error
GetEvidence(orderID uint, transitionType string) ([]*LaboratoryOrderEvidence, error)
Stats() (map[string]int64, error)
```

**`InventoryItemRepository`** (`inventory.go`)
```go
// standard CRUD + List
TotalStock() (int64, error)
TotalStockPerProduct(filters map[string]any) ([]*ProductStockEntry, error)
ExistsByProductAndLocation(productID, locationID, excludeID uint) (bool, error)
```

**`WarehouseRepository`** — standard CRUD + `ListLocations(warehouseID uint) ([]*WarehouseLocation, error)`

**`WarehouseLocationRepository`**, **`InventoryTransferRepository`** — standard CRUD + List.

**`DiscountRepository`** (`discount.go`)
```go
// standard CRUD + List
GetActiveForProduct(productID uint) ([]*DiscountRequest, error)
GetBestForProduct(productID uint, patientID *uint) (*DiscountRequest, error)
```

**`QuoteRepository`**, **`SaleRepository`** — standard CRUD + List (SaleRepo also has `SaleLensPriceAdjustmentRepository`).

**`OrderRepository`** — standard CRUD + List.

**`ProductRepository`** — standard CRUD + List.

**`CashRegisterCloseRepository`** (`cash.go`) — includes `GetByUserAndDate`, `ListByStatuses`, `ListByUserAndDateRange`, `SyncActualPayments`.

**`CashTransferRepository`**, **`DailyActivityRepository`** — standard CRUD + List (DailyActivity also has `FindByUserDateShift`).

**`ExpenseRepository`**, **`PayrollRepository`**, **`ServiceOrderRepository`**, **`SupplierRepository`**, **`PurchaseRepository`** — all standard CRUD + List.

**`NotificationRepository`** — CRUD + `GetByID` + `Summary() (*NotificationSummary, error)` + `MarkAllRead`.

**`NoteRepository`** — `List(urlType string, resourceID uint, page, perPage int)`, `Create`.

**`LocationRepository`**, **`PatientLookupRepository`** — read-only lookup methods.

**`BulkImportLogRepository`** — `Create`, `List`.

Catalog repos (`LensTypeRepository`, `LensClassRepository`, `MaterialRepository`, `TreatmentRepository`, `PhotochromicRepository`, `BrandRepository`, `PaymentMethodRepository`) — all: `GetByID`, `Create`, `Update`, `Delete`, `List`.

### 1.3 HTTP Handler Groups

| File | Handler Methods (endpoints) |
|---|---|
| `handler.go` | `Login`, `Logout`, `Me`, `Refresh`, `ListUsers`, `GetUser`, `CreateUser`, `UpdateUser`, `DeleteUser`, `ListSpecialists`, `ListPatients`, `GetPatient`, `CreatePatient`, `UpdatePatient`, `DeletePatient` |
| `handler_appointment.go` | `ListAppointments`, `GetAppointment`, `CreateAppointment`, `UpdateAppointment`, `DeleteAppointment`, `TakeAppointment`, `PauseAppointment`, `ResumeAppointment`, `SaveAppointmentAnnotations`, `GetLensAnnotation` |
| `handler_bulk_import.go` | `BulkImport`, `BulkImportPatients`, `BulkImportDoctors`, `BulkImportScheduledAppointments`, `BulkImportHistory` |
| `handler_cash_register_close.go` | `ListCashRegisterCloses`, `GetCashRegisterClose`, `CreateCashRegisterClose`, `UpdateCashRegisterClose`, `SubmitCashRegisterClose`, `ApproveCashRegisterClose`, `ReturnCashRegisterCloseToDraft`, `PutCashRegisterCloseAdminActuals`, `ListCashRegisterClosesAdvisorsPending`, `GetCashRegisterClosesConsolidated`, `GetCashRegisterClosesCalendar` |
| `handler_catalog.go` | CRUD handlers for Brand, LensType, Material, LensClass, Treatment, Photochromic, PaymentMethod |
| `handler_clinical.go` | `ListClinicalHistories`, `GetClinicalHistory`, `CreateClinicalHistory`, `UpdateClinicalHistory`, `GetPatientClinicalHistory`, `ListClinicalEvolutions`, `GetClinicalEvolution`, `CreateClinicalEvolution`, `UpdateClinicalEvolution`, `DeleteClinicalEvolution`, `ListClinicalRecords` |
| `handler_discount.go` | `ListDiscountRequests`, `GetDiscountRequest`, `CreateDiscountRequest`, `UpdateDiscountRequest`, `DeleteDiscountRequest`, `ApproveDiscountRequest`, `RejectDiscountRequest`, `ListActiveDiscounts`, `GetBestDiscount` |
| `handler_finance.go` | Supplier, Purchase, Expense CRUD + `ReceivePurchase`, `GetExpenseStats`, `ListSupplierPayments` |
| `handler_guest_pdf.go` | `GuestOrderPdf`, `GuestOrderLabPdf`, `GuestLaboratoryOrderPdf`, `GuestSalePdf`, `GuestQuotePdf`, `GuestClinicalHistoryPdf` |
| `handler_inventory.go` | Warehouse, WarehouseLocation, InventoryItem CRUD + `GetWarehouseLocations`, `GetTotalStock`, `ListLocationInventoryItems`, `GetProductInventorySummary`, `AdjustInventory`, InventoryTransfer CRUD |
| `handler_laboratory.go` | `ListLaboratories`, `GetLaboratory`, `CreateLaboratory`, `UpdateLaboratory`, `DeleteLaboratory`, `GetLaboratoryOrderStats`, `ListLaboratoryOrders`, `GetLaboratoryOrder`, `CreateLaboratoryOrder`, `UpdateLaboratoryOrder`, `DeleteLaboratoryOrder`, `UpdateLaboratoryOrderStatus`, `UploadLaboratoryOrderEvidence`, `GetLaboratoryOrderEvidence` |
| `handler_location.go` | `LookupCountries`, `LookupDepartments`, `LookupCities`, `LookupDistricts`, `LookupPatientData` |
| `handler_management_report.go` | `ListManagementReport`, `GetManagementReport`, `SaveManagementReport` |
| `handler_order.go` | `ListOrders`, `GetOrder`, `CreateOrder`, `UpdateOrder`, `DeleteOrder`, `UpdateOrderStatus`, `UpdateOrderPaymentStatus` |
| `handler_prescription.go` | `ListPrescriptions`, `GetPrescription`, `CreatePrescription`, `UpdatePrescription`, `DeletePrescription`, `ListPatientPrescriptions` |
| `handler_product.go` | `ListProducts`, `GetProduct`, `CreateProduct`, `UpdateProduct`, `DeleteProduct`, `SearchProducts`, `BulkProductStatus`, `GetProductStock`, `GetProductDiscounts`, `GetProductDiscountInfo`, `GetProductActiveDiscounts`, `CalculateProductPrice`, `ListProductCategories`, `GetProductCategory`, `CreateProductCategory`, `UpdateProductCategory`, `DeleteProductCategory` |
| `handler_quote.go` | `ListQuotes`, `GetQuote`, `CreateQuote`, `UpdateQuote`, `DeleteQuote`, `UpdateQuoteStatus`, `ConvertQuote`, `GetQuotePdf`, `GetQuotePdfToken` |
| `handler_sale.go` | `ListSales`, `GetSale`, `CreateSale`, `UpdateSale`, `DeleteSale`, `GetSaleStats`, `GetSaleTodayStats`, `AddSalePayment`, `RemoveSalePayment`, `CancelSale`, `GetSalePdfToken`, `ListLensPriceAdjustments`, `CreateLensPriceAdjustment`, `DeleteLensPriceAdjustment`, `GetAdjustedLensPrice` |
| `handler_specialist_report.go` | `GetConsolidatedSpecialistReport`, `GetSpecialistReportDetail`, `UploadBulkExcel` |
| `handler_t9.go` | Payroll CRUD + stats, ServiceOrder CRUD + stats, CashTransfer CRUD + stats + `ApproveCashTransfer`, `CancelCashTransfer` |
| `handler_t10.go` | DailyActivity CRUD + `QuickAttentionDailyActivity` |

**Total route count:** ~120 unique HTTP endpoints across all handlers.

### 1.4 Existing Test State

- **Zero `*_test.go` files exist anywhere in `convision-api-golang/`.** (`find` returned no results.)
- No `testutil/`, `mocks/`, or `fixtures/` directories exist.
- No test libraries are listed in `go.mod` — only `github.com/stretchr/testify v1.11.1` appears in `go.sum` as a **transitive dependency** (pulled in by another library), not as a direct dependency.
- The `make test` target (`go test ./... -coverprofile=coverage.out && go tool cover -func=coverage.out`) exists and is ready — it just has nothing to run yet.

---

## 2. Testing Strategy

### 2.1 Unit Tests (service layer)

Each service takes only interfaces (Repository) and `*zap.Logger` as constructor arguments. This makes pure unit testing straightforward with hand-written or auto-generated mocks.

**Pattern:**
```go
// internal/patient/service_test.go
func TestService_Create_Success(t *testing.T) {
    repo := &mockPatientRepo{}
    repo.On("Create", mock.Anything).Return(nil)
    repo.On("GetByID", mock.Anything).Return(&domain.Patient{ID: 1, FirstName: "Test"}, nil)

    svc := NewService(repo, zap.NewNop())
    p, err := svc.Create(CreateInput{
        FirstName: "Test", LastName: "User", Email: "test@example.com",
        Phone: "123", Identification: "ABC", Gender: "male",
    })
    require.NoError(t, err)
    assert.Equal(t, "Test", p.FirstName)
}
```

**Table-driven tests** are standard Go practice and should be used for any method with multiple paths (validation errors, not-found cases, conflict cases, happy path):
```go
tests := []struct {
    name    string
    input   CreateInput
    repoErr error
    wantErr bool
}{
    {"valid", validInput, nil, false},
    {"repo_error", validInput, errors.New("db"), true},
}
```

For `*zap.Logger`, use `zap.NewNop()` — it discards all output and has no side effects.

Services with business logic beyond simple CRUD (priority targets):
- `auth.Service.Login` — bcrypt comparison, token generation
- `sale.Service.Create/AddPayment` — `derivePaymentStatus` logic
- `quote.Service.ConvertToSale` — cross-repo transaction across QuoteRepo + SaleRepo
- `laboratory.Service.CreateOrder` — generates status history entry on creation
- `laboratory.Service.UploadEvidence` — 4-evidence cap validation, content-type validation
- `cashclose.Service.Submit/Approve` — state-machine transitions
- `discount.Service.Approve/Reject` — approval workflow
- `appointment.Service.Take/Pause/Resume` — state-machine transitions
- `product.Service.CalculatePrice` — calls `DiscountRepository.GetBestForProduct`

### 2.2 Integration Tests (handler layer)

Use `net/http/httptest` with a real Gin engine (in `gin.TestMode`) to test the full HTTP layer including:
- Request parsing (JSON body, URL params, query params)
- Auth middleware (`jwtauth.Authenticate` + `jwtauth.RequireRole`)
- Status code correctness
- Response JSON shape

**Pattern:**
```go
func TestHandler_CreatePatient(t *testing.T) {
    // Build a mock service
    mockSvc := &mockPatientService{}
    mockSvc.On("Create", mock.Anything).Return(&domain.Patient{ID: 1}, nil)

    // Build the handler + router
    gin.SetMode(gin.TestMode)
    r := gin.New()
    h := buildTestHandler(mockSvc)  // factory that wires only the needed service
    r.POST("/api/v1/patients", injectClaims(adminClaims), h.CreatePatient)

    body := `{"first_name":"Ana","last_name":"Rios","email":"ana@example.com","phone":"123","identification":"X","gender":"female"}`
    req := httptest.NewRequest(http.MethodPost, "/api/v1/patients", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusCreated, w.Code)
}
```

Key insight: the `Handler` struct (`internal/transport/http/v1/handler.go`) takes *concrete service structs*, not interfaces. This means handler tests require either:
1. **Injecting real service instances backed by mock repositories** (preferred — tests the handler + service interaction).
2. **Refactoring Handler to accept service interfaces** (more work but cleaner isolation) — out of scope for Phase 9 unless the planner specifically allocates it.

Recommended approach for Phase 9: inject real service structs backed by mock repos (option 1). This tests both handler parsing and service business logic simultaneously.

For auth middleware bypass in handler tests, inject claims directly into the Gin context:
```go
func injectClaims(claims *jwtauth.Claims) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Set("claims", claims)
        c.Next()
    }
}
```

---

## 3. Mock Generation Approach

**Recommendation: `testify/mock` with hand-written mocks (no code generation tool for Phase 9).**

Rationale:
- There are ~30+ Repository interfaces. Generating them with `mockery` requires adding a dev-tool dependency (`github.com/vektra/mockery/v2`) and a `.mockery.yaml` config, which is extra setup.
- All interfaces are small (typically 5-8 methods). Hand-writing them once is fast and stays self-contained.
- `github.com/stretchr/testify v1.11.1` is already in `go.sum` as a transitive dep — it just needs to be promoted to a direct `go.mod` entry (`require github.com/stretchr/testify v1.11.1`).
- If the team later wants auto-generation, `mockery v2` can be layered in without changing existing tests.

**mockery v2 path (optional, not for Phase 9 baseline):**
```bash
go install github.com/vektra/mockery/v2@latest
# .mockery.yaml at repo root
mockery --all --keeptree --output internal/mocks
```

**Hand-written mock pattern (testify/mock):**
```go
// internal/testutil/mocks/patient_repo.go
type MockPatientRepository struct {
    mock.Mock
}

func (m *MockPatientRepository) GetByID(id uint) (*domain.Patient, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*domain.Patient), args.Error(1)
}
// ... other methods
```

---

## 4. Test Infrastructure (`internal/testutil/`)

Create package `internal/testutil` with the following helpers:

### 4.1 JWT Factory
```go
// testutil/jwt.go
func AdminToken(t *testing.T) string  // signs a token with JWT_SECRET=test-secret, role=admin
func SpecialistToken(t *testing.T) string
func ReceptionistToken(t *testing.T) string
func LaboratoryToken(t *testing.T) string
func TokenForUser(t *testing.T, u *domain.User) string
```
Set `os.Setenv("JWT_SECRET", "test-secret")` in `TestMain` or per-test setup.

### 4.2 Claims Injection Middleware
```go
// testutil/gin.go
func InjectClaims(claims *jwtauth.Claims) gin.HandlerFunc
func AdminClaims() *jwtauth.Claims    // returns Claims with RoleAdmin
func SpecialistClaims() *jwtauth.Claims
```

### 4.3 Mock Repositories
Place all hand-written mocks in `internal/testutil/mocks/`:
```
internal/testutil/mocks/
  user_repo.go             // MockUserRepository
  patient_repo.go          // MockPatientRepository
  appointment_repo.go      // MockAppointmentRepository
  laboratory_repo.go       // MockLaboratoryRepository + MockLaboratoryOrderRepository
  sale_repo.go             // MockSaleRepository + MockSaleLensPriceAdjustmentRepository
  ... (one file per domain entity)
```

### 4.4 Request Builder
```go
// testutil/http.go
func JSONRequest(method, path string, body any) *http.Request
func AuthJSONRequest(method, path string, body any, token string) *http.Request
```

### 4.5 Nop Logger
```go
// testutil/logger.go
func NopLogger() *zap.Logger { return zap.NewNop() }
```

### 4.6 Router Builder
```go
// testutil/router.go
// BuildRouter wires up a real v1.Handler with the given service set, returns a *gin.Engine
// that can be used with httptest.
func BuildTestRouter(h *v1.Handler) *gin.Engine
```

---

## 5. Dependencies to Add

Add the following to `go.mod` as direct dependencies:

```
require (
    github.com/stretchr/testify v1.11.1   // assert, require, mock
    github.com/stretchr/objx    v0.5.2    // required by testify/mock
)
```

These are already in `go.sum` so `go mod tidy` after adding them will not fetch new network data.

No `testcontainers-go` is needed for Phase 9 since the strategy is pure unit tests + httptest mocks (no real DB). If a future Phase 10 adds true integration tests with a real DB, add:
```
github.com/testcontainers/testcontainers-go v0.35.0
```

Run `make tidy` after updating `go.mod`.

---

## 6. Coverage Priority

Target ≥70% overall. Focus first on packages with the most business logic:

| Priority | Package | Reason |
|---|---|---|
| 1 | `internal/auth` | Login/logout/refresh token lifecycle — security critical |
| 2 | `internal/sale` | `derivePaymentStatus`, payment add/remove, cancel logic |
| 3 | `internal/laboratory` | Evidence upload cap, status transitions, order number generation |
| 4 | `internal/quote` | `ConvertToSale` cross-repo operation, total calculation |
| 5 | `internal/discount` | Approval workflow, `GetBestDiscount` business rule |
| 6 | `internal/cashclose` | State-machine (draft→submitted→approved) |
| 7 | `internal/appointment` | State transitions (take/pause/resume), date parsing |
| 8 | `internal/patient` | Simple CRUD — quick wins for coverage |
| 9 | `internal/user` | Simple CRUD — quick wins for coverage |
| 10 | `internal/prescription` | Simple CRUD |
| 11 | `internal/inventory` | `ExistsByProductAndLocation` duplicate check logic |
| 12 | `internal/product` | `CalculatePrice` calls two repos |
| 13 | Remaining CRUD services | `supplier`, `purchase`, `expense`, `payroll`, etc. — pattern repetition |
| 14 | Handler layer | Test all 120 endpoints for status codes + JSON shape |
| 15 | `internal/catalog` | Many repetitive catalog entities — test one per entity type |

`internal/bulkimport` is low priority due to Excel parsing complexity — mock at `ProcessExcel` level.
`internal/platform/storage/postgres/` repositories are **excluded** from unit tests (they require a real DB — leave for future integration tests).

---

## 7. JWT / Auth Test Pattern

`jwtauth.GenerateToken` and `jwtauth.ParseToken` read `JWT_SECRET` from `os.Getenv`. In tests, set this before calling either function:

```go
// TestMain or individual test setup
func init() {
    os.Setenv("JWT_SECRET", "test-secret-for-testing")
    os.Setenv("JWT_TTL_HOURS", "1")
}
```

**Generating a real signed token for handler tests:**
```go
func AdminToken(t *testing.T) string {
    t.Helper()
    user := &domain.User{ID: 1, Email: "admin@test.com", Role: domain.RoleAdmin, Active: true}
    tok, _, _, err := jwtauth.GenerateToken(user)
    require.NoError(t, err)
    return tok
}
```

**Bypassing the middleware entirely** (faster for unit-level handler tests):
```go
// Mount handler without Authenticate middleware; inject claims directly.
r.POST("/patients", testutil.InjectClaims(testutil.AdminClaims()), h.CreatePatient)
```

**Testing 403 Forbidden:**
```go
r.POST("/users", jwtauth.RequireRole(domain.RoleAdmin), h.CreateUser)
// call with ReceptionistToken → expect 403
```

---

## 8. Integration Test DB Strategy

**Recommendation: No real DB for Phase 9. Use mock repositories exclusively.**

Rationale:
- No `testcontainers-go` in dependencies; adding it significantly increases CI setup complexity.
- The 3-layer architecture makes repository-mocking the natural test boundary.
- Repository implementations (`internal/platform/storage/postgres/`) are thin GORM wrappers; the interesting business logic lives in the service layer.
- CI target is ≥70% coverage, which is achievable with service + handler tests backed by mocks.

**If real DB integration tests are needed in the future (Phase 10):**
```go
// Add testcontainers-go
container, _ := postgres.RunContainer(ctx, testcontainers.WithImage("postgres:15"))
dsn, _ := container.ConnectionString(ctx, "sslmode=disable")
db, _ := postgresplatform.OpenWithDSN(dsn, zap.NewNop())
```
This requires refactoring `postgresplatform.Open` to accept a DSN string override — a one-line change.

---

## 9. Validation Architecture

### `make test` command (current)
```bash
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out
```

### Recommended enhanced command for coverage gate
```bash
go test ./... -race -coverprofile=coverage.out -covermode=atomic
go tool cover -func=coverage.out | tail -1  # print total coverage
# Fail if < 70%
go tool cover -func=coverage.out | grep "total:" | awk '{print $3}' | \
  awk -F% '{if ($1 < 70) {print "Coverage below 70%: "$1"%"; exit 1}}'
```

The `-race` flag is important to catch data races in concurrent handler tests. Use `-covermode=atomic` when running with `-race`.

### Makefile target to update
```makefile
test:
    go test ./... -race -coverprofile=coverage.out -covermode=atomic
    go tool cover -func=coverage.out
```

### HTML report (for local development)
```bash
go tool cover -html=coverage.out -o coverage.html
```

### Exclude `internal/platform/storage/postgres/` from coverage gate
These files will show 0% coverage (no DB in unit tests) but should not pull down the total significantly if excluded:
```bash
go test $(go list ./... | grep -v 'platform/storage/postgres') -coverprofile=coverage.out
```

---

## 10. Risks & Pitfalls

### 10.1 Handler struct takes concrete types, not interfaces
The `v1.Handler` struct holds `*auth.Service`, `*patient.Service`, etc. (concrete pointer types), not interfaces. This means handler tests cannot inject mock services via interface substitution — instead you must wire real service instances backed by mock repositories. This adds one indirection level to handler tests but is fine because service business logic is already tested in unit tests.

If the team wants true handler isolation later, each service package would need a `ServiceIface` interface extracted. That is a refactor beyond Phase 9 scope.

### 10.2 `jwtauth.GenerateToken` reads from `os.Getenv`
All JWT operations depend on `JWT_SECRET` env var. Tests must set this via `os.Setenv` before any auth code runs. Use `TestMain` in the test package to ensure it is set exactly once:
```go
func TestMain(m *testing.M) {
    os.Setenv("JWT_SECRET", "test-secret")
    os.Setenv("JWT_TTL_HOURS", "1")
    os.Exit(m.Run())
}
```

### 10.3 `laboratory.Service.UploadEvidence` takes an `io.Reader` and `filestore.Storage`
`filestore.Storage` is an interface (`internal/platform/filestore`). Tests for `UploadEvidence` need a mock `filestore.Storage`. Implement a simple `MockStorage` in `testutil`.

### 10.4 `bulkimport.Service.ProcessExcel` parses real Excel files
Avoid testing this with real `.xlsx` files in unit tests. Create a minimal test Excel binary using `excelize` in the test, or mock at the service boundary and test only the wrapper handler (`BulkImport`).

### 10.5 Race conditions in parallel tests
Use `t.Parallel()` only after ensuring shared state is properly isolated. The `os.Setenv` calls for JWT_SECRET must happen in `TestMain`, not inside parallel sub-tests.

### 10.6 `time.Now()` in business logic
`appointment.Service.Create` and `appointment.Service.Take` call or rely on `time.Now()` implicitly (via GORM timestamps). Tests that depend on exact timestamps will be flaky — use `assert.WithinDuration` or assert only on non-time fields.

`laboratory.Service.CreateOrder` generates `LaboratoryOrderStatusEntry` with a side-effectful `AddStatusEntry` call. Tests must set expectations for this secondary repo call in addition to the primary `Create` call.

### 10.7 `sale.Service.derivePaymentStatus` is unexported
The function `derivePaymentStatus(amountPaid, total float64, hasPayments bool) string` is unexported. Test it indirectly through `Create` and `AddPayment`, or promote it to exported if direct testing is needed.

### 10.8 `quote.Service.ConvertToSale` uses two repos
`ConvertToSale` calls both `QuoteRepository` and `SaleRepository`. Both mocks must be set up with matching expectations. Pay attention to the order of calls and that mock `SaleRepository.Create` is called with a correctly populated `domain.Sale`.

### 10.9 `catalog.Service` wraps 7 repositories
Testing `catalog.Service` requires setting up 7 mock repos even for tests that only touch one entity type. Either test via a single mock that satisfies all 7 interfaces, or construct the service with only the non-nil repo under test (nil-safe if the code only calls the relevant repo per method).

### 10.10 `DashboardRepository` is not an interface
The `Handler` receives `*postgresplatform.DashboardRepository` (a concrete type, not a domain interface). Handler tests that call `GetDashboardSummary` cannot mock this without a real DB. Exclude dashboard handler tests from Phase 9 or skip them with `t.Skip("requires real DB")`.

### 10.11 Coverage exclusions
The following files will contribute zero coverage in unit tests and should be excluded from the gate calculation:
- `internal/platform/storage/postgres/*.go` (all GORM repos)
- `internal/platform/filestore/*.go`
- `internal/platform/auth/jwt.go` (uses env var, but fully testable — see §7)
- `cmd/api/main.go` (wiring only)
- `internal/bulkimport/service.go` (Excel parsing — complex, low-ROI for unit tests)
