# PRD: Roles & Permissions Module (RBAC) — Phase 19

**Status:** Ready for GSD planning
**Target:** `convision-api-golang/` + `convision-front/`
**Date:** 2026-05-06
**Stack:** Go 1.22 + Gin v1.10 + GORM v1.25 + PostgreSQL 15+, JWT v5, React 18 + TypeScript
**Project conventions:** `convision-api-golang/DEVELOPMENT_GUIDE.md` (3-layer arch),
`convision-api-golang/DATABASE_GUIDE.md` (PG types, indexes, soft-delete)

---

## 1. Current State — Complete Audit

### 1.1 How Authorization Works Today

A single `role` column on the `users` table (`admin` | `specialist` | `receptionist` | `laboratory`) controls ALL access. Route protection uses `jwtauth.RequireRole(domain.RoleAdmin, ...)` directly in `routes.go`. Frontend uses `user.role === 'admin'` in ~50+ locations across ~30 files.

```go
// backend — today (routes.go)
appointments.POST("",
    jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist, domain.RoleReceptionist),
    h.CreateAppointment,
)

// frontend — today (multiple files)
const isAdmin = user?.role === 'admin';
if (user?.role === 'specialist') { ... }
```

```go
// JWT claims — today (jwt.go)
type Claims struct {
    Role domain.Role `json:"role"`  // single string, no permissions
}
```

### 1.2 Complete Endpoint → Current Role Mapping (from routes.go audit)

| Route Group | Endpoints | Current Access |
|---|---|---|
| **Auth (protected)** | logout, change-password, me, refresh | All authenticated |
| **Branches** | CRUD + assign users | Admin only |
| **Users** | CRUD | Admin only |
| **Specialists** | GET /specialists | All authenticated |
| **Patients** | GET (list, get, prescriptions, clinical-history, records) | All authenticated |
| | POST, PUT | Admin + Receptionist |
| | DELETE | Admin only |
| **Prescriptions** | GET (list, get) | All authenticated |
| | POST, PUT | Admin + Specialist |
| | DELETE | Admin only |
| **Appointments** | GET (list, get, available-slots) | All authenticated |
| | POST, PUT, DELETE, pause, resume, annotations | Admin + Specialist + Receptionist |
| | POST /take | Specialist only |
| | GET/POST/PUT clinical-record, anamnesis, visual-exam, diagnosis, prescription, sign | Specialist only (write); Admin+Specialist (read clinical-record) |
| | GET /lens-annotation | Specialist only |
| **Management Report** | GET (list, get) | Admin + Specialist |
| | POST /:id (save) | Specialist only |
| **Specialist Reports** | GET consolidated, detail, POST bulk-upload | Admin only |
| **Catalog** (brands, lens-types, materials, lens-classes, treatments, photochromics, payment-methods) | GET | All authenticated |
| | POST, PUT, DELETE | Admin only |
| **Product Categories** | GET | All authenticated |
| | POST, PUT, DELETE | Admin only |
| **Products** | GET (list, search, by-category, stock, discounts, price, inventory-summary), POST lenses/by-prescription | All authenticated |
| | POST, PUT, DELETE, POST bulk-status | Admin only |
| **Warehouses** | GET (list, get, locations) | All authenticated |
| | POST, PUT, DELETE | Admin only |
| **Warehouse Locations** | GET (list, get, inventory) | All authenticated |
| | POST, PUT, DELETE | Admin only |
| **Inventory Items** | GET (list, get) | All authenticated |
| | POST, PUT, DELETE | Admin only |
| **Inventory Group** | GET (list, lens-catalog, stock, adjustments, movements) | All authenticated |
| | POST adjust, adjustments, PATCH approve/reject | Admin only |
| **Inventory Transfers** | All | Admin only |
| **Discount Requests** | GET | Admin + Receptionist |
| | POST, PUT | Admin + Receptionist |
| | DELETE, POST approve/reject | Admin only |
| **Discounts** | GET (list, best) | All authenticated |
| **Quotes** | GET (list, get, pdf, pdf-token) | Admin + Receptionist |
| | POST, PUT, POST status, POST convert | Admin + Receptionist |
| | DELETE | Admin only |
| **Sales** | GET (list, get, stats, pdf-token, lens-price-adjustments) | Admin + Receptionist |
| | POST, PUT, POST payments, POST cancel | Admin + Receptionist |
| | DELETE, DELETE payments | Admin only |
| | POST lens-price-adjustments, DELETE lens-price-adjustments | Admin + Specialist |
| **Orders** | GET (list, get) | All authenticated |
| | POST | Admin + Specialist + Receptionist |
| | PUT, POST status | Admin + Specialist |
| | DELETE | Admin only |
| | POST payment-status | Admin + Receptionist |
| **Laboratories** | All CRUD | Admin only |
| **Laboratory Orders** | GET (list, get, stats, evidence, pdf-token) | Admin + Specialist + Receptionist |
| | POST, PUT | Admin + Specialist + Receptionist |
| | DELETE | Admin only |
| | POST status | Admin + Specialist + Laboratory + Receptionist |
| | POST evidence | Admin + Receptionist |
| **Portfolio** | All (stats, list, get, calls, close) | Admin + Receptionist |
| **Suppliers** | GET (list, get) | Admin + Receptionist |
| | POST, PUT, DELETE | Admin only |
| **Purchases** | GET, POST, PUT, POST receive | Admin + Receptionist |
| | DELETE | Admin only |
| **Expenses** | GET (stats, list, get), POST, PUT | Admin + Receptionist |
| | DELETE | Admin only |
| **Supplier Payments** | GET | Admin + Receptionist |
| **Payrolls** | All CRUD | Admin only |
| **Service Orders** | GET (stats, list, get) | Admin + Receptionist + Specialist |
| | POST, PUT | Admin + Receptionist |
| | DELETE | Admin only |
| **Cash Transfers** | GET, POST, PUT, POST cancel | Admin + Receptionist |
| | DELETE, POST approve | Admin only |
| **Cash Register Closes** | GET, POST, PUT, POST submit, DELETE | Admin + Specialist + Receptionist |
| | POST approve, POST return, PUT admin-actuals | Admin only |
| | GET advisors-pending, calendar, consolidated | Admin only |
| **Dashboard** | GET summary | Admin + Specialist + Receptionist |
| **Admin Notifications** | All CRUD + summary, read-all, archive | Admin only |
| **Notes** | GET, POST | Admin + Specialist + Receptionist |
| **Bulk Import** | ALL imports + history | Admin only |
| **Daily Activity Reports** | GET (list, get) | Admin + Specialist + Receptionist |
| | POST, PUT, POST close, POST quick-attention | Specialist + Receptionist |
| | POST reopen, GET edit-logs | Admin only |
| **Lookup** | GET patient-data, countries, departments, cities, districts | All authenticated |

