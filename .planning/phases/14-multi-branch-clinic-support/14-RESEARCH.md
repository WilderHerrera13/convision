# Phase 14 — Multi-Branch / Clinic Support — Research

**Date:** 2026-04-28
**Sources:** 14-CONTEXT.md, REQUIREMENTS.md (BRANCH-01..10), ROADMAP.md, STATE.md, DEVELOPMENT_GUIDE.md, DATABASE_GUIDE.md, inspected Go/React code.

---

## Current State Analysis

### What exists

#### Domain layer (`internal/domain/`)

| File | Entity | Current clinic/branch column | Status |
|------|--------|------------------------------|--------|
| `user.go` | `User` | None — global entity | Global, no changes |
| `patient.go` | `Patient` | None — global entity | Global, no changes |
| `appointment.go` | `Appointment` | **No branch/clinic column** | **NEEDS NEW `BranchID`** |
| `sale.go` | `Sale` | **No branch/clinic column** | **NEEDS NEW `BranchID`** |
| `sale.go` | `SaleItem` | No branch_id (inherited via SaleID) | Inherits via Sale |
| `cash.go` | `CashRegisterClose` | **No branch/clinic column** | **NEEDS NEW `BranchID`** |
| `cash.go` | `CashRegisterClosePayment` | No branch_id (inherited via CashRegisterCloseID) | Inherited via parent |
| `cash.go` | `CashRegisterCloseActualPayment` | No branch_id (inherited) | Inherited via parent |
| `cash.go` | `CashCountDenomination` | No branch_id (inherited) | Inherited via parent |
| `cash.go` | `CashTransfer` | No branch/clinic column | **RESEARCH NOTE:** Decision needed — should cash transfers be branch-scoped? Currently no. |
| `cash.go` | `DailyActivityReport` | **No branch/clinic column** | **NEEDS NEW `BranchID`** |
| `clinical_record.go` | `ClinicalRecord` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `clinical_record.go` | `Anamnesis` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `clinical_record.go` | `VisualExam` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `clinical_record.go` | `Diagnosis` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `clinical_record.go` | `ClinicalPrescription` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `inventory.go` | `Warehouse` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `inventory.go` | `WarehouseLocation` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `inventory.go` | `InventoryItem` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `inventory.go` | `InventoryTransfer` | **`ClinicID uint` `json:"clinic_id"`** | **RENAME TO `BranchID`** |
| `inventory.go` | `StockMovement` | **No clinic/branch column** | **NEEDS NEW `BranchID`** (derives from warehouse) |
| `inventory.go` | `InventoryAdjustment` | **No clinic/branch column** | **NEEDS NEW `BranchID`** (derives from inventory_item) |
| `product.go` | `Product` | None — global entity | Global, no changes |
| `lens.go` | `Lens` | None — global entity | Global, no changes |
| `discount.go` | Discount entities | None — global entity | Global, no changes |
| `laboratory.go` | Laboratory entities | None — global entities | Global, no changes |
| `supplier.go` | Supplier entities | None — global entities | Global, no changes |
| `order.go` | Order, Quote | None — global? | **RESEARCH NOTE:** Should orders/quotes be branch-scoped? Currently no explicit decision. |
| `clinic.go` | ClinicalHistory/Evolution | None — legacy records | No branch scope |

#### Repository layer (`internal/platform/storage/postgres/`)

| File | Key Observations |
|------|-----------------|
| `appointment_repository.go` | No branch filter on any query method. `List()` builds queries without branch scope. `GetConsolidatedReport()` raw SQL joins appointments+users. `HasConflictForSpecialist()`, `GetBookedTimesForSpecialist()`, `GetActiveBySpecialist()` all query by specialist/user without branch context. `filterAllowlist` does NOT include `branch_id`. |
| `sale_repository.go` | No branch filter. `filterAllowlist` limited to patient_id, status, payment_status, created_by, order_id. `GetStats()` and `GetTodayStats()` return system-wide aggregations. |
| `cash_register_close_repository.go` | No branch filter. All queries by user_id + date. `ListByStatuses` queries all adviser closes globally. `ListByUserAndDateRange` per user without branch scope. |
| `daily_activity_repository.go` | No branch filter. Queries by user_id + date range. |
| `user_repository.go` | No branch awareness — correct, users are global. |
| `db.go` `AutoMigrate` | Lists all domain models. Will need to add `&domain.Branch{}` and `&domain.UserBranch{}`. |

#### Handler layer (`internal/transport/http/v1/`)

| File | Key Observations |
|------|-----------------|
| `handler_appointment.go` | `ListAppointments()` parses filters but does NOT read branch from context. `CreateAppointment()` reads `claims.UserID` from JWT but does NOT set branch on create. `TakeAppointment()` reads `claims.UserID` only. |
| `handler_sale.go` | `CreateSale()` reads `claims.UserID` only. `ListSales()` parses filters manually without branch. `GetSaleStats()` and `GetSaleTodayStats()` are system-wide. |
| `handler_cash_register_close.go` | All handlers read `claims.Role` and `claims.UserID` from JWT for scoping but no branch context. |
| `handler.go` | `Login()` handler hardcodes response shape `{access_token, token_type, expires_in, user}` — needs enrichment with `branches[]`. `Handler` struct has no `branch` service field. `NewHandler()` has no `branch` parameter. |
| `routes.go` | No `BranchContext` middleware applied anywhere. All route groups use `jwtauth.Authenticate` + role middleware only. Branch CRUD routes don't exist yet. |

#### Auth layer (`internal/platform/auth/`)

| File | Key Observations |
|------|-----------------|
| `jwt.go` | `Claims` struct: `UserID uint, Email string, Role domain.Role, RegisteredClaims`. **No BranchID in token** — correct per D-04 (branch is header-based, not JWT-based). Token generation is branch-agnostic. |
| `middleware.go` | `Authenticate(h.revokedTokens)` validates JWT + injects claims into context via `c.Set(claimsKey, claims)`. `GetClaims(c)` retrieves claims. `RequireRole(roles...)` enforces role check. Structure is ready for a new `BranchContext` middleware that reads `X-Branch-ID` header after authentication. |

#### Auth service (`internal/auth/service.go`)

| File | Key Observations |
|------|-----------------|
| `service.go` | `LoginOutput` has `AccessToken`, `TokenType`, `ExpiresIn`, `JTI`, `User`. **No Branches field.** Service has `UserRepository` and `RevokedTokenRepository` — needs a `BranchRepository` or `UserBranchRepository` to resolve branches for the login response. |

#### main.go DI

Current DI wire order: `env → logger → db → repos → services → handler → routes → server`.

