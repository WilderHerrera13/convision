# Phase 19: RBAC — Roles & Permissions — Research

## RESEARCH COMPLETE

### 1. Backend Codebase Patterns

**3-layer architecture** (`DEVELOPMENT_GUIDE.md` §3):

```
transport/http/v1 → internal/<feature>/service.go → internal/domain
                         ▲
                         │ implements
              internal/platform/storage/postgres
```

**Domain layer** — one file per entity in `internal/domain/`:
- Struct with GORM tags + `Repository` interface.
- No external imports except stdlib (`time`, `errors`).
- Associates are pointers with `omitempty`: `Specialist *User json:"specialist,omitempty" gorm:"foreignKey:SpecialistID"`.
- PK always `ID uint json:"id" gorm:"primaryKey;autoIncrement"`.
- Error types are pointer structs: `*domain.ErrNotFound{Resource: "user"}`, `*domain.ErrConflict{Resource, Field}`, `*domain.ErrValidation{Field, Message}`, `*domain.ErrUnauthorized{Action}`.

**Pattern for Role constants** (already in `domain/user.go`):
```go
type Role string
const (
    RoleSuperAdmin   Role = "super_admin"
    RoleAdmin        Role = "admin"
    RoleSpecialist   Role = "specialist"
    RoleReceptionist Role = "receptionist"
    RoleLaboratory   Role = "laboratory"
)
```
New phase will need `domain.RoleType` as the renamed "role" column type (kept for theming), and `domain.PermissionKey` constants for `<module>:<action>` strings.

**Service layer** — one package per feature in `internal/<feature>/`:
- `type Service struct { repo domain.XRepository; logger *zap.Logger }`
- Constructor: `func NewService(repo domain.XRepository, logger *zap.Logger) *Service`
- DTOs in same file: `CreateInput`, `UpdateInput`, `ListOutput`, etc.
- `CreateInput` uses `binding:"required"` tags for Gin binding.
- `ListOutput` always `{ Data []*domain.X json:"data"; Total int64 json:"total"; Page int json:"page"; PerPage int json:"per_page" }`.
- Sanitize pagination in service: `if page < 1 { page = 1 }` / `if perPage < 1 || perPage > 100 { perPage = 15 }`.
- Returns `*domain.Err*` errors, never raw GORM errors.

**Repository layer** — `internal/platform/storage/postgres/<entity>_repository.go`:
- `type XRepository struct{}` — does NOT store `*gorm.DB`, it receives `db *gorm.DB` as first param on every method.
- Constructor: `func NewXRepository() *XRepository` (no args).
- Method pattern: `func (r *XRepository) GetByID(db *gorm.DB, id uint) (*domain.X, error)`.
- Converts `gorm.ErrRecordNotFound` → `&domain.ErrNotFound{Resource: "x"}`.
- Uses `Select()` for column projection, never `SELECT *`.
- Updates via `db.Model(&e).Updates(map[string]any{...})`, never `db.Save()`.
- Catches PG unique violations (`pq.Error` code `"23505"`) → `&domain.ErrConflict{...}`.

**Handler layer** — `internal/transport/http/v1/handler.go` + `routes.go`:
- `Handler` struct aggregates all service pointers (currently 35+ fields).
- `NewHandler(...)` constructor receives each service individually.
- Handlers are thin: parse → call service → `respondError(c, err)` or `c.JSON(status, out)`.
- `respondError(c, err)` uses `switch err.(type)` to map domain errors to HTTP status codes.
- Page/perPage parsing: `strconv.Atoi(c.DefaultQuery("page", "1"))`.
- `toUserResource(u *domain.User) UserResource` converts domain → JSON shape.

**AutoMigrate** — `postgres/db.go` `Migrate()`:
- Only runs when `APP_ENV=local`.
- Lists all domain models in `db.AutoMigrate(&domain.X{}, ...)`.
- Two lists: one in `Migrate()` for platform schema, one in `MigrateTenantSchema()` for tenant schemas.
- New RBAC tables (`Role`, `Permission`, `RolePermission`, `UserRole`) must be added to BOTH lists.