### 1.3 Frontend — Every File That Checks `user.role`

**Total: ~50+ checks in ~30 files** that need refactoring:

| File | Lines | Check Type |
|---|---|---|
| `App.tsx` | 167, 182, 196, 201, 215, 229, 231, 233, 235, 260, 262, 264, 266 | Route protection, navigation redirects, branch logic |
| `AuthContext.tsx` | 52, 129, 131, 136, 159, 163, 189, 190, 191, 197 | Login redirect, role helpers, color application |
| `layouts/AdminLayout.tsx` | 88, 185, 194-195 | Navigation menu visibility, sidebar sections |
| `layouts/MainLayout.tsx` | 88, 185 | Menu visibility |
| `SelectBranchPage.tsx` | 72, 74, 76, 154, 159 | Navigation after branch selection |
| `components/admin/AdminTopBar.tsx` | 25, 32 | Quick actions, notifications visibility |
| `pages/admin/Patients.tsx` | 161 | isSpecialist check |
| `pages/receptionist/Appointments.tsx` | 84, 85, 122, 123 | isSpecialist, isAdmin, navigation paths |
| `pages/receptionist/AppointmentDetail.tsx` | 522, 665, 672 | Conditional UI rendering |
| `pages/specialist/SpecialistAppointmentDetail.tsx` | 479 | canTakeAppointment |
| `pages/admin/Sales.tsx` | 421, 541 | Navigation base path |
| `pages/admin/CashCloses.tsx` | 134 | Filter users by role |
| `pages/admin/CashCloseDetail.tsx` | 36 | isAdmin check |
| `pages/admin/CashCloseCalendar.tsx` | 207, 208 | Role display labels |
| `pages/admin/DailyReports.tsx` | 37 | Filter users by role |
| `components/admin/DailyReportsFiltersBar.tsx` | 73 | Filter receptionists |
| `pages/admin/AdminDailyReportConsolidatedTab.tsx` | 71 | Filter receptionists |
| `pages/admin/SpecialistManagementReport.tsx` | 65 | Filter specialists |
| `pages/specialist/ManagementReport.tsx` | 60, 70 | isAdmin, filter specialists |
| `pages/specialist/ManagementReportDetail.tsx` | 45 | isAdmin |
| `components/LensRecommendation.tsx` | 91 | isSpecialist |
| `components/discounts/DiscountRequestModal.tsx` | 95 | isAdmin |
| `pages/admin/AdminLabOrderSidebar.tsx` | 44 | Filter specialists |
| `pages/receptionist/LabOrderSidebar.tsx` | 56 | Filter specialists |
| `pages/admin/users/UserCreatePage.tsx` | 46 | Role-based branch requirement |
| `pages/admin/users/UserEditPage.tsx` | 121 | Role display label |
| `pages/admin/users/UserFormFields.tsx` | 39 | Role-based form behavior |
| `pages/admin/users/UserFormShell.tsx` | 48 | Conditional branch selector |
| `pages/admin/users/UserRoleHelpAside.tsx` | 21-28 | Role color + label mapping |
| `pages/admin/users/userSchemas.ts` | 41, 127 | Role-based validation |
| `components/admin/UserBranchAssignment.tsx` | 27 | Role display |
| `components/admin/ReceptionistAdvisorCombobox.tsx` | 27 | Filter receptionists |