New DI needed:
- `branchRepo` (postgres)
- `userBranchRepo` (postgres)
- `branchService` (new `internal/branch/service.go`)
- Inject `branchService` into `authService` (for login enrichment) and into `Handler` struct
- Inject `branchRepo` into the BranchContext middleware

#### Migration files

| File | Content |
|------|---------|
| `000001_create_accounts.up.sql` | Platform accounts schema — unrelated |
| `000006_create_clinical_records.up.sql` | Creates `clinical_records` with `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` |
| `000007_create_anamneses.up.sql` | Creates `anamneses` with `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` |
| `000008_create_visual_exams.up.sql` | Creates `visual_exams` with `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` |
| `000014_create_diagnoses.up.sql` | Creates `diagnoses` with `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` |
| `000015_create_prescriptions.up.sql` | Creates `prescriptions` with `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` |
| `000016_unified_product_wms.up.sql` | Phase 13: adds `product_type`, `tracks_stock` to products; creates `stock_movements` (no clinic/branch column), creates `inventory_adjustments` (no clinic/branch column) |
| Next: `000017` | **Phase 14**: branches, user_branches, add/rename branch_id columns |

Note: Inventory tables (`warehouses`, `warehouse_locations`, `inventory_items`, `inventory_transfers`) have `clinic_id` from AutoMigrate on domain structs, not from a numbered migration. Their `clinic_id` columns were created by GORM AutoMigrate, not by explicit SQL migrations. The migration `000017` MUST rename these columns too.

#### Frontend

| File | Key Observations |
|------|-----------------|
| `AuthContext.tsx` | Login flow calls `authService.login()` then `navigate()` to role dashboard. Stores `user` from response. No branch awareness at all. `useAuth()` hook provides `login/logout/isAdmin/isSpecialist/isReceptionist`. |
| `axios.ts` | Interceptor reads `access_token` from localStorage and attaches `Authorization: Bearer`. **No X-Branch-ID header currently.** Token refresh handles 401 retry. |
| `auth.ts` | `login()` stores `access_token`, `token_type`, `auth_user` in localStorage. `logout()` clears all localStorage. `getUser()` reads `auth_user` from localStorage. |
| `App.tsx` | React Router v6 with `createBrowserRouter`. Has `ProtectedRoute` (checks auth + role). `PublicRoute` redirects authenticated users to dashboards. No `/select-branch` route yet. No `BranchContext` provider wrapping the tree. |

### Gaps vs Phase 14 intent