**Migration conventions** (more detail in §8).

---

### 2. JWT & Middleware Details

**Claims struct** — `internal/platform/auth/jwt.go`:

```go
type Claims struct {
    UserID       uint        `json:"user_id"`
    Email        string      `json:"email"`
    Role         domain.Role `json:"role"`
    OpticaID     uint        `json:"optica_id"`
    SchemaName   string      `json:"schema_name"`
    FeatureFlags []string    `json:"feature_flags"`
    jwt.RegisteredClaims
}
```

**GenerateToken signature:**

```go
func GenerateToken(user *domain.User, opticaID uint, schemaName string, featureFlags []string) (tokenString string, jti string, expiresIn int64, err error)
```

**What must change:**
1. Add `Permissions []string json:"permissions"` field to `Claims`.
2. Rename `Role` → `UserType` (still `domain.Role` type, preserved for UI theming).
3. Keep old `Role` field temporarily for backward compat during migration, or add `UserType` alongside `Role` and set both.
4. Add `TokenVersion int json:"token_version"` field for invalidation.
5. `GenerateToken` must accept `permissions []string` parameter (added to signature).
6. `loginTenantUser()` in `auth/service.go` must load permissions via a new roleService before calling `GenerateToken`.

**Middleware** — `internal/platform/auth/middleware.go`:

Current `Authenticate` signature:
```go
func Authenticate(revokedRepo domain.RevokedTokenRepository, db ...*gorm.DB) gin.HandlerFunc
```
It parses the token, checks revocation, stores claims in context via `c.Set(claimsKey, claims)`.

Current `RequireRole`:
```go
func RequireRole(roles ...domain.Role) gin.HandlerFunc
```
Builds a `map[domain.Role]struct{}` set, checks `claims.Role` is in the set. Simple O(1) lookup.

**What to add:**
```go
func RequirePermission(permission string) gin.HandlerFunc
func RequireAnyPermission(permissions ...string) gin.HandlerFunc
func RequireAllPermissions(permissions ...string) gin.HandlerFunc
```
Implementation: convert `claims.Permissions` to a `map[string]struct{}` for O(1) lookup. The `Authenticate` middleware must also check `claims.TokenVersion` against the user's current `token_version` in the DB (requires injecting a `*gorm.DB` or a `TokenVersionChecker`).

**Token version check in Authenticate:**
The middleware currently checks `revokedRepo.IsRevoked(globalDB, claims.ID)`. Add a similar check:
```go
var user domain.User
if err := globalDB.Select("token_version").First(&user, claims.UserID).Error; err != nil {
    // handle
}
if user.TokenVersion != claims.TokenVersion {
    c.AbortWithStatusJSON(401, gin.H{"message": "token has been invalidated"})
    return
}
```
This adds 1 DB query per authenticated request on the `users` PK — acceptable overhead.

**GetClaims** — unchanged:
```go
func GetClaims(c *gin.Context) (*Claims, bool)
```

**Branch middleware pipeline** (in `routes.go`):
```
v1 → TenantFromSubdomain → Authenticate → TenantSchema → BranchContext
```
The `RequireRole`/`RequirePermission` middleware is applied at the route group or individual route level AFTER `Authenticate`.

**Login handler** — `handler.go:231`:
The `Login` handler constructs response:
```go
response["user"] = toUserResource(out.User)
response["branches"] = out.Branches
response["feature_flags"] = out.FeatureFlags
```
The `toUserResource()` returns a `UserResource` struct with `Role string json:"role"`. This must be extended to include `permissions []string` and `role_type string` in the JSON response. The `UserResource` struct currently has `Role string json:"role"` — needs a new field like `Permissions []string json:"permissions"` and `RoleType string json:"role_type"`.