### 1.4 AuthContext — Current Role Helpers

```ts
// Today — will become deprecated
isAdmin: () => user?.role === 'admin';
isSpecialist: () => user?.role === 'specialist';
isReceptionist: () => user?.role === 'receptionist';
```

### 1.5 Current JWT Structure

```go
// Today
type Claims struct {
    UserID       uint        `json:"user_id"`
    Email        string      `json:"email"`
    Role         domain.Role `json:"role"`           // single string
    FeatureFlags []string    `json:"feature_flags"`
}
```

---

## 2. Target Architecture

### 2.1 New JWT Structure

```go
// Target
type Claims struct {
    UserID       uint        `json:"user_id"`
    Email        string      `json:"email"`
    UserType     domain.Role `json:"user_type"`      // renamed from Role; UI theming only
    Permissions  []string    `json:"permissions"`     // NEW: ["patients:view","sales:create",...]
    FeatureFlags []string    `json:"feature_flags"`
}
```

### 2.2 Middleware Target

```go
// Target — routes.go after migration
appointments.POST("",
    jwtauth.RequirePermission("appointments:create"),
    h.CreateAppointment,
)
```

### 2.3 Database Model

```
users ──┬── role_type: VARCHAR(30)    ← preserved for UI theming ONLY
        │
        └── user_roles ──▶ roles ──▶ role_permissions ──▶ permissions
                             │                           (module:action)
                             ├── name
                             ├── is_system (cannot delete)
                             └── is_default (auto-assign)
```

### 2.4 Permission Naming Convention

`<module>:<action>` where action ∈ {view, create, edit, delete, manage, approve, export}

The complete permission catalog is listed in Section 4.

---

## 3. Database Design

### 3.1 Migration SQL

```sql
-- Step 1: Rename existing role column to role_type (UI theming only)
ALTER TABLE users RENAME COLUMN role TO role_type;
ALTER TABLE users ALTER COLUMN role_type SET DEFAULT 'receptionist';
ALTER TABLE users ADD CONSTRAINT chk_users_role_type
    CHECK (role_type IN ('admin','specialist','receptionist','laboratory'));

-- Step 2: Create RBAC tables
CREATE TABLE roles (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT uq_roles_name UNIQUE (name) WHERE deleted_at IS NULL
);
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE permissions (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    module      VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permissions_module_action UNIQUE (module, action)
);

CREATE TABLE role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Step 3: Indexes
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
```

### 3.2 GORM Domain Structs

```go
// internal/domain/role.go
type Role struct {
    ID          uint            `gorm:"primaryKey;autoIncrement"`
    Name        string          `gorm:"type:varchar(100);not null"`
    Description string          `gorm:"type:text"`
    IsDefault   bool            `gorm:"not null;default:false"`
    IsSystem    bool            `gorm:"not null;default:false"`
    CreatedBy   *uint           `gorm:"column:created_by"`
    CreatedAt   time.Time       `gorm:"type:timestamptz;not null;default:now()"`
    UpdatedAt   time.Time       `gorm:"type:timestamptz;not null;default:now()"`
    DeletedAt   *time.Time      `gorm:"type:timestamptz;index"`
    Permissions []*Permission   `gorm:"many2many:role_permissions"`
}

type Permission struct {
    ID          uint   `gorm:"primaryKey;autoIncrement"`
    Module      string `gorm:"type:varchar(50);not null"`
    Action      string `gorm:"type:varchar(50);not null"`
    Description string `gorm:"type:varchar(200)"`
    CreatedAt   time.Time `gorm:"type:timestamptz;not null;default:now()"`
}

// internal/domain/user.go — updated
type User struct {
    // ... existing fields ...
    RoleType Role   `json:"role_type" gorm:"column:role_type;type:varchar(30);not null;default:'receptionist'"`
    Roles    []Role `json:"roles,omitempty" gorm:"many2many:user_roles"`
}
```

---

## 4. Complete Permission Catalog + System Role Definitions

### 4.1 All Permission Keys

Based on the complete routes.go audit (Section 1.2), these are ALL permission keys:

```
patients:view     patients:create    patients:edit    patients:delete
appointments:view appointments:create appointments:edit appointments:delete
sales:view        sales:create       sales:edit       sales:delete      sales:approve
quotes:view       quotes:create      quotes:edit      quotes:delete
prescriptions:view prescriptions:create prescriptions:edit prescriptions:delete
clinical_histories:view clinical_histories:create clinical_histories:edit
laboratory:view   laboratory:create  laboratory:edit  laboratory:delete laboratory:manage
inventory:view    inventory:create   inventory:edit   inventory:manage
products:view     products:create    products:edit    products:delete
catalog:view      catalog:create     catalog:edit     catalog:delete
warehouses:view   warehouses:create  warehouses:edit  warehouses:delete
cash_close:view   cash_close:create  cash_close:approve
daily_reports:view daily_reports:create
expenses:view     expenses:create    expenses:edit    expenses:delete
purchases:view    purchases:create   purchases:edit   purchases:delete
suppliers:view    suppliers:create   suppliers:edit   suppliers:delete
payrolls:view     payrolls:create    payrolls:edit    payrolls:delete
service_orders:view service_orders:create service_orders:edit service_orders:delete
cash_transfers:view cash_transfers:create cash_transfers:edit cash_transfers:delete cash_transfers:approve
orders:view       orders:create      orders:edit      orders:delete
portfolio:view    portfolio:manage
discounts:view    discounts:create   discounts:edit   discounts:delete discounts:approve
management_report:view management_report:create
specialist_reports:view specialist_reports:manage
users:view        users:create       users:edit       users:delete
roles_permissions:manage
branches:view     branches:manage
reports:view      reports:export
settings:view     settings:edit
dashboard:view
notes:view        notes:create
bulk_import:manage
laboratory_orders:view laboratory_orders:create laboratory_orders:edit laboratory_orders:delete
notifications:manage
```

### 4.2 System Role: Administrador (`is_system=true`)

ALL permissions above. Every single key.

### 4.3 System Role: Especialista (`is_system=true`)

```
patients:view
appointments:view appointments:create appointments:edit appointments:delete
prescriptions:view prescriptions:create prescriptions:edit
clinical_histories:view clinical_histories:create clinical_histories:edit
laboratory_orders:view
orders:view orders:create orders:edit
management_report:view management_report:create
service_orders:view
dashboard:view
cash_close:view cash_close:create
daily_reports:view daily_reports:create
notes:view notes:create
catalog:view
products:view
laboratory:view
discounts:view
inventory:view
```

### 4.4 System Role: Recepcionista (`is_system=true`)

```
patients:view patients:create patients:edit
appointments:view appointments:create appointments:edit appointments:delete
sales:view sales:create sales:edit sales:approve
quotes:view quotes:create quotes:edit
orders:view orders:create
laboratory_orders:view laboratory_orders:create laboratory_orders:edit
portfolio:view portfolio:manage
suppliers:view
purchases:view purchases:create purchases:edit
expenses:view expenses:create expenses:edit
cash_transfers:view cash_transfers:create cash_transfers:edit
cash_close:view cash_close:create
daily_reports:view daily_reports:create
service_orders:view service_orders:create service_orders:edit
discounts:view discounts:create discounts:edit
dashboard:view
notes:view notes:create
catalog:view
products:view
laboratory:view
inventory:view
```

### 4.5 System Role: Laboratorio (`is_system=true`)

```
laboratory_orders:view laboratory_orders:edit laboratory_orders:manage
laboratory:view
patients:view
catalog:view
products:view
inventory:view
dashboard:view
```

### 4.6 Migration Seed Script (what the seeder does)

```
1. INSERT all 85+ permission keys into `permissions` table
2. INSERT 4 system roles (Administrador, Especialista, Recepcionista, Laboratorio)
3. For each system role, INSERT role_permissions rows mapping to the permission IDs above
4. For each existing user:
   - If user.role_type = 'admin' → INSERT user_roles (user_id, role_id=Administrador)
   - If user.role_type = 'specialist' → INSERT user_roles (user_id, role_id=Especialista)
   - If user.role_type = 'receptionist' → INSERT user_roles (user_id, role_id=Recepcionista)
   - If user.role_type = 'laboratory' → INSERT user_roles (user_id, role_id=Laboratorio)
```

---

## 5. Backend Implementation Plan

### 5.1 Domain Layer (`internal/domain/`)

**New files:**
- `role.go` — `Role`, `Permission`, `RolePermission`, `UserRole` structs + `RoleRepository`, `PermissionRepository` interfaces
- `role.go` must include method `Key() string` on Permission that returns `"module:action"`
- Update `user.go`:
  - Rename `Role` field → `RoleType` (keep the `Role` type alias)
  - Add `Roles []Role` with `gorm:"many2many:user_roles"`
  - Update `UserRepository` interface: add `GetPermissions(db, userID) ([]string, error)`, `GetRoles(db, userID) ([]*Role, error)`
- Update `errors.go` — no new error types needed; use existing `*ErrUnauthorized`, `*ErrNotFound`

### 5.2 Platform — Repositories (`internal/platform/storage/postgres/`)

**New files:**
- `role_repository.go` — `RoleRepository` implementation
  - `GetByID`, `List`, `Create`, `Update`, `SoftDelete`
  - `GetPermissions(roleID uint) ([]*Permission, error)`
  - `GetUserPermissions(userID uint) ([]string, error)` — JOIN user_roles → role_permissions → permissions, returns `[]string` keys