| Gap ID | Description | Severity |
|--------|-------------|----------|
| GAP-01 | No `branches` table or domain model exists | Critical |
| GAP-02 | No `user_branches` junction table or domain model exists | Critical |
| GAP-03 | No `BranchID` column on `appointments`, `sales`, `cash_closes`, `daily_activity_reports` | Critical |
| GAP-04 | `clinic_id` references phantom `clinics` table (doesn't exist in Go migrations) across inventory + clinical_record tables | Critical |
| GAP-05 | No `BranchContext` middleware exists | Critical |
| GAP-06 | Login response doesn't include branches list | Critical |
| GAP-07 | No branch-scoped filter in any repository query method | Critical |
| GAP-08 | No branch selector UI page exists | Critical |
| GAP-09 | No `BranchContext` React context exists | Critical |
| GAP-10 | Axios interceptor doesn't attach `X-Branch-ID` header | Critical |
| GAP-11 | `StockMovement` and `InventoryAdjustment` (Phase 13) have no branch column — decision needed on whether they should | High |
| GAP-12 | `CashTransfer` has no clinic/branch column — decision needed | Medium |
| GAP-13 | `Handler` struct in `handler.go` has no branch service field | Critical |
| GAP-14 | `AutoMigrate` in `db.go` doesn't include Branch or UserBranch | Critical |
| GAP-15 | `main.go` DI doesn't wire branch repos/services | Critical |

---

## Research Answers

### A. Database Layer

#### 1. Migration order (dev wipe allowed, next migration number 000017)

```
000017_create_branches_and_scoped_columns.up.sql:
  Step 1: CREATE TABLE branches
  Step 2: INSERT INTO branches (id, name) VALUES (1, 'Principal') — default seed
  Step 3: CREATE TABLE user_branches with FKs to users and branches
  Step 4: ALTER TABLE appointments ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id)
  Step 5: ALTER TABLE sales ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id)
  Step 6: ALTER TABLE cash_register_closes ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id)
  Step 7: ALTER TABLE daily_activity_reports ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id)
  Step 8: RENAME clinic_id → branch_id + add FK on ALL tables that currently have clinic_id:
    - clinical_records
    - anamneses
    - visual_exams
    - diagnoses
    - prescriptions
    - warehouses
    - warehouse_locations
    - inventory_items
    - inventory_transfers
  Step 9: ALTER TABLE stock_movements ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id)
  Step 10: ALTER TABLE inventory_adjustments ADD COLUMN branch_id INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id)
  Step 11: Add partial indexes on branch_id for list queries
```

Note: All new columns use `DEFAULT 1` because the seed branch id=1 'Principal' is created first. After migration, the `DEFAULT` can stay for backwards compatibility but `NOT NULL` is enforced.

#### 2. Complete table-by-table analysis

**TABLES GETTING NEW `branch_id` (never had one):**

| Table | Migration Action |
|-------|-----------------|
| `appointments` | `ADD COLUMN branch_id INTEGER NOT NULL REFERENCES branches(id) DEFAULT 1` |
| `sales` | `ADD COLUMN branch_id INTEGER NOT NULL REFERENCES branches(id) DEFAULT 1` |
| `cash_register_closes` | `ADD COLUMN branch_id INTEGER NOT NULL REFERENCES branches(id) DEFAULT 1` |
| `daily_activity_reports` | `ADD COLUMN branch_id INTEGER NOT NULL REFERENCES branches(id) DEFAULT 1` |
| `stock_movements` | `ADD COLUMN branch_id INTEGER NOT NULL REFERENCES branches(id) DEFAULT 1` |
| `inventory_adjustments` | `ADD COLUMN branch_id INTEGER NOT NULL REFERENCES branches(id) DEFAULT 1` |

**TABLES RENAMING `clinic_id` → `branch_id`:**

| Table | Current Column | Migration Action |
|-------|---------------|-----------------|
| `clinical_records` | `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` | Rename + change FK target to branches |
| `anamneses` | `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` | Rename + change FK target to branches |
| `visual_exams` | `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` | Rename + change FK target to branches |
| `diagnoses` | `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` | Rename + change FK target to branches |
| `prescriptions` | `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` | Rename + change FK target to branches |
| `warehouses` | `clinic_id INTEGER NOT NULL` (no FK) | Rename + add FK to branches |
| `warehouse_locations` | `clinic_id INTEGER NOT NULL` (no FK) | Rename + add FK to branches |
| `inventory_items` | `clinic_id INTEGER NOT NULL` (no FK) | Rename + add FK to branches |
| `inventory_transfers` | `clinic_id INTEGER NOT NULL` (no FK) | Rename + add FK to branches |

**TABLES UNAFFECTED (global scope):**

`users`, `patients`, `products`, `lenses`, `product_lens_attributes`, `product_frame_attributes`, `product_contact_lens_attributes`, `discounts`, `discount_requests`, `brands`, `lens_types`, `materials`, `lens_classes`, `treatments`, `photochromics`, `payment_methods`, `laboratories`, `laboratory_orders`, `suppliers`, `purchases`, `purchase_items`, `purchase_payments`, `expenses`, `service_orders`, `payrolls`, `cash_transfers`, `orders`, `order_items`, `quotes`, `quote_items`, `notes`, `notifications`, `countries`, `departments`, `cities`, `districts`, `identification_types`, `affiliation_types`, `coverage_types`, `health_insurance_providers`, `education_levels`, `product_categories`, `clinical_histories`, `clinical_evolutions`, `bulk_import_logs`, `revoked_tokens`

**TABLES WITH SUB-TABLE INHERITANCE (branch_id NOT needed on sub-table):**

`sale_items` (inherits via `sale_id` → `sales.branch_id`), `cash_register_close_payments`, `cash_register_close_actual_payments`, `cash_count_denominations` (all inherit via `cash_register_close_id` → `cash_register_closes.branch_id`)

#### 3. GORM field changes needed on each domain struct

All `ClinicID` fields must be renamed to `BranchID` on the **Go struct field** (English rule). The `json` tag MAY keep `"clinic_id"` for backwards-compatible API contracts, OR be updated to `"branch_id"` if a breaking change is acceptable (dev wipe allowed — OK to change).

**Precedent to check:** Frontend code may reference `clinic_id` in API responses. Since dev wipe is allowed, changing json tag to `"branch_id"` is acceptable and cleaner.

For new columns: `BranchID uint \`json:"branch_id" gorm:"not null;index"\``

#### 4. Phase 13 interaction (stock_movements, inventory_adjustments)

Phase 13 creates `stock_movements` and `inventory_adjustments` tables (migration 000016). Neither has `clinic_id` or `branch_id`. Phase 14 migration MUST add `branch_id` to both. Since Phase 14 depends on Phase 13 (ROADMAP.md), Phase 13's migration runs first, then Phase 14's migration adds the column.

The `stock_movements` domain struct in `inventory.go` already has `ProductID`, `WarehouseID` — branch can be derived from the warehouse, but it's cleaner to add an explicit `BranchID` column for direct filtering. Same for `InventoryAdjustment` — has `InventoryItemID` which links to `inventory_items` which will have `branch_id`, but an explicit column aids query performance.

**Decision: Add `BranchID` to both `StockMovement` and `InventoryAdjustment` for direct branch-scoped queries.**

#### 5. AutoMigrate changes needed

In `db.go` `Migrate()`:
```go
&domain.Branch{},
&domain.UserBranch{},
```

---

### B. Backend — Branch Entity & Service

#### Package layout

```
internal/
├── domain/
│   ├── branch.go          ← Branch struct + BranchRepository interface
│   │                          + UserBranch struct + UserBranchRepository interface
├── branch/
│   └── service.go          ← BranchService (CRUD + user-branch assignment)
├── platform/storage/postgres/
│   ├── branch_repository.go
│   └── user_branch_repository.go
├── transport/http/v1/
│   └── handler_branch.go   ← branch CRUD handlers
```

#### Repository interfaces

```go
// domain/branch.go
type Branch struct {
    ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
    Name      string    `json:"name"       gorm:"not null"`
    Address   string    `json:"address"`
    City      string    `json:"city"`
    Phone     string    `json:"phone"`
    Email     string    `json:"email"`
    IsActive  bool      `json:"is_active"  gorm:"not null;default:true"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type BranchRepository interface {
    GetByID(id uint) (*Branch, error)
    List(filters map[string]any, page, perPage int) ([]*Branch, int64, error)
    ListByUserID(userID uint) ([]*Branch, error)
    ListAllActive() ([]*Branch, error)
    Create(b *Branch) error
    Update(b *Branch) error
    Delete(id uint) error
}

type UserBranch struct {
    ID        uint      `json:"id"         gorm:"primaryKey;autoIncrement"`
    UserID    uint      `json:"user_id"    gorm:"not null;uniqueIndex:uq_user_branch"`
    BranchID  uint      `json:"branch_id"  gorm:"not null;uniqueIndex:uq_user_branch"`
    IsPrimary bool      `json:"is_primary" gorm:"not null;default:false"`
    CreatedAt time.Time `json:"created_at"`
    
    User   *User   `json:"user,omitempty"   gorm:"foreignKey:UserID"`
    Branch *Branch `json:"branch,omitempty" gorm:"foreignKey:BranchID"`
}

type UserBranchRepository interface {
    GetByUserAndBranch(userID, branchID uint) (*UserBranch, error)
    ListByUserID(userID uint) ([]*UserBranch, error)
    ListByBranchID(branchID uint) ([]*UserBranch, error)
    SetBranches(userID uint, assignments []UserBranchAssignment) error
    Delete(userID, branchID uint) error
}
```

#### Service methods

Branch Service:
- `Create`, `Update`, `Delete`, `GetByID`, `List`
- `SetUserBranches(userID uint, assignments...)` — replaces all user_branch rows
- `GetBranchesForUser(userID uint, role domain.Role)` — returns branches; admin gets all active; non-admin gets assigned only

#### LoginOutput enrichment

`LoginOutput` gets a new field `Branches []BranchDTO`.

`auth/service.go` `Login()` now also calls `branchRepo.GetBranchesForUser(user.ID, user.Role)` or `userBranchRepo.ListByUserID(user.ID)`.

---

### C. Auth & Middleware

#### Middleware placement in routes.go

The `BranchContext` middleware must run AFTER `Authenticate` (needs claims) and BEFORE scoped handlers. Placement:

```go
protected := v1.Group("/")
protected.Use(jwtauth.Authenticate(h.revokedTokens))
{
    // Branch CRUD — admin-only, NO BranchContext middleware (admin manages branches globally)
    branches := protected.Group("/branches")
    branches.Use(jwtauth.RequireRole(domain.RoleAdmin))
    {
        branches.GET("", h.ListBranches)
        branches.GET("/:id", h.GetBranch)
        branches.POST("", h.CreateBranch)
        branches.PUT("/:id", h.UpdateBranch)
        branches.PATCH("/:id/deactivate", h.DeactivateBranch)
    }
    
    // User-branch assignment — admin-only
    adminBranchUsers := protected.Group("/branches/:id/users")
    adminBranchUsers.Use(jwtauth.RequireRole(domain.RoleAdmin))
    {
        adminBranchUsers.GET("", h.ListBranchUsers)
        adminBranchUsers.PUT("", h.SetBranchUsers)
    }
    
    // Auth endpoints — no branch context needed
    auth := protected.Group("/auth")
    {
        auth.POST("/logout", h.Logout)
        auth.GET("/me", h.Me)
        auth.POST("/refresh", h.Refresh)
    }
    
    // ALL scoped routes use BranchContext middleware
    scoped := protected.Group("/")
    scoped.Use(BranchContext(branchRepo))  // ← added here
    {
        // appointments, sales, cash-closes, daily-activity, inventory, etc.
    }
    
    // Some admin endpoints without branch scope (notifications, users, etc.) stay outside scoped group
}
```

**Important:** The `BranchContext` middleware should use `h.branchRepo`, but middleware is a `gin.HandlerFunc`. The factory pattern creates a closure:

```go
func BranchContext(branchRepo domain.BranchRepository, userBranchRepo domain.UserBranchRepository) gin.HandlerFunc {
    return func(c *gin.Context) { ... }
}
```

#### JWT Claims changes

**No changes needed.** The branch context is header-based (D-04), not JWT-based. The JWT remains stateless — branch is selected per session, not baked into the token. This allows a user to switch branches without re-authenticating.

#### BranchContext middleware signature

```go
func BranchContext(
    branchRepo domain.BranchRepository,
    userBranchRepo domain.UserBranchRepository,
) gin.HandlerFunc {
    return func(c *gin.Context) {
        branchIDStr := c.GetHeader("X-Branch-ID")
        
        // Empty header — only allowed for admin users on admin-global endpoints
        // (those endpoints won't be in the scoped group)
        if branchIDStr == "" {
            c.AbortWithStatusJSON(400, gin.H{"message": "X-Branch-ID header is required"})
            return
        }
        
        branchID, err := strconv.ParseUint(branchIDStr, 10, 64)
        if err != nil {
            c.AbortWithStatusJSON(400, gin.H{"message": "X-Branch-ID must be a valid integer"})
            return
        }
        
        branch, err := branchRepo.GetByID(uint(branchID))
        if err != nil {
            c.AbortWithStatusJSON(404, gin.H{"message": "Branch not found"})
            return
        }
        
        if !branch.IsActive {
            c.AbortWithStatusJSON(400, gin.H{"message": "Branch is inactive"})
            return
        }
        
        claims, ok := GetClaims(c)
        if !ok {
            c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
            return
        }
        
        // Admin bypass: skip user_branches membership check
        if claims.Role != domain.RoleAdmin {
            _, err := userBranchRepo.GetByUserAndBranch(claims.UserID, uint(branchID))
            if err != nil {
                c.AbortWithStatusJSON(403, gin.H{"message": "You do not have access to this branch"})
                return
            }
        }
        
        c.Set("branch_id", uint(branchID))
        c.Next()
    }
}
```

#### BranchIDFromCtx helper

```go
func BranchIDFromCtx(c *gin.Context) uint {
    v, exists := c.Get("branch_id")
    if !exists {
        return 0
    }
    id, ok := v.(uint)
    if !ok {
        return 0
    }
    return id
}
```

#### X-Branch-ID header validation logic

- Parse header string → uint
- Validate branch exists (200 OK repo call)
- Validate `is_active = true`
- Non-admin: validate `user_branches` row exists for (user_id, branch_id)
- Set `branch_id` in Gin context
- Return 400 if invalid format, 404 if branch missing, 403 if no access, 400 if inactive

---

### D. Scoped Query Propagation

#### EXHAUSTIVE table of every handler and repository method that needs branch_id filtering

##### Handler → Service → Repository Propagation Chain

**Appointments:**

| Handler (handler_appointment.go) | Handler Method | Service Method (appointment/service.go) | Repository Method (appointment_repository.go) | Changes Needed |
|------|------|------|------|------|
| `ListAppointments` | GET /appointments | `List(filters, page, perPage)` | `List(filters, page, perPage)` | Add `branch_id` to filters from `BranchIDFromCtx(c)` |
| `GetAppointment` | GET /appointments/:id | `GetByID(id)` | `GetByID(id)` | Add branch_id scope check to repository |
| `CreateAppointment` | POST /appointments | `Create(input, userID)` → **needs `Create(input, userID, branchID)`** | `Create(a)` | Set `a.BranchID = branchID` before create |
| `UpdateAppointment` | PUT /appointments/:id | `Update(id, input)` | `Update(a)` | Repository should scope update to branch_id |
| `DeleteAppointment` | DELETE /appointments/:id | `Delete(id)` | `Delete(id)` | Repository should scope delete to branch_id |
| `TakeAppointment` | POST /appointments/:id/take | `Take(id, userID)` | `Update` | Scope to branch |
| `PauseAppointment` | POST /appointments/:id/pause | `Pause(id)` | `Update` | Scope to branch |
| `ResumeAppointment` | POST /appointments/:id/resume | `Resume(id)` | `Update` | Scope to branch |
| `SaveManagementReport` | POST /management-report/:id | `SaveManagementReport(id, input)` | `SaveManagementReport` | Scope to branch |
| `GetConsolidatedReport` | GET /specialist-reports/consolidated | Get report | `GetConsolidatedReport` | Add `branch_id` to raw SQL WHERE clause |
| `GetSpecialistReportDetail` | GET /specialist-reports/specialists/:id | Get detail | Per-appointment queries | Filter by branch |
| `HasConflictForSpecialist` | internal | Conflict check | `HasConflictForSpecialist` | Add branch_id filter |
| `GetBookedTimesForSpecialist` | GET /available-slots | Get slots | `GetBookedTimesForSpecialist` | Add branch_id filter |
| `GetActiveBySpecialist` | internal | Active check | `GetActiveBySpecialist` | Add branch_id filter |
| `ExistsByPatientAndDate` | Used by bulk import | Check | `ExistsByPatientAndDate` | Add branch_id filter |

**Sales:**

| Handler (handler_sale.go) | Handler Method | Service Method | Repository Method | Changes Needed |
|------|------|------|------|------|
| `ListSales` | GET /sales | `List(filters, page, perPage)` | `List(filters, page, perPage)` | Add branch_id to filters |
| `GetSale` | GET /sales/:id | `GetByID(id)` | `GetByID(id)` | Add branch scope check |
| `CreateSale` | POST /sales | `Create(input, userID)` → needs branchID | `Create(s)` | Set `s.BranchID` |
| `UpdateSale` | PUT /sales/:id | `Update(id, input)` | `Update(s)` | Scope to branch |
| `DeleteSale` | DELETE /sales/:id | `Delete(id)` | `Delete(id)` | Scope to branch |
| `AddSalePayment` | POST /sales/:id/payments | Payment add | `AddPayment` | Scope to branch |
| `RemoveSalePayment` | DELETE /sales/:id/payments/:paymentId | Payment remove | `RemovePayment` | Scope to branch |
| `CancelSale` | POST /sales/:id/cancel | Cancel | Cancel | Scope to branch |
| `GetSaleStats` | GET /sales/stats | `GetStats()` | `GetStats()` → needs `GetStats(branchID)` | Add branch_id filter |
| `GetSaleTodayStats` | GET /sales/stats/today | `GetTodayStats()` | `GetTodayStats()` → needs `GetTodayStats(branchID)` | Add branch_id filter |

**Cash Register Closes:**

| Handler | Handler Method | Service Method | Repository Method | Changes Needed |
|------|------|------|------|------|
| `ListCashRegisterCloses` | GET | `List(filters, page, perPage, role, userID)` → add branchID | `List(filters, page, perPage)` | Add branch_id to all queries |
| `GetCashRegisterClose` | GET /:id | `GetByID(id, role, userID)` | `GetByID(id)` | Add branch scope |
| `CreateCashRegisterClose` | POST | `Create(input, userID)` → add branchID | `Create(c, payments, denoms)` | Set `c.BranchID` |
| `UpdateCashRegisterClose` | PUT /:id | Update | Update | Scope to branch |
| `SubmitCashRegisterClose` | POST /:id/submit | Submit | Update | Scope to branch |
| `ApproveCashRegisterClose` | POST /:id/approve | Approve | Update | Scope to branch |
| `ReturnCashRegisterCloseToDraft` | POST /:id/return | Return | Update | Scope to branch |
| `PutCashRegisterCloseAdminActuals` | PUT /:id/admin-actuals | Admin actuals | `SyncActualPayments` | Scope to branch |
| `ListCashRegisterClosesAdvisorsPending` | GET | `AdvisorsPending()` | `ListByStatuses` | Add branch_id filter |
| `GetCashRegisterClosesConsolidated` | GET | `Consolidated(from, to)` → add branchID | Aggregation queries | Add branch filter |
| `GetCashRegisterClosesCalendar` | GET | `CalendarForAdvisor(userID, from, to)` | `ListByUserAndDateRange` | Add branch filter |

**Daily Activity Reports:**

| Handler | Handler Method | Service Method | Repository Method | Changes Needed |
|------|------|------|------|------|
| `ListDailyActivityReports` | GET | `List(filters, page, perPage)` | `List(filters, page, perPage)` | Add branch_id to filters |
| `GetDailyActivityReport` | GET /:id | `GetByID(id)` | `GetByID(id)` | Add branch scope |
| `CreateDailyActivityReport` | POST | `Create(input, userID)` → add branchID | `Create(r)` | Set `r.BranchID` |
| `UpdateDailyActivityReport` | PUT /:id | Update | `Update(r)` | Scope to branch |
| `FindByUserAndDate` | Internal | Find | `FindByUserAndDate` | Add branch filter |

**Inventory (rename clinic_id → branch_id):**

| Handler | Changes Needed |
|------|------|
| `ListWarehouses` | Add branch_id scope from context |
| `GetWarehouse` | Scope to branch |
| `CreateWarehouse` | Set BranchID from context |
| `UpdateWarehouse` | Scope to branch |
| `DeleteWarehouse` | Scope to branch |
| `ListWarehouseLocations` | Scope to branch |
| `CreateWarehouseLocation` | Set BranchID from context |
| `ListInventoryItems` | Scope to branch |
| `CreateInventoryItem` | Set BranchID from context |
| `ListInventoryTransfers` | Scope to branch |
| `CreateInventoryTransfer` | Set BranchID from context |
| `CompleteInventoryTransfer` | Scope to branch |
| `CancelInventoryTransfer` | Scope to branch |
| `AdjustInventory` | Scope to branch |
| `CreateInventoryAdjustment` | Set BranchID from context (via inventory_item) |
| `ListInventoryAdjustments` | Scope to branch |
| `ApproveInventoryAdjustment` | Scope to branch |
| `RejectInventoryAdjustment` | Scope to branch |
| `ListStockMovements` | Scope to branch |
| `ListLensCatalog` | Global — no branch scope needed (lenses are global) |
| `GetProductStock` | Scope to branch |
| `GetProductInventorySummary` | Scope to branch |

**Clinical Records (rename clinic_id → branch_id):**

| Handler | Changes Needed |
|------|------|
| `GetAppointmentClinicalRecord` | Scope to branch |
| `CreateAppointmentClinicalRecord` | Set BranchID from context (derive from appointment's BranchID) |
| `UpsertAppointmentAnamnesis` | Pass BranchID to Upsert |
| `UpsertAppointmentVisualExam` | Pass BranchID to Upsert |
| `UpsertAppointmentDiagnosis` | Pass BranchID to Upsert |
| `UpsertAppointmentPrescription` | Pass BranchID to Upsert |
| `SignAppointmentClinicalRecord` | Scope to branch |

---

### E. Frontend

#### AuthContext changes

`AuthContext.tsx` modifications:
- Add `branches: Branch[]` to context type
- After login: read `branches` from API response, store in state
- If branches.length === 1: auto-select and continue to dashboard
- If branches.length > 1: navigate to `/select-branch`
- Add `selectedBranch: { id: number; name: string } | null` to context
- On logout: clear `convision_branch_id` and `convision_branch_name` from localStorage

#### New BranchContext.tsx

```tsx
// src/contexts/BranchContext.tsx
interface Branch {
    id: number;
    name: string;
    city?: string;
    is_primary: boolean;
}

interface BranchContextType {
    branches: Branch[];
    selectedBranch: Branch | null;
    selectBranch: (branch: Branch) => void;
    clearBranch: () => void;
    isBranchSelected: boolean;
}

export const BranchContext = createContext<BranchContextType | null>(null);

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (!context) throw new Error('useBranch must be used within BranchProvider');
    return context;
};