**Login response shape** (from `auth/service.go` `LoginOutput`):
```go
type LoginOutput struct {
    AccessToken           string       `json:"access_token"`
    TokenType             string       `json:"token_type"`
    ExpiresIn             int64        `json:"expires_in"`
    JTI                   string       `json:"-"`
    User                  *domain.User `json:"-"`
    Branches              []BranchInfo `json:"branches"`
    FeatureFlags          []string     `json:"feature_flags"`
    RequirePasswordChange bool         `json:"require_password_change"`
}
```
`LoginOutput.User` is not JSON-serializable directly; the handler wraps it with `toUserResource()`. The permissions + role_type must come from the user's assigned roles, which the auth service must load before generating the token.

---

### 3. Routes Structure

**Gin group hierarchy:**

```
router
└── /api
    ├── /v1/platform/auth    (no TenantFromSubdomain)
    │   └── POST /login      → PlatformLogin
    │
    └── /v1                  (TenantFromSubdomain)
        ├── /auth            (public — no auth)
        │   └── POST /login  → Login
        │
        ├── /guest           (public — no auth)
        │   └── GET /orders/:id/pdf, etc.
        │
        ├── /clinical-histories   (public — no auth)
        ├── /clinical-evolutions  (public — no auth)
        │
        ├── /super-admin     (Authenticate + RequireRole(RoleSuperAdmin))
        │   └── GET/POST /opticas, etc.
        │
        └── /                (Authenticate + TenantSchema)
            ├── /auth                    (protected)
            │   ├── POST /logout
            │   ├── POST /change-password
            │   ├── GET  /me
            │   └── POST /refresh
            │
            ├── /branches                (RequireRole(RoleAdmin))
            ├── /users                   (RequireRole(RoleAdmin))
            ├── /patients                (mixed: read=any, write=admin+receptionist)
            ├── /prescriptions           (mixed)
            ├── /appointments            (branchScoped, mixed)
            ├── /management-report       (mixed)
            ├── /specialist-reports      (RequireRole(RoleAdmin))
            ├── /brands                  (mixed)
            ├── /lens-types              (mixed)
            ├── /materials               (mixed)
            ├── /lens-classes            (mixed)
            ├── /treatments              (mixed)
            ├── /photochromics           (mixed)
            ├── /payment-methods         (mixed)
            ├── /lookup                  (any auth)
            ├── /product-categories      (mixed)
            ├── /categories              (alias → same handlers)
            ├── /products                (mixed)
            ├── /warehouses              (branchScoped, mixed)
            ├── /warehouse-locations     (branchScoped, mixed)
            ├── /inventory-items         (branchScoped, mixed)
            ├── /inventory               (branchScoped, mixed)
            ├── /inventory-transfers     (branchScoped, mixed)
            ├── /discount-requests       (mixed)
            ├── /discounts               (any auth)
            ├── /quotes                  (mixed)
            ├── /sales                   (branchScoped, mixed)
            ├── /orders                  (mixed)
            ├── /laboratories            (mixed)
            ├── /laboratory-orders       (mixed)
            ├── /portfolio               (mixed)
            ├── /suppliers               (mixed)
            ├── /purchases               (mixed)
            ├── /expenses                (mixed)
            ├── /supplier-payments       (mixed)
            ├── /payrolls                (mixed)
            ├── /service-orders          (mixed)
            ├── /cash-transfers          (mixed)
            ├── /cash-register-closes    (branchScoped, mixed)
            ├── /dashboard               (mixed)
            ├── /admin/notifications     (RequireRole(RoleAdmin))
            ├── /:type/:id/notes         (mixed)
            ├── /bulk-import             (RequireRole(RoleAdmin) group-level)
            ├── /daily-activity-reports  (branchScoped, mixed)
            ├── /specialists             (GET — any auth)
```

**RequireRole call count: approximately 180+ calls** across ~60 route groups.

**Middleware composition patterns:**
1. **Group-level** (applies to all routes in group):
   ```go
   bulkImportGroup := protected.Group("/bulk-import")
   bulkImportGroup.Use(jwtauth.RequireRole(domain.RoleAdmin))
   ```
2. **Route-level** (applies to specific endpoints):
   ```go
   patients.POST("",
       jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist),
       h.CreatePatient,
   )
   ```