- `permission_repository.go` — `PermissionRepository` implementation
  - `ListAll() ([]*Permission, error)` — returns ALL predefined permissions
  - `GetByModule(module string) ([]*Permission, error)`

**Update:**
- `user_repository.go` — add `AssignRole(db, userID, roleID)`, `RemoveRole(db, userID, roleID)`, `GetPermissions(db, userID) ([]string, error)`
- `db.go` — add `&domain.Role{}`, `&domain.Permission{}` to AutoMigrate

### 5.3 Service Layer (`internal/role/service.go`)

```go
type Service struct {
    roleRepo       domain.RoleRepository
    permissionRepo domain.PermissionRepository
    userRepo       domain.UserRepository
    logger         *zap.Logger
}

// Methods:
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error)
func (s *Service) Create(input CreateInput) (*domain.Role, error)
func (s *Service) Update(id uint, input UpdateInput) (*domain.Role, error)
func (s *Service) Delete(id uint) error                        // blocks is_system roles
func (s *Service) AssignRoleToUser(input AssignInput) error
func (s *Service) RemoveRoleFromUser(input RemoveInput) error
func (s *Service) GetUserPermissionKeys(userID uint) ([]string, error)
func (s *Service) ListAllPermissions() ([]*domain.Permission, error)
```

### 5.4 Auth Service Update (`internal/auth/service.go`)

- `Login()` — after successful auth:
  1. Load user permissions via `roleService.GetUserPermissionKeys(user.ID)`
  2. Pass permissions to `GenerateToken()` → included in JWT claims
- Rename `Role` field in login response to `role_type` (keep backward compat — frontend reads this for theming)

### 5.5 JWT Updates (`internal/platform/auth/jwt.go`)

```go
type Claims struct {
    // ... existing fields ...
    Role        domain.Role `json:"role"`         // KEPT for backward compat during migration
    UserType    domain.Role `json:"user_type"`    // NEW — UI theming
    Permissions []string    `json:"permissions"`  // NEW — RBAC permission keys
}

// GenerateToken signature update:
func GenerateToken(user *domain.User, opticaID uint, schemaName string,
    featureFlags []string, permissions []string) (string, string, int64, error)
```

### 5.6 Middleware (`internal/platform/auth/middleware.go`)

**Add:**
```go
func RequirePermission(permission string) gin.HandlerFunc
func RequireAnyPermission(permissions ...string) gin.HandlerFunc
func RequireAllPermissions(permissions ...string) gin.HandlerFunc
```

Implementation: extracts `Claims.Permissions` from context, builds a `map[string]struct{}` for O(1) lookup, checks membership.

**Keep:** `RequireRole` unchanged during migration (both middlewares coexist).

### 5.7 Routes Migration (`routes.go`)

Replace EVERY `jwtauth.RequireRole(...)` call with the equivalent `jwtauth.RequirePermission(...)`.

Full mapping table (extracted from audit):