export const BranchProvider: React.FC<{ children: React.ReactNode; initialBranches: Branch[] }> = ({ children, initialBranches }) => {
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(() => {
        const storedId = localStorage.getItem('convision_branch_id');
        const storedName = localStorage.getItem('convision_branch_name');
        if (storedId && storedName) {
            return initialBranches.find(b => b.id === Number(storedId)) || null;
        }
        return null;
    });

    const selectBranch = (branch: Branch) => {
        localStorage.setItem('convision_branch_id', String(branch.id));
        localStorage.setItem('convision_branch_name', branch.name);
        setSelectedBranch(branch);
    };

    const clearBranch = () => {
        localStorage.removeItem('convision_branch_id');
        localStorage.removeItem('convision_branch_name');
        setSelectedBranch(null);
    };

    return (
        <BranchContext.Provider value={{
            branches: initialBranches,
            selectedBranch,
            selectBranch,
            clearBranch,
            isBranchSelected: !!selectedBranch,
        }}>
            {children}
        </BranchContext.Provider>
    );
};
```

#### Axios interceptor changes

In `axios.ts`, add after the existing auth interceptor:

```ts
const branchId = localStorage.getItem('convision_branch_id');
if (branchId) {
    config.headers['X-Branch-ID'] = branchId;
}
```

This is already spec'd in 14-CONTEXT.md §D-09.

#### New SelectBranchPage.tsx

Route: `/select-branch`

- Uses the Figma design ref node-id 898-79
- Cards showing each branch with name, city, is_primary badge
- On click: call `selectBranch()` and navigate to `/`
- Must use existing shadcn/ui `Card` components
- UI text in Spanish: "Selecciona tu sede", "Sede principal", etc.

#### App.tsx route changes

Add route:
```tsx
{
    path: "/select-branch",
    element: (
        <ProtectedRoute>
            <SelectBranchPage />
        </ProtectedRoute>
    ),
},
```

Add branch guard to `ProtectedRoute`: if authenticated, user has branches > 1, and no branch selected, redirect to `/select-branch`.

#### Auth service changes

In `auth.ts` `login()`:
- After successful login, also store branches in localStorage: `convision_branches`
- Return branches as part of AuthResponse type

Updated `AuthResponse` interface:
```ts
interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
    branches: Branch[];
}
```

---

### F. Phase 13 Interaction

Phase 13 (Unified Product-Inventory WMS) creates:
- `stock_movements` table (migration 000016, no clinic/branch column)
- `inventory_adjustments` table (migration 000016, no clinic/branch column)

**Coordinated changes needed:**
1. Phase 13 runs first → creates stock_movements and inventory_adjustments without branch_id
2. Phase 14 migration (000017) adds `branch_id` to both tables
3. Phase 14 domain structs for `StockMovement` and `InventoryAdjustment` get `BranchID` field
4. Phase 14 inventory service methods must be updated to set BranchID on creates and filter on reads

**No circular dependency:** Phase 13 creates the tables; Phase 14 extends them. This is a sequential dependency, not circular.

**Recommendation:** Since both phases are being planned simultaneously, coordinate that:
- Phase 13 domain structs already include `BranchID uint` field (default 0)
- Phase 13 repositories don't filter on it yet
- Phase 14 activates the filtering
- OR simpler: Phase 13 creates tables without the column, Phase 14 adds it. Either works with dev wipe.

---

### G. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missing `branch_id` on a scoped query → data leak across branches | High | Exhaustive checklist (section D). Write integration tests per handler verifying branch isolation. |
| `clinic_id` references a phantom `clinics` table that doesn't exist in Go migrations | Medium | Drop FK constraint before renaming, add new FK to branches. Verify no code references `clinics` table. |
| Frontend branch guard not covering all routes → bypass | Medium | Route guard in `ProtectedRoute` checks for branch selection. Test all role routes. |
| Admin can see data from wrong branch without realizing it | Medium | Admin branch selector shows current branch clearly in header/navbar. Add branch indicator badge. |
| Token refresh clears branch context | Low | Refresh endpoint doesn't affect branch context (it's in localStorage, not JWT). |
| CashTransfers and Orders not branch-scoped → inconsistent data | Low | Decision: keep them global for now. Document as deferred. |
| Phase 13/14 migration order conflict | Low | Sequential — Phase 13 runs first, Phase 14 extends. No conflict. |
| `BranchIDFromCtx` returns 0 silently | High | All handlers must check `branchID != 0` before using it. Add `MustBranchIDFromCtx` that panics or aborts. |
| Middleware placement — some endpoints accidentally in scoped group | Medium | Careful routing: branch CRUD, auth endpoints, and global lookups must be OUTSIDE `scoped` group. |

---

## File-by-File Change Map

| Layer | Files |
|-------|-------|
| **Domain — NEW** | `internal/domain/branch.go` (Branch + UserBranch structs + repository interfaces) |
| **Domain — MOD** | `internal/domain/appointment.go` (add `BranchID` field) |
| | `internal/domain/sale.go` (add `BranchID` field on Sale) |
| | `internal/domain/cash.go` (add `BranchID` on CashRegisterClose, DailyActivityReport) |
| | `internal/domain/clinical_record.go` (rename `ClinicID` → `BranchID` on ClinicalRecord, Anamnesis, VisualExam, Diagnosis, ClinicalPrescription) |
| | `internal/domain/inventory.go` (rename `ClinicID` → `BranchID` on Warehouse, WarehouseLocation, InventoryItem, InventoryTransfer; add `BranchID` to StockMovement, InventoryAdjustment) |
| **Repos — MOD** | `internal/platform/storage/postgres/appointment_repository.go` (add branch_id to all queries; add to filterAllowlist) |
| | `internal/platform/storage/postgres/sale_repository.go` (add branch_id to all queries; add to filterAllowlist; scope stats) |
| | `internal/platform/storage/postgres/cash_register_close_repository.go` (add branch_id to all queries) |
| | `internal/platform/storage/postgres/daily_activity_repository.go` (add branch_id to all queries) |
| **Repos — NEW** | `internal/platform/storage/postgres/branch_repository.go` |
| | `internal/platform/storage/postgres/user_branch_repository.go` |
| **Service — NEW** | `internal/branch/service.go` |
| **Service — MOD** | `internal/auth/service.go` (Login calls branch repo for branches list; LoginOutput gets Branches field) |
| | `internal/appointment/service.go` (CreateInput gets BranchID; List filters include branch_id) |
| | `internal/sale/service.go` (CreateInput gets BranchID; List filters include branch_id) |
| | `internal/cashclose/service.go` (CreateInput gets BranchID) |
| | `internal/dailyactivity/service.go` (CreateInput gets BranchID) |
| | `internal/inventory/service.go` (all create/update set BranchID from context) |
| | `internal/clinicalrecord/service.go` (Upsert methods pass BranchID) |
| **Middleware — NEW** | `internal/transport/http/v1/branch_middleware.go` (BranchContext factory, BranchIDFromCtx helper) |
| **Handlers — MOD** | `internal/transport/http/v1/handler.go` (Handler struct gets branch service; NewHandler accepts branch service) |
| | `internal/transport/http/v1/handler_appointment.go` (all handlers read BranchIDFromCtx) |
| | `internal/transport/http/v1/handler_sale.go` (all handlers read BranchIDFromCtx) |
| | `internal/transport/http/v1/handler_cash_register_close.go` (all handlers read BranchIDFromCtx) |
| | `internal/transport/http/v1/handler_inventory.go` (all handlers read BranchIDFromCtx; rename clinic references) |
| | `internal/transport/http/v1/handler_clinical_record.go` (pass BranchID) |
| **Handlers — NEW** | `internal/transport/http/v1/handler_branch.go` (branch CRUD + user-branch assignment handlers) |
| **Routes — MOD** | `internal/transport/http/v1/routes.go` (add branch routes, apply BranchContext middleware to scoped group, restructure group layout) |
| **DI — MOD** | `cmd/api/main.go` (wire branchRepo, userBranchRepo, branchService; inject into authService and handler) |
| **DB — MOD** | `internal/platform/storage/postgres/db.go` (add Branch and UserBranch to AutoMigrate) |
| **Migrations — NEW** | `db/migrations/platform/000017_create_branches_and_scoped_columns.up.sql` |
| | `db/migrations/platform/000017_create_branches_and_scoped_columns.down.sql` |
| **Frontend — NEW** | `convision-front/src/contexts/BranchContext.tsx` |
| **Frontend — NEW** | `convision-front/src/pages/SelectBranchPage.tsx` |
| **Frontend — MOD** | `convision-front/src/contexts/AuthContext.tsx` (add branch state, auto-select logic, navigate to branch selector) |
| **Frontend — MOD** | `convision-front/src/lib/axios.ts` (add X-Branch-ID header to request interceptor) |
| **Frontend — MOD** | `convision-front/src/services/auth.ts` (update AuthResponse type, store branches, clear on logout) |
| **Frontend — MOD** | `convision-front/src/App.tsx` (add /select-branch route, add BranchProvider wrapper, branch guard in ProtectedRoute) |

---

## Middleware Wiring Diagram

```
                                Inbound HTTP Request
                                       │
                                       ▼
                              [Gin Router: /api/v1]
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
     POST /auth/login           GET /health              Static /uploads
     (no auth needed)          (no auth needed)          (no auth needed)
            │
            ▼
     [AuthService.Login()]
            │
     Returns { token, user, branches[] }
            │
            ▼
     Frontend stores token + branches
            │
            ▼
     ┌─────────────────────────────────────────────────┐
     │ Frontend: Branch select or auto-select          │
     │ Stores: convision_branch_id, convision_branch_name │
     └─────────────────────────────────────────────────┘
            │
            ▼
     Axios interceptor: Attach X-Branch-ID header
     Authorization: Bearer <token>
            │
            ▼