3. **Mixed** (some routes in group have auth, some don't):
   ```go
   appointments.GET("", h.ListAppointments)          // any auth
   appointments.POST("",
       jwtauth.RequireRole(domain.RoleAdmin, ...),   // restricted
       h.CreateAppointment,
   )
   ```
4. **Branch-scoped routes**: `branchScoped.Group("/")` chains `BranchContext` middleware.

**Route patterns NOT in routes.go:**
- Some routes like `DELETE /sales/:id/payments/:paymentId` are registered directly on `branchScoped`.
- The `protected` group includes `BranchContext` for branch-scoped routes.

**Role-only endpoints (target for permission mapping):**
- `domain.RoleAdmin` only: users, admin/notifications, bulk-import, specialist-reports, branch creation/editing.
- `domain.RoleSpecialist` only: take appointment, clinical record write actions.
- `domain.RoleSuperAdmin` only: super-admin routes.

**Permission mapping for migration:**
The PRD Section 5.7 provides the complete mapping. Each `RequireRole(domain.RoleX, domain.RoleY)` will become `RequireAnyPermission("module:action1", "module:action2")` where each role has its specific permissions.

---

### 4. User Domain & Repository

**Current `domain.User` struct:**

```go
type User struct {
    ID                 uint      `json:"id"                   gorm:"primaryKey;autoIncrement"`
    Name               string    `json:"name"                 gorm:"not null"`
    LastName           string    `json:"last_name"            gorm:"column:last_name"`
    Email              string    `json:"email"                gorm:"uniqueIndex;not null"`
    Identification     string    `json:"identification"       gorm:"column:identification"`
    Phone              string    `json:"phone"                gorm:"column:phone"`
    Password           string    `json:"-"                    gorm:"column:password_hash;not null"`
    Role               Role      `json:"role"                 gorm:"type:varchar(20);not null;default:'receptionist'"`
    Active             bool      `json:"active"               gorm:"not null;default:true"`
    MustChangePassword bool      `json:"must_change_password" gorm:"column:must_change_password;not null;default:false"`
    CreatedAt          time.Time `json:"created_at"`
    UpdatedAt          time.Time `json:"updated_at"`
}
```

**What must change:**
1. Rename `Role` → `RoleType` (column `role_type`, VARCHAR(30), CHECK constraint, default 'receptionist'). Keep old `Role` field temporarily if backward compat needed.
2. Add `TokenVersion int json:"token_version" gorm:"not null;default:1"`.
3. Add associations:
   ```go
   Roles []Role `json:"roles,omitempty" gorm:"many2many:user_roles;"`
   ```
4. Add `DeletedAt *time.Time json:"deleted_at,omitempty" gorm:"index"` (for soft-delete — currently users are hard-deleted).

**Current `UserRepository` interface:**

```go
type UserRepository interface {
    GetByID(db *gorm.DB, id uint) (*User, error)
    GetByEmail(db *gorm.DB, email string) (*User, error)
    GetByIdentification(db *gorm.DB, identification string) (*User, error)
    Create(db *gorm.DB, u *User) error
    Update(db *gorm.DB, u *User) error
    UpdatePassword(db *gorm.DB, userID uint, hashedPassword string) error
    Delete(db *gorm.DB, id uint) error
    List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*User, int64, error)
    GetSpecialistsByBranch(db *gorm.DB, branchID uint) ([]*User, error)
    GetAdvisorsByBranch(db *gorm.DB, branchID uint) ([]*User, error)
}
```

**What to add:**
```go
GetRoles(db *gorm.DB, userID uint) ([]*domain.Role, error)
AssignRoles(db *gorm.DB, userID uint, roleIDs []uint) error
IncrementTokenVersion(db *gorm.DB, userID uint) error
```

**Current `userCols` constant** (in user_repository.go):
```go
const userCols = "id, name, last_name, email, identification, phone, password_hash, role, active, must_change_password, created_at, updated_at"
```
Must update to use `role_type` (or add `role_type, token_version` to projection).

**Current `allowedUserFilters`:**
```go
var allowedUserFilters = map[string]string{
    "name": "LIKE", "last_name": "LIKE", "email": "LIKE",
    "identification": "LIKE", "phone": "LIKE", "role": "=",
}
```
Must update `"role"` → `"role_type"`.

---

### 5. DI Wiring

**Current `main.go` wiring order:**

```
1. godotenv.Load()
2. buildLogger()
3. postgresplatform.Open(logger) → *gorm.DB
4. AutoMigrate + EnsureLocalDevUsers (APP_ENV=local only)
5. opticaCache.WarmUp(db)
6. featureCache creation
7. ---- Repositories ----
   userRepo := postgresplatform.NewUserRepository()
   patientRepo := postgresplatform.NewPatientRepository()
   ... (30+ repos)
8. ---- Services ----
   authService := authsvc.NewService(db, userRepo, revokedTokenRepo, branchRepo, superAdminRepo, featureCache, logger)
   userService := usersvc.NewService(userRepo, logger)
   ... (25+ services)
9. ---- Router ----
10. handler := v1.NewHandler(db, authService, branchService, ... 34 params total)
11. handler.RegisterRoutes(api, opticaCache, db)
12. server start
```

**Where to insert new RBAC components:**

**Repositories (after existing repos):**
```go
permissionRepo := postgresplatform.NewPermissionRepository() // no args
roleRepo := postgresplatform.NewRoleRepository()              // no args
```

**Service:**
```go
roleService := rolesvc.NewService(roleRepo, permissionRepo, userRepo, logger)
```

**Handler constructor:**
Add `roleService *rolesvc.Service` as a new param to `NewHandler(...)`.

**Auth service dependency change:**
The `auth.Service` needs to load user permissions during login. Options:
1. Pass `roleService` to `auth.Service` constructor (adds dependency).
2. Have the handler load permissions separately after login.
3. Pass a `PermissionLoader` function to `auth.Service`.

Per the PRD (locked decisions): `Login()` service loads user permissions via `roleService.GetUserPermissionKeys()` before generating token. So `roleService` MUST be available to `auth.Service`.

The `auth.NewService` signature changes from:
```go
func NewService(db *gorm.DB, users domain.UserRepository, revokedTokens domain.RevokedTokenRepository, branches domain.BranchRepository, superAdmins domain.SuperAdminRepository, featureCache *featurecache.Cache, logger *zap.Logger) *Service
```
To:
```go
func NewService(db *gorm.DB, users domain.UserRepository, revokedTokens domain.RevokedTokenRepository, branches domain.BranchRepository, superAdmins domain.SuperAdminRepository, featureCache *featurecache.Cache, roleService *rolesvc.Service, logger *zap.Logger) *Service
```

**Tenant schema AutoMigrate:**
Both `Migrate()` and `MigrateTenantSchema()` must include `&domain.Role{}` and `&domain.Permission{}`.

**`userCols` constant update:**
Change `"role"` → `"role_type"` in the column list.

---

### 6. Frontend AuthContext

**Current `AuthContextType` interface:**

```typescript
interface AuthContextType {
  user: User | null;
  branches: BranchInfo[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  requirePasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string, confirmPassword: string) => Promise<void>;
  isAdmin: () => boolean;
  isSpecialist: () => boolean;
  isReceptionist: () => boolean;
}
```

**Current `User` type** (`src/types/user.ts`):

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'specialist' | 'receptionist' | 'super_admin';
  feature_flags?: string[];
  must_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

**What must change:**
1. `User` interface gains:
   ```typescript
   role_type?: string;       // renamed from role (preserved for theming)
   permissions?: string[];   // e.g. ["patients:view", "sales:create"]
   ```
   Keep `role` for backward compat during transition.
2. `AuthContextType` gains:
   ```typescript
   hasPermission: (permission: string) => boolean;
   hasAnyPermission: (...permissions: string[]) => boolean;
   hasAllPermissions: (...permissions: string[]) => boolean;
   ```
3. Keep deprecated `isAdmin()`, `isSpecialist()`, `isReceptionist()` for transition — they delegate to `hasPermission` internally.

**Login flow:**
1. `authService.login()` calls `POST /api/v1/auth/login`.
2. Response: `{ access_token, user, branches, feature_flags, require_password_change }`.
3. User stored in `localStorage('auth_user')`.
4. `AuthProvider` loads user on mount from localStorage, then calls `GET /api/v1/auth/me` to verify.

**The backend `GET /auth/me` handler** (in `handler.go`) returns `toUserResource()` which currently includes `Role string json:"role"`. Must be extended to include `permissions []string` and `role_type string`.

**`toUserResource()` function:**
```go
func toUserResource(u *domain.User) UserResource {
    return UserResource{
        // ... existing fields
        Role: string(u.Role),  // current
    }
}
```
Must add `Permissions []string json:"permissions"` and `RoleType string json:"role_type"` to `UserResource`.

**JWT decode approach:**
The frontend does NOT currently decode the JWT client-side. It stores the full user object from the login/me response in `localStorage`. The permissions array lives there. No JWT parsing needed on the frontend.

**AuthService** (`src/services/auth.ts`):
- `login()` receives response and stores `user` (which now includes `permissions`).
- `refreshToken()` similarly updates stored user.
- `getCurrentUser()` calls `GET /auth/me`.
- `getUser()` reads from `localStorage('auth_user')`.

**Token stored as:** `localStorage('access_token')`.

---

### 7. Frontend Route Protection

**Three route wrapper components in `App.tsx`:**

1. **`ProtectedRoute`** — generic protected wrapper:
   ```tsx
   <ProtectedRoute allowedRoles={['admin']} requireAuth={true}>
   ```
   Checks `isAuthenticated` and `allowedRoles.includes(user.role)`.

2. **`BranchProtectedRoute`** — adds branch selection logic:
   ```tsx
   <BranchProtectedRoute allowedRoles={['admin']}>
   ```
   Same role check + ensures a branch is selected.

3. **`PublicRoute`** — redirects authenticated users to their dashboard.

**How `allowedRoles` is used:**
```tsx
// ProtectedRoute
if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
}

// BranchProtectedRoute
if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
}
```

**What must change for permission-based routing:**
Option A: Replace `allowedRoles` with `requiredPermission` prop:
```tsx
<BranchProtectedRoute requiredPermission="users:view">
```
Option B: Keep `allowedRoles` for backward compat during migration, add `requiredPermission` alongside.

**Current usage patterns in App.tsx:**
- `/admin` → `allowedRoles={['admin']}`
- `/specialist` → `allowedRoles={['specialist', 'admin']}`
- `/receptionist` → `allowedRoles={['receptionist', 'admin']}`
- `/super-admin` → `allowedRoles={['super_admin']}`
- `/admin/sedes` (branches) → nested under `/admin`, no additional check
- Pages like `/catalog`, `/profile`, `/settings` → any authenticated user

**Role-based checks in App.tsx beyond `allowedRoles`:**

```typescript
// SelectBranchGuard
if (user?.role === 'admin') return <Navigate to="/admin/dashboard" />;

// HomePage
if (user?.role === 'super_admin') ...
else if (user?.role === 'admin') ...
else if (user?.role === 'specialist') ...
else if (user?.role === 'receptionist') ...

// BranchProtectedRoute
if (!branchId && user?.role === 'admin' && branches.length > 0) ...

// PublicRoute
if (user.role === 'super_admin') ...
else if (user.role === 'admin') ...
```

**~28 files with `.role ===` checks** (from grep results) plus ~18 files with `user?.role` checks. Total ~30+ files with ~50+ role-based checks.

**AdminLayout** (`src/layouts/AdminLayout.tsx`):
- Uses `useAuth()` and `useFeature()` from AuthContext.
- Sidebar is role-aware: entire nav sections defined separately for admin/receptionist/specialist.
- Currently shows different nav based on `isAdmin()`, `isSpecialist()`, `isReceptionist()`.

---

### 8. Migration Conventions

**File naming:** `NNNNNN_description.up.sql` and `.down.sql` in `convision-api-golang/db/migrations/platform/`.

- 6-digit zero-padded sequential number.
- `.up.sql` applies the change; `.down.sql` reverses it.
- Latest migration: `000027_daily_report_edit_logs`.
- Next migration for Phase 19 should start at `000028`.

**SQL migration examples:**

Minimal column add pattern (`000026`):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
```

New table with index pattern (`000027`):
```sql
CREATE TABLE IF NOT EXISTS daily_report_edit_logs (
    id                       BIGSERIAL PRIMARY KEY,
    daily_activity_report_id BIGINT NOT NULL REFERENCES daily_activity_reports(id) ON DELETE CASCADE,
    action                   VARCHAR(30) NOT NULL CHECK (action IN ('created','updated','closed','reopened')),
    performed_by_user_id     BIGINT NOT NULL REFERENCES users(id),
    performed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_report_edit_logs_report_id ON daily_report_edit_logs (daily_activity_report_id);
```

Multi-table migration with seed data (`000017`):
```sql
-- Comments, CREATE TABLE IF NOT EXISTS
-- Triggers with DO $$ IF NOT EXISTS pattern
-- Indexes with IF NOT EXISTS
-- Seed data with ON CONFLICT DO NOTHING
-- Sequence advance: SELECT setval('...', GREATEST(...))
-- UNIQUE constraints in CREATE TABLE
```

**Key conventions observed:**
- All DDL wrapped in `IF NOT EXISTS` / `IF EXISTS` for idempotency.
- `BIGSERIAL` for PKs (though some older use `SERIAL`).
- `TIMESTAMPTZ` for timestamps with `DEFAULT NOW()`.
- `VARCHAR(30)` with `CHECK (col IN (...))` for enumerations.
- `REFERENCES ... ON DELETE CASCADE` for FKs.
- Indexes as separate `CREATE INDEX IF NOT EXISTS` statements.
- No `BEGIN`/`COMMIT` wrapping (each statement is auto-committed via `golang-migrate`).
- `.down.sql` files reverse the operations (e.g., `DROP TABLE IF EXISTS`, `ALTER TABLE ... DROP COLUMN IF EXISTS`).

**Migration tool:** `golang-migrate` (https://github.com/golang-migrate/migrate). Run via:
```bash
migrate -database "$DATABASE_URL" -path db/migrations/platform up
```

**Phase 19 migrations needed:**
1. `000028_rename_users_role_to_role_type.up.sql` — `ALTER TABLE users RENAME COLUMN role TO role_type;`
2. `000029_create_roles_table.up.sql` — New `roles` table.
3. `000030_create_permissions_table.up.sql` — New `permissions` table with 85+ INSERTs.
4. `000031_create_role_permissions_table.up.sql` — Join table.
5. `000032_create_user_roles_table.up.sql` — Join table.
6. `000033_add_token_version_to_users.up.sql` — Add `token_version` column.
7. `000034_seed_rbac_data.up.sql` — Insert system roles + role_permissions + map existing users.

**Total: 7 migration files (7 × 2 = 14 files with .down counterparts).**

---

### 9. Risk Assessment

**Risk 1: Token invalidation — token_version race condition**

When admin assigns/removes roles from a user, the user's `token_version` is incremented. The middleware checks `claims.TokenVersion == user.TokenVersion` on every request.

Edge cases:
- User has an active token, admin changes their roles → token_version increments → next request by user gets 401. **Expected behavior.**
- Admin changes roles, but the DB UPDATE for `token_version` happened in a different transaction than the role assignment. If the app crashes between role assignment and token_version increment, the user retains old token_version and old permissions. **Fix:** Always increment `token_version` in the SAME transaction as role assignment.
- Load balancing / replication lag: if read replicas are behind, the token_version check might read stale data. **Mitigation:** Use the primary for this check (already the case since `Authenticate` uses the single `globalDB`).

**Risk 2: Migration of 180+ RequireRole calls**

Replacing all `RequireRole` calls with `RequirePermission` is a high-touch change in `routes.go` (801 lines, ~180+ calls). Every single call site must be mapped correctly.

Mitigation:
- Phase C of the migration strategy says "one route group at a time."
- Keep `RequireRole` and `RequirePermission` coexisting during migration.
- Test each route group individually with curl after migration.

**Risk 3: Frontend refactoring of ~50+ checks across ~30 files**

Every `user.role === 'admin'` check must be replaced with `hasPermission('...')`. Missed checks will break UI visibility for roles with new permission sets.

Mitigation:
- The PRD Section 7.4 provides the exact file-by-file mapping.
- Keep deprecated `isAdmin()`, `isSpecialist()`, `isReceptionist()` during transition so nothing breaks.
- `isAdmin()` can delegate to `hasAllPermissions([admin-permissions])` internally.

**Risk 4: Backward compatibility during gradual migration**

The locked decisions say: "Both `RequireRole` and `RequirePermission` coexist during migration." The JWT Claims carry BOTH `role` (old) and `user_type` (new) plus `permissions` (new). This means during migration, some routes still check `RequireRole` while others use `RequirePermission`.

Edge cases:
- If `permissions` array is empty (user has no roles assigned), all `RequirePermission` routes deny access. Users who had role-based access could lose access.
- **Fix:** The seeder MUST map existing users to system roles by their `role_type`. Run seeder BEFORE any route migration.

**Risk 5: Performance — permission lookup on every request**

The `RequirePermission` middleware does an O(1) map lookup on the `permissions` array from the JWT. Since permissions are in the JWT (not a DB query), this is fast.

However, the token_version check in `Authenticate` adds 1 DB query per request (`SELECT token_version FROM users WHERE id = ?`). By PK, this is a fast index lookup. **Total overhead: ~0.5–1ms per authenticated request.**

**Risk 6: Soft-delete of roles**

Roles have `deleted_at`. If a role is soft-deleted but users still have it assigned via `user_roles`:
- The role won't appear in the permission lookup (WHERE deleted_at IS NULL).
- Users silently lose those permissions.
- **Mitigation:** When soft-deleting a role, also remove all `user_roles` entries for that role AND increment `token_version` for all affected users.

**Risk 7: System roles cannot be deleted**

Frontend must disable the delete button for system roles (`is_system=true`). Backend must return 403 if delete is attempted. Both checks must be in place.

**Risk 8: AdminLayout sidebar role-based rendering**

The sidebar in `AdminLayout.tsx` currently shows different nav sections based on role (`isAdmin()`, `isSpecialist()`, `isReceptionist()`). After migration:
- Sidebar visibility should be permission-based (e.g., show "Usuarios" nav item only if `hasPermission('users:view')`).
- If navigation entries are not properly mapped to permissions, users may see nav items they can't access, or miss items they should see.
- The `featureKey` mechanism already exists for some items (e.g., `sidebar.sales`, `sidebar.inventory`). Permissions could replace or complement feature keys.

**Risk 9: Migration order matters**

The migration phases must be strictly sequential:
- Phase A (DB + seed) MUST run before Phase B (backend JWT + middleware).
- Phase B MUST run before Phase C (routes migration).
- Routes should NOT be migrated to `RequirePermission` until seed data is in place.
- Frontend `hasPermission` MUST be available before Phase D (frontend refactoring).
- Phase D (AuthContext changes) MUST be deployed before or with Phase E (component refactoring).

**Risk 10: The `toUserResource()` role field renaming**

`toUserResource()` currently returns `"role": "admin"`. The frontend `User` type has `role: 'admin' | ...`. If we rename to `role_type`, frontend code that accesses `user.role` directly (before refactoring) will break.

Mitigation: Return BOTH `"role"` and `"role_type"` in the JSON response during transition. Deprecate `"role"` after all frontend files are migrated.