| Route Group | HTTP Method | Current RequireRole | New RequirePermission |
|---|---|---|---|
| branches/* | All | Admin | `branches:manage` |
| users/* | All | Admin | `users:view|create|edit|delete` (per method) |
| patients GET | All | (none) | `patients:view` |
| patients POST, PUT | / | Admin, Receptionist | `patients:create|edit` |
| patients DELETE | / | Admin | `patients:delete` |
| prescriptions GET | All | (none) | `prescriptions:view` |
| prescriptions POST, PUT | / | Admin, Specialist | `prescriptions:create|edit` |
| prescriptions DELETE | / | Admin | `prescriptions:delete` |
| appointments GET | All | (none) | `appointments:view` |
| appointments POST, PUT, DELETE | / | Admin, Specialist, Receptionist | `appointments:create|edit|delete` |
| appointments /take | POST | Specialist | `appointments:edit` |
| appointments /pause, /resume, /annotations | POST | Admin, Specialist, Receptionist | `appointments:edit` |
| appointments /lens-annotation | GET | Specialist | `appointments:view` |
| appointments /clinical-record GET | / | Admin, Specialist | `clinical_histories:view` |
| appointments /clinical-record POST, PUT, /sign | / | Specialist | `clinical_histories:create|edit` |
| management-report GET | / | Admin, Specialist | `management_report:view` |
| management-report POST | / | Specialist | `management_report:create` |
| specialist-reports/* | All | Admin | `specialist_reports:view|manage` |
| catalog/* (brands, lens-types, materials, lens-classes, treatments, photochromics, payment-methods) | GET | (none) | `catalog:view` |
| catalog/* | POST, PUT, DELETE | Admin | `catalog:create|edit|delete` |
| products GET | All | (none) | `products:view` |
| products POST, PUT, DELETE, /bulk-status | / | Admin | `products:create|edit|delete` |
| warehouses GET | All | (none) | `warehouses:view` |
| warehouses POST, PUT, DELETE | / | Admin | `warehouses:create|edit|delete` |
| warehouse-locations GET | All | (none) | `warehouses:view` |
| warehouse-locations POST, PUT, DELETE | / | Admin | `warehouses:create|edit|delete` |
| inventory-items GET | All | (none) | `inventory:view` |
| inventory-items POST, PUT, DELETE | / | Admin | `inventory:create|edit` |
| inventory/adjust, /adjustments POST | / | Admin | `inventory:manage` |
| inventory/adjustments PATCH | / | Admin | `inventory:manage` |
| inventory-transfers/* | All | Admin | `inventory:manage` |
| discount-requests GET | / | Admin, Receptionist | `discounts:view` |
| discount-requests POST, PUT | / | Admin, Receptionist | `discounts:create|edit` |
| discount-requests DELETE, /approve, /reject | / | Admin | `discounts:delete|approve` |
| discounts GET | All | (none) | `discounts:view` |
| quotes GET, /pdf, /pdf-token | / | Admin, Receptionist | `quotes:view` |
| quotes POST, PUT, /status, /convert | / | Admin, Receptionist | `quotes:create|edit` |
| quotes DELETE | / | Admin | `quotes:delete` |
| sales GET, /pdf-token, /lens-price-adjustments | / | Admin, Receptionist | `sales:view` |
| sales POST, PUT, /payments, /cancel | / | Admin, Receptionist | `sales:create|edit` |
| sales DELETE, DELETE /payments | / | Admin | `sales:delete` |
| sales POST /lens-price-adjustments, DELETE /lens-price-adjustments | / | Admin, Specialist | `sales:edit` |
| orders GET | All | (none) | `orders:view` |
| orders POST | / | Admin, Specialist, Receptionist | `orders:create` |
| orders PUT, /status | / | Admin, Specialist | `orders:edit` |
| orders DELETE | / | Admin | `orders:delete` |
| orders /payment-status | POST | Admin, Receptionist | `orders:edit` |
| laboratories GET | All | (none) | `laboratory:view` |
| laboratories POST, PUT, DELETE | / | Admin | `laboratory:create|edit|delete` |
| laboratory-orders GET, /evidence, /pdf-token | / | Admin, Specialist, Receptionist | `laboratory_orders:view` |
| laboratory-orders POST, PUT | / | Admin, Specialist, Receptionist | `laboratory_orders:create|edit` |
| laboratory-orders DELETE | / | Admin | `laboratory_orders:delete` |
| laboratory-orders /status | POST | Admin, Specialist, Laboratory, Receptionist | `laboratory_orders:edit` |
| portfolio/* | All | Admin, Receptionist | `portfolio:view|manage` |
| suppliers GET | / | Admin, Receptionist | `suppliers:view` |
| suppliers POST, PUT, DELETE | / | Admin | `suppliers:create|edit|delete` |
| purchases GET, POST, PUT, /receive | / | Admin, Receptionist | `purchases:view|create|edit` |
| purchases DELETE | / | Admin | `purchases:delete` |
| expenses GET, POST, PUT | / | Admin, Receptionist | `expenses:view|create|edit` |
| expenses DELETE | / | Admin | `expenses:delete` |
| supplier-payments GET | / | Admin, Receptionist | `suppliers:view` |
| payrolls/* | All | Admin | `payrolls:view|create|edit|delete` |
| service-orders GET | / | Admin, Receptionist, Specialist | `service_orders:view` |
| service-orders POST, PUT | / | Admin, Receptionist | `service_orders:create|edit` |
| service-orders DELETE | / | Admin | `service_orders:delete` |
| cash-transfers GET, POST, PUT, /cancel | / | Admin, Receptionist | `cash_transfers:view|create|edit` |
| cash-transfers DELETE, /approve | / | Admin | `cash_transfers:delete|approve` |
| cash-register-closes GET, POST, PUT, /submit, DELETE | / | Admin, Specialist, Receptionist | `cash_close:view|create` |
| cash-register-closes /approve, /return, /admin-actuals | / | Admin | `cash_close:approve` |
| cash-register-closes /advisors-pending, /calendar, /consolidated | / | Admin | `cash_close:view` |
| dashboard/* | All | Admin, Specialist, Receptionist | `dashboard:view` |
| admin/notifications/* | All | Admin | `notifications:manage` |
| :type/:id/notes | All | Admin, Specialist, Receptionist | `notes:view|create` |
| bulk-import/* | All | Admin | `bulk_import:manage` |
| daily-activity-reports GET | / | Admin, Specialist, Receptionist | `daily_reports:view` |
| daily-activity-reports POST, PUT, /close, /quick-attention | / | Specialist, Receptionist | `daily_reports:create` |
| daily-activity-reports /reopen, /edit-logs | / | Admin | `daily_reports:view` |

### 5.8 New Handlers (`internal/transport/http/v1/handler_role.go`)

Admin-only endpoints (require `roles_permissions:manage`):

```
GET    /api/v1/roles              → ListRoles
POST   /api/v1/roles              → CreateRole
GET    /api/v1/roles/:id          → GetRole
PUT    /api/v1/roles/:id          → UpdateRole
DELETE /api/v1/roles/:id          → DeleteRole
GET    /api/v1/permissions        → ListAllPermissions (read-only, predefined)
POST   /api/v1/users/:id/roles    → AssignRoleToUser
DELETE /api/v1/users/:id/roles/:roleId → RemoveRoleFromUser
GET    /api/v1/users/:id/permissions   → GetUserPermissions (for debugging)
```

### 5.9 `main.go` Wiring

Add to the DI chain (order: repos → services → handler):
```go
roleRepo       := postgresplatform.NewRoleRepository(db)
permissionRepo := postgresplatform.NewPermissionRepository(db)
roleService    := role.NewService(roleRepo, permissionRepo, userRepo, logger)
handler        := v1.NewHandler(authService, patientService, ..., roleService)
```

---

## 6. Performance & Cache Strategy

### Primary: Permissions in JWT Claims

On login, load all user permissions from DB (10-50 permission keys), encode as `[]string` in JWT. Middleware does O(1) map lookup — zero DB or cache hits per request.

### Real-Time Invalidation

When admin changes a user's roles, existing JWTs carry old permissions.

**Recommended approach: Token version check.**

1. Add `token_version INT NOT NULL DEFAULT 1` to `users` table
2. Include `token_version` in JWT claims
3. Middleware checks `claims.TokenVersion == user.TokenVersion` (1 DB query on `users` table by `user_id` from claims)
4. When admin changes user roles → increment `token_version` → all existing tokens invalidated immediately
5. Alternative: add a "Force re-login" button on user edit page

This is the simplest implementation requiring no Redis. The 1 extra DB query on `users` by PK is negligible.

---

## 7. Frontend Refactoring Plan

### 7.1 AuthContext Changes

```ts
// Keep for UI theming
interface User {
    id: number;
    name: string;
    role_type: string;    // renamed from 'role' — preserved for colors
    permissions: string[]; // NEW
}

// New context API
interface AuthContextType {
    user: User | null;
    hasPermission(permission: string): boolean;
    hasAnyPermission(permissions: string[]): boolean;
    hasAllPermissions(permissions: string[]): boolean;
    isAdmin(): boolean;        // deprecated — kept for transition
    isSpecialist(): boolean;   // deprecated — kept for transition
    isReceptionist(): boolean; // deprecated — kept for transition
}
```

### 7.2 New Hook (`src/hooks/usePermission.ts`)

```ts
export function useHasPermission(permission: string): boolean
export function useHasAnyPermission(permissions: string[]): boolean
export function useHasAllPermissions(permissions: string[]): boolean
```

### 7.3 App.tsx Refactoring

Replace `allowedRoles={['admin']}` pattern with `requiredPermission="dashboard:view"`:

```tsx
// TODAY
<BranchProtectedRoute allowedRoles={['admin']}>

// TARGET — two approaches possible:
// Option A: permission-based route guard
<BranchProtectedRoute requiredPermission="dashboard:view">

// Option B: keep allowedRoles for compatibility, add permission check
// (preferred for gradual migration)
```

### 7.4 File-by-File Refactoring Map

| File | Current Check | Replace With |
|---|---|---|
| `App.tsx` | `allowedRoles={['admin']}` | `requiredPermission="admin_access"` or keep for now |
| `App.tsx` | `user?.role === 'admin'` (branch logic) | `hasPermission('branches:manage')` |
| `App.tsx` | `user.role === 'super_admin'|'admin'|etc` (redirect) | `hasPermission('dashboard:view')` + redirect based on primary role |
| `AuthContext.tsx` | `user.role === 'admin'` | `role_type` for theming only; navigation based on primary role |
| `AdminLayout.tsx` | `user?.role === 'receptionist' \|\| 'specialist'` | Feature flag check OR derived from permissions |
| `AdminTopBar.tsx` | `user?.role === 'admin'` | `hasPermission('notifications:manage')` |
| `Patients.tsx` | `user?.role === 'specialist'` | `hasPermission('clinical_histories:view')` |
| `Appointments.tsx` | `user?.role === 'specialist'` | `hasPermission('appointments:edit')` for specialist paths |
| `AppointmentDetail.tsx` | `user?.role === 'specialist'` | `hasPermission('clinical_histories:create')` |
| `Sales.tsx` | `user?.role === 'admin' ? '/admin' : '/receptionist'` | Derive base path from primary role or permission set |
| `CashCloses.tsx` | `u.role === 'receptionist' \|\| 'specialist'` | `hasPermission('cash_close:view')` or role_type |
| `DailyReports.tsx` | `u.role === 'receptionist'` | `hasPermission('daily_reports:create')` or role_type |
| `*FiltersBar.tsx` | `u.role === 'receptionist'` | `hasPermission('cash_close:view')` to determine filter |
| `*Sidebar.tsx` | `u.role === 'specialist'` | `hasPermission('appointments:view')` to filter specialists |
| `ManagementReport.tsx` | `user?.role === 'admin'` | `hasPermission('specialist_reports:view')` |
| `UserCreatePage.tsx` | `data.role === 'specialist' \|\| 'receptionist'` | `role_type` for form behavior |
| `UserEditPage.tsx` | `loaded.role === 'admin' ? 'Administrador' : ...` | `role_type` for display labels |
| `UserRoleHelpAside.tsx` | `role === 'admin' \| 'specialist' \| ...` | `role_type` for color + label (theming only) |
| `userSchemas.ts` | `if (data.role === 'admin') return` | `if (data.role_type === 'admin')` |
| `SelectBranchPage.tsx` | `user?.role === 'admin' \| 'specialist'` | Derive from primary role_type |

### 7.5 Admin UI — RolesManagementPage

**New page:** `convision-front/src/pages/admin/RolesManagementPage.tsx`

- EntityTable listing roles: Name, Description, # Users, System Badge, Actions
- Create/Edit Role dialog:
  - Name (text input), Description (text area)
  - **Permission matrix** — modules as expandable accordion sections, each with checkboxes for view/create/edit/delete/manage/approve
  - "Select All" per module + global toggle
- Delete: confirmation dialog, blocked for system roles (`is_system=true`)
- Badge on system roles: "Sistema" (cannot be deleted)

### 7.6 Admin UI — User Role Assignment

Modify `UserEditPage.tsx` or `UserFormShell.tsx`:
- Show current roles as Badge components with X to remove
- "Add Role" button → SearchableCombobox with available roles
- Below roles: show effective permissions summary (computed union)

---

## 8. Migration Strategy (Zero-Downtime)

### Phase A — Database & Seed (no code changes)
1. Run migration SQL (add tables, rename `role` → `role_type`)
2. Run seeder: insert 85 permissions, 4 system roles, assign to all existing users
3. Verify: `SELECT u.email, u.role_type, r.name FROM users u JOIN user_roles ur ON u.id=ur.user_id JOIN roles r ON ur.role_id=r.id`

### Phase B — Backend: JWT + Middleware (parallel with A)
1. Add Role, Permission domain models + repos
2. Build RoleService
3. Update JWT: add `Permissions []string` to Claims, update `GenerateToken()`
4. Update `Login()` to load and include permissions
5. Add `RequirePermission()` middleware (alongside existing `RequireRole()`)
6. Build role CRUD handlers
7. Wire everything in main.go

### Phase C — Backend: Routes Migration (one route group at a time)
1. Replace `RequireRole` with `RequirePermission` per route group
2. Test each route group with curl after migration
3. Both middlewares coexist during transition

### Phase D — Frontend: AuthContext + Hook
1. Update AuthContext to read `permissions` from token
2. Add `hasPermission()`, `hasAnyPermission()`, `hasAllPermission()` to context
3. Create `usePermission` hook
4. Change `user.role` references in AuthContext to `user.role_type`

### Phase E — Frontend: Component Refactoring (file by file)
1. Replace `user.role === 'admin'` with `hasPermission('...')` in each file
2. Keep `role_type` for UI theming only (colors, dashboard layout)
3. Build RolesManagementPage
4. Add role assignment to user edit

### Phase F — Cleanup
1. Remove deprecated `RequireRole()` middleware
2. Remove old `role` JWT claim (keep `role_type` for backward compat)
3. Final `make test && make build && npm run build`

---

## 9. Acceptance Criteria

1. Admin creates a role with name + permission matrix → role appears in list, permissions persisted
2. Admin edits a role's permissions → JWT permissions for users with that role update on next login
3. Admin deletes a non-system role → role removed, users lose those permissions on next login
4. System roles cannot be deleted → 403 returned by API, delete button disabled in UI
5. Admin assigns role to user → user's JWT on next login includes union of all role permissions
6. Admin removes role from user → user's JWT on next login no longer includes those permissions
7. User without `patients:view` hits `GET /api/v1/patients` → HTTP 403
8. User with `patients:view` hits `GET /api/v1/patients` → HTTP 200
9. All 4 system roles assigned to existing users → zero regression in production access
10. `routes.go` contains ZERO `RequireRole()` calls after migration
11. Frontend menus hide/show items based on `hasPermission()`, not `user.role`
12. UI theme colors still work per `role_type` (admin blue, specialist green, receptionist purple)
13. All ~30 frontend files refactored — zero `user.role ===` checks remaining for access control
14. `make build && make test` exits 0
15. `npm run build` exits 0
16. Admin user edit page shows role badges with add/remove functionality
17. RolesManagementPage accessible at `/admin/roles` with full CRUD

---

## 10. Out of Scope

- Role hierarchy / inheritance (flat model for v1)
- Time-based or conditional permissions
- IP-based or geo-based access restrictions
- Audit logging for permission changes (can be added to audit_logs later)
- Dynamic module registration (modules are predefined, not user-created)