╔═══════════════════════════════════════════════════════════╗
║                   GIN MIDDLEWARE CHAIN                     ║
║                                                           ║
║  1. Recovery (panic handler)                               ║
║  2. Logger (Zap)                                          ║
║  3. Authenticate (JWT validation → c.Set("claims", ...))  ║
║  4. RequireRole (RBAC check)                              ║
║  5. BranchContext (read X-Branch-ID → validate → set)     ║  ← NEW
║  6. Handler                                               ║
╚═══════════════════════════════════════════════════════════╝
            │
            ▼
     Handler reads: claims (JWT) + branch_id (context)
            │
            ▼
     Handler → Service → Repository
     Service/Repo filter by branch_id
```

**Routing structure after Phase 14:**

```
/api/v1/
├── auth/
│   ├── POST /login       → public (no middleware)
│   ├── GET  /me          → Authenticate only
│   ├── POST /logout      → Authenticate only
│   └── POST /refresh     → Authenticate only
├── guest/...             → public
├── clinical-histories/...→ public (legacy)
├── branches/             → Authenticate + RequireRole(admin)
│   ├── GET  /            → ListBranches
│   ├── GET  /:id         → GetBranch
│   ├── POST /            → CreateBranch
│   ├── PUT  /:id         → UpdateBranch
│   └── PATCH /:id/deactivate → DeactivateBranch
├── branches/:id/users/   → Authenticate + RequireRole(admin)
│   ├── GET  /            → ListBranchUsers
│   └── PUT  /            → SetBranchUsers
├── users/                → Authenticate + RequireRole(admin) (no branch)
├── patients/             → Authenticate + BranchContext (patient data is global, but operations may be branch-tracked)
├── [SCOPED GROUP]        → Authenticate + RequireRole + BranchContext
│   ├── appointments/     → all handlers get BranchIDFromCtx
│   ├── sales/            → all handlers get BranchIDFromCtx
│   ├── cash-register-closes/ → all handlers get BranchIDFromCtx
│   ├── daily-activity-reports/ → all handlers get BranchIDFromCtx
│   ├── warehouses/       → all handlers get BranchIDFromCtx
│   ├── inventory-items/  → all handlers get BranchIDFromCtx
│   ├── inventory/        → all handlers get BranchIDFromCtx
│   ├── inventory-transfers/ → all handlers get BranchIDFromCtx
│   ├── products/         → read: BranchContext; write: global (product catalog is global)
│   └── ...               → other scoped routes
├── dashboard/            → BranchContext (dashboard shows branch-specific summary)
└── [GLOBAL GROUP]        → Authenticate + RequireRole (no BranchContext)
    ├── admin/notifications/
    ├── specialists/
    └── ...               → other global routes
```

---

## Frontend State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER NAVIGATES TO /login                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ LoginPage: User enters email + password                      │
│ Calls authService.login(email, password)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/v1/auth/login → Response:                          │
│ { access_token, token_type, expires_in, user, branches[] }   │
│                                                              │
│ authService.login() stores:                                  │
│   localStorage: access_token, token_type, auth_user           │
│   localStorage: convision_branches (JSON)                     │
│ Returns { user, branches } to AuthContext                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ AuthContext.login() checks branches.length:                   │
│                                                              │
│  branches.length === 1?                                       │
│    ├── YES → auto-select:                                    │
│    │   set branch in localStorage + context                   │
│    │   navigate to role dashboard                             │
│    │                                                          │
│    └── NO (branches.length > 1):                              │
│        navigate('/select-branch')                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ /select-branch                                               │
│                                                              │
│ SelectBranchPage renders cards for each branch:               │
│   - Branch name                                               │
│   - Branch city (if available)                                │
│   - "Sede principal" badge if is_primary                      │
│                                                              │
│ User clicks a branch card:                                    │
│   1. branchContext.selectBranch(branch)                       │
│      → localStorage: convision_branch_id, convision_branch_name│
│   2. navigate('/') → HomePage → redirects to role dashboard   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ ProtectedRoute (all authenticated routes):                   │
│                                                              │
│ 1. Check isAuthenticated → yes                               │
│ 2. Check allowedRoles → match                                │
│ 3. Check branch selection →                                  │
│    if branches.length > 1 AND no branch selected:             │
│      redirect to /select-branch                              │
│    else: render children                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Every API call via axios:                                    │
│                                                              │
│ Request interceptor attaches:                                │
│   Authorization: Bearer <token>                              │
│   X-Branch-ID: <branch_id from localStorage>                  │
│                                                              │
│ On 403 from BranchContext middleware:                        │
│   - Branch deactivated or access revoked                     │
│   - Redirect to /select-branch with error message            │
│                                                              │
│ On logout:                                                   │
│   - Clear convision_branch_id, convision_branch_name          │
│   - Clear token, user from localStorage                      │
│   - Navigate to /login                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Architecture

### Go Unit Tests

| Test File | Tests |
|-----------|-------|
| `internal/branch/service_test.go` | Branch CRUD, user-branch assignment, GetBranchesForUser (admin vs non-admin) |
| `internal/auth/service_test.go` | Login returns branches list, Login with no branches returns empty array |
| `internal/transport/http/v1/branch_middleware_test.go` | Valid branch_header → sets context; missing header → 400; inactive branch → 400; user not in branch → 403; admin bypass; invalid header → 400 |
| `internal/platform/storage/postgres/appointment_repository_test.go` | List scoped to branch; Create sets branch; GetByID validates branch match |
| `internal/platform/storage/postgres/sale_repository_test.go` | Stats scoped to branch; List scoped to branch |
| `internal/platform/storage/postgres/cash_register_close_repository_test.go` | All methods scoped to branch |

### Integration Smoke Tests (curl commands)

```bash
# 1. Login as admin → get token + branches list
curl -s 'http://localhost:8001/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.com","password":"password"}' | jq .

# 2. Login as specialist → get token + branches list
curl -s 'http://localhost:8001/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"specialist@convision.com","password":"password"}' | jq .

# 3. Create a branch (admin)
curl -s 'http://localhost:8001/api/v1/branches' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sede Norte","city":"Medellín"}' | jq .

# 4. Assign user to branch (admin)
curl -s -X PUT 'http://localhost:8001/api/v1/branches/2/users' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '[{"user_id":2,"is_primary":true}]' | jq .

# 5. List appointments with branch header (specialist branch 1)
curl -s 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-Branch-ID: 1' | jq .

# 6. Try listing appointments with branch user doesn't have access to (should 403)
curl -s 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-Branch-ID: 2' | jq .

# 7. Admin can access any branch
curl -s 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'X-Branch-ID: 2' | jq .

# 8. Create appointment with branch header
curl -s -X POST 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-Branch-ID: 1' \
  -H 'Content-Type: application/json' \
  -d '{"patient_id":1,"specialist_id":2,"scheduled_at":"2026-05-01T09:00:00Z"}' | jq .

# 9. Verify appointment is in branch 1 list but NOT branch 2 list
curl -s 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'X-Branch-ID: 1' | jq '.data | length'
curl -s 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <admin_token>' \
  -H 'X-Branch-ID: 2' | jq '.data | length'
```

### Frontend Verification

| Check | Method |
|-------|--------|
| Login returns branches in response | Check network tab for POST /auth/login response |
| Single branch → auto-redirect to dashboard | Login with user assigned to only 1 branch |
| Multiple branches → branch selector shown | Login with user assigned to 2+ branches |
| Branch selector shows names + primary badge | Visual check |
| Selecting branch → navigates to dashboard | Click on branch card |
| X-Branch-ID header on all requests | Check network tab for any data request |
| Logout clears branch from localStorage | DevTools Application tab |
| Branch in header/navbar visible | Visual check on any page |

### Migration Verification SQL

```sql
-- After running 000017 migration:
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE column_name IN ('branch_id', 'clinic_id')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Verify no table has both clinic_id AND branch_id (rename should eliminate clinic_id)
-- Verify branches table exists with seed row
SELECT * FROM branches;
-- Expected: at least id=1, name='Principal'

-- Verify FK constraints exist on scoped tables
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'branch_id'
ORDER BY tc.table_name;
```

---

## Key Decisions for Planner

1. **Branch package location:** Create `internal/branch/service.go` (dedicated package, follows "one package per feature" rule from DEVELOPMENT_GUIDE.md).

2. **Middleware integration point:** BranchContext middleware runs AFTER `Authenticate` and `RequireRole` but BEFORE handlers. The `scoped` route group applies it to all branch-isolated endpoints.

3. **No `POST /auth/select-branch` endpoint needed.** Branch selection is purely a frontend concept. The backend validates via `X-Branch-ID` header on every scoped request.

4. **CashTransfer is NOT branch-scoped for Phase 14.** Cash transfers between branches are deferred per 14-CONTEXT.md §Deferred.

5. **Orders and Quotes are NOT branch-scoped for Phase 14.** They share the same patient/sale domain and may need branch scoping in a future phase. Current decision: leave them global.

6. **StockMovement and InventoryAdjustment (Phase 13) get explicit `branch_id` column.** Even though branch can be derived from the warehouse relationship, an explicit column is cleaner for direct queries and matches the pattern of other scoped tables.

7. **JSON tag for the renamed column changes from `"clinic_id"` to `"branch_id"`.** Dev wipe allowed. The Go struct field name becomes `BranchID` (English rule). No backward-compatibility needed.

8. **Migration approach for `clinic_id` → `branch_id` rename:** Drop existing FK constraint to `clinics` (which is a phantom table), rename column, add new FK to `branches`. For tables without an FK (warehouses, warehouse_locations, inventory_items, inventory_transfers), just rename and add FK.

9. **Seed branch:** Migration inserts `id=1, name='Principal'`. All existing data gets `branch_id=1`. In production, this is the default/main branch.

10. **Admin endpoints without BranchContext:** Branch CRUD, user-branch assignment, user management, notifications, bulk import — these are admin-global and do NOT go through the scoped group.

11. **Clinical records store BranchID from appointment context.** When creating a clinical record for an appointment, the appointment already has a BranchID — the clinical record inherits it.

12. **Frontend branch guard:** `ProtectedRoute` checks for branch selection when `branches.length > 1`. Single-branch users skip the selector entirely.

13. **Error messages in Spanish:** All middleware rejection messages and branch-selector UI text are in Spanish per project convention.

14. **No `BranchID` in JWT Claims.** Branch context is header-based. This allows switching branches without re-authentication.

---
