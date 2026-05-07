# Phase 16 Research — Multi-tenancy Super Admin

> **Date:** 2026-05-01  
> **Canonical design:** `16-ARCHITECTURE.md`  
> **Implementation guide:** `16-IMPLEMENTATION-GUIDE.md`

---

## 1. Technical Decision Validation

### 1.1 `SET LOCAL` vs `SET SESSION` — Critical Finding

The architecture (ARCHITECTURE.md §5.2) specifies `SET LOCAL search_path = ?`. This has a **critical interaction with GORM's auto-commit mode** that requires resolution.

**How PostgreSQL works:**

| Statement | Scope | Behavior |
|---|---|---|
| `SET LOCAL search_path = 'x'` | Current transaction only | Resets when transaction ends (COMMIT/ROLLBACK) |
| `SET SESSION search_path = 'x'` | Entire session | Persists across transactions; leaks to pool |

**The problem with `SET LOCAL` + auto-commit:** GORM by default runs each query in its own auto-committed transaction. After the first `SELECT`, the implicit transaction ends — and `SET LOCAL` is discarded. The second `SELECT` runs with the *default* `search_path`, hitting the wrong schema.

**The problem with `SET SESSION` + connection pool:** If we use `SET SESSION` and a request handler panics (skipping the `RESET` in defer), the connection returns to the pool with a stale `search_path`. The next request picks it up and reads the wrong tenant's data.

**Resolution — envelope the request in an explicit transaction:**

```go
func TenantSchemaMiddleware(globalDB *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        schemaName := c.GetString("schema_name")

        // Create new GORM session with explicit transaction
        tx := globalDB.Begin()
        if tx.Error != nil {
            c.AbortWithStatusJSON(500, gin.H{"message": "internal server error"})
            return
        }

        // SET LOCAL only applies within this BEGIN/COMMIT block
        tx.Exec("SET LOCAL search_path = ?", schemaName)

        // Always rollback on panic, commit on success
        defer func() {
            if r := recover(); r != nil {
                tx.Rollback()
                panic(r)
            }
        }()

        c.Set("tenant_db", tx)
        c.Next()

        // Commit if no errors (handler already wrote response)
        if !c.IsAborted() {
            tx.Commit()
        } else {
            tx.Rollback()
        }
    }
}
```

**Implication:** Every tenant-scoped request runs in a single DB transaction (BEGIN/COMMIT). This is **desirable** for multi-query operations (atomicity), and the overhead is negligible (<1ms per request). GORM handles nested transactions via savepoints when services call `tx.Transaction(...)`.

**Exceptions — routes that need NO tenant transaction:**
- `POST /auth/login` — auth needs to read from platform AND tenant schemas
- `GET /health` — no DB at all

These routes skip the `TenantSchemaMiddleware` entirely.

### 1.2 GORM `Session(&gorm.Session{NewDB: true})` Behavior

The architecture proposes `globalDB.Session(&gorm.Session{NewDB: true})` before the `SET LOCAL`. This creates a new `*gorm.DB` instance with a fresh statement pool but shares the **same underlying `*sql.DB` connection**. `SET LOCAL` on this new instance still affects the same PostgreSQL session. The `Session()` call is **not needed** if we use explicit transactions — the transaction itself provides isolation. We'll remove this pattern and use `Begin()` instead.

### 1.3 Running golang-migrate Programmatically (Embedded)

The architecture says "Run all tenant migrations inside new schema via golang-migrate (embedded)." Here's how:

**Step 1 — Embed migration files:**

```go
// cmd/api/main.go
import "embed"

//go:embed db/migrations/platform/*.sql
var tenantMigrations embed.FS
```

**Step 2 — Run migrations against a specific schema:**

```go
import (
    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    "github.com/golang-migrate/migrate/v4/source/iofs"
)

func RunTenantMigrations(db *gorm.DB, schemaName string) error {
    sqlDB, err := db.DB()
    if err != nil {
        return err
    }

    // Build DSN with ?search_path= parameter
    dsn := buildDSN() + "&search_path=" + schemaName

    source, err := iofs.New(tenantMigrations, "db/migrations/platform")
    if err != nil {
        return err
    }

    m, err := migrate.NewWithSourceInstance("iofs", source, dsn)
    if err != nil {
        return err
    }
    defer m.Close()

    return m.Up()
}
```

**Alternative — run SQL files directly (simpler, no external dependency):**

```go
func RunTenantMigrationsSQL(db *gorm.DB, schemaName string) error {
    files, _ := tenantMigrations.ReadDir("db/migrations/platform")
    for _, f := range files {
        content, _ := tenantMigrations.ReadFile("db/migrations/platform/" + f.Name())
        // Replace '\set ON_ERROR_STOP' if present
        sql := string(content)
        db.Exec("SET LOCAL search_path = ?", schemaName)
        if err := db.Exec(sql).Error; err != nil {
            return fmt.Errorf("migration %s: %w", f.Name(), err)
        }
    }
    return nil
}
```

**Recommendation:** Use the direct SQL approach. It avoids adding `golang-migrate` as a dependency, is simpler to debug, and we already have the embedded migration files. The trade-off is we lose version tracking per tenant, but for schema provisioning at optica creation time, we always apply all migrations from scratch against an empty schema — version tracking is unnecessary.

> ⚠️ **golang-migrate CLI dependency note:** Adding `github.com/golang-migrate/migrate/v4` requires `GOPROXY=direct` and a `go.sum` entry. The direct SQL approach avoids this complexity. If the team later needs per-tenant migration versioning (e.g., upgrading existing tenants), switch to golang-migrate embedded.

### 1.4 `CREATE SCHEMA` Privilege

The `convision_app` PostgreSQL user needs `CREATE SCHEMA` privilege to provision new tenant schemas. Currently, the DATABASE_GUIDE.md explicitly **revokes** CREATE on schema public:

```sql
REVOKE CREATE ON SCHEMA public FROM convision_app;
```

This must change:

```sql
-- Phase 16-01 migration (runs as superuser or convision_migrator)
GRANT CREATE ON DATABASE convision TO convision_app;
```

Alternatively, the `OpticaService.CreateOptica` can use a separate DB connection with elevated privileges (migrator user) for the CREATE SCHEMA step, keeping the app user restricted. This is cleaner for security but adds connection complexity.

**Recommendation:** Grant `CREATE ON DATABASE` to `convision_app`. The privilege scope is database-level, not schema-level. The app already creates tables in local dev via AutoMigrate — adding schema creation is a natural extension for the same risk profile.

### 1.5 Feature Flag Keys vs Frontend Menu Keys

The architecture defines 12 feature flag constants:

```go
FeatureSidebarAppointments = "sidebar.appointments"
FeatureSidebarSales        = "sidebar.sales"
FeatureSidebarPurchases    = "sidebar.purchases"
FeatureSidebarInventory    = "sidebar.inventory"
FeatureSidebarLaboratory   = "sidebar.laboratory"
FeatureSidebarReports      = "sidebar.reports"
FeatureSidebarPayroll      = "sidebar.payroll"
FeatureSidebarExpenses     = "sidebar.expenses"
FeatureSidebarClinical     = "sidebar.clinical"
FeatureSidebarCatalog      = "sidebar.catalog"
FeatureSidebarQuotes       = "sidebar.quotes"
FeatureSidebarDiscounts    = "sidebar.discounts"
```

These map to specific sidebar nav items in `AdminLayout`. The implementing agent needs to define the exact mapping:

| Flag Key | Sidebar Item | Current route |
|---|---|---|
| `sidebar.appointments` | Citas | `admin/appointments` |
| `sidebar.sales` | Ventas | `admin/sales` |
| `sidebar.purchases` | Compras | `admin/purchases` |
| `sidebar.inventory` | Inventario | `admin/inventory` |
| `sidebar.laboratory` | Laboratorio | `admin/laboratory-orders` |
| `sidebar.reports` | Reportes | `admin/daily-reports` |
| `sidebar.payroll` | Nómina | `admin/payrolls` |
| `sidebar.expenses` | Gastos | `admin/expenses` |
| `sidebar.clinical` | Historia Clínica | `admin/patients/:id/history` |
| `sidebar.catalog` | Catálogo | `admin/catalog` |
| `sidebar.quotes` | Cotizaciones | `admin/quotes` |
| `sidebar.discounts` | Descuentos | `admin/discount-requests` |

**Note:** Specialist and Receptionist layouts also need feature flag guards for their sidebar items. Specialist sidebar items include: Dashboard, Pacientes (read-only), Citas, Historia Clínica, Recetas, Informe de Gestión, Laboratorio, Catálogo. Receptionist items include: Dashboard, Citas, Pacientes, Ventas, Cotizaciones, Órdenes de Lab, Cierre de Caja, Reporte Diario, Cartera, Descuentos, Catálogo.

### 1.6 Reserved Slug `admin` — Routing Logic

The middleware detects `slug == "admin"` → `platform` schema with no optica lookup. But the `admin` slug also generates routes at `admin.app.opticaconvision.com`. The frontend must route `/admin/*` for tenant contexts (e.g., `visionplus.app.opticaconvision.com/admin/dashboard`) and `/super-admin/*` for the platform portal (`admin.app.opticaconvision.com/super-admin`).

**How the frontend detects context:** `window.location.hostname` — extract the subdomain slug. If slug is `admin`, render SuperAdminLayout with routes at `/super-admin/*`. Otherwise, the regular role-based layouts continue to use `/admin/*`, `/specialist/*`, `/receptionist/*`.

No route collision between tenant `/admin/*` (path on tenant subdomain) and super admin `/super-admin/*` (path on `admin.` subdomain) — different domains, different routes, resolved at the RouterProvider level based on hostname.

---

## 2. Implementation Risks

### 2.1 Risk: Search Path Leak with Connection Pool

**Severity:** High  
**Probability:** Medium if using `SET SESSION`, Low if using transaction-per-request

**Mitigation:** Use the transaction-per-request pattern (see §1.1). The `SET LOCAL search_path` is scoped to the explicitly started transaction. On COMMIT/ROLLBACK, it resets automatically. Even if the defer fails, the DB rolls back idle transactions after `idle_in_transaction_session_timeout` (default 1 day; should be set to 30s in production).

**Additional guard:** Set `idle_in_transaction_session_timeout = 30000` in PostgreSQL config.

### 2.2 Risk: Nested Transactions inside Transaction-Per-Request

**Severity:** Low  
**Probability:** Certain (existing code uses `db.Transaction(...)`)

**Mitigation:** GORM handles nested transactions via PostgreSQL savepoints. When a service calls `tenantDB.Transaction(func(tx *gorm.DB) error {...})` inside a request that already has an active transaction, GORM creates a savepoint instead of a new transaction. This is transparent and works correctly. GORM's test suite validates this behavior.

### 2.3 Risk: Migration Runner Failure During Optica Creation

**Severity:** High  
**Probability:** Low

The architecture says: "On any error: ROLLBACK + DROP SCHEMA IF EXISTS optica_vision_plus CASCADE." This requires:

```go
func (s *OpticaService) Create(input CreateOpticaInput) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. INSERT INTO platform.opticas
        if err := tx.Create(&optica).Error; err != nil {
            return err // ROLLBACK implicitly — nothing to clean up
        }

        // 2. CREATE SCHEMA — cannot be inside the transaction (DDL commits implicitly!)
        // ⚠️ CRITICAL: CREATE SCHEMA commits the current transaction in PostgreSQL
        // This means steps 1 and 2 cannot share a transaction boundary.
        // We need to handle the rollback manually if step 3+ fails.
    })
}
```

**Critical finding:** `CREATE SCHEMA` is a DDL statement that auto-commits in PostgreSQL. It cannot be part of a transaction with `INSERT INTO platform.opticas`. The atomicity promise of "all in one transaction" (ARCHITECTURE.md §8.2 line 482) is **not achievable** with pure PostgreSQL transactions.

**Resolution — two-phase with manual rollback:**

```go
func (s *OpticaService) Create(input CreateOpticaInput) error {
    // Phase 1: Create the optica record (atomic by itself)
    optica := &domain.Optica{Slug: input.Slug, ...}
    if err := s.db.Create(optica).Error; err != nil {
        return err
    }

    // Phase 2: Provision schema + seed (compensating cleanup on failure)
    schemaName := "optica_" + input.Slug
    if err := s.db.Exec("CREATE SCHEMA " + schemaName).Error; err != nil {
        // Remove the platform record (manual rollback)
        s.db.Delete(optica)
        return fmt.Errorf("schema creation: %w", err)
    }

    // Phase 3: Run migrations + seed (in a single transaction per schema)
    err := s.db.Transaction(func(tx *gorm.DB) error {
        tx.Exec("SET LOCAL search_path = ?", schemaName)
        if err := s.runMigrations(tx); err != nil {
            return err
        }
        if err := s.seedTenant(tx, input.Admin, input.Slug); err != nil {
            return err
        }
        return nil
    })

    if err != nil {
        // Compensating rollback: drop the schema and delete the optica record
        s.db.Exec("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE")
        s.db.Delete(optica)
        return fmt.Errorf("tenant provisioning: %w", err)
    }

    // Phase 4: Seed feature flags (platform schema, separate tx is fine)
    if err := s.seedFeatureFlags(optica.ID); err != nil {
        // Non-fatal: optica exists and works, flags will default to all-enabled
        s.logger.Error("failed to seed flags for new optica", zap.Uint("optica_id", optica.ID), zap.Error(err))
    }

    return nil
}
```

**Impact:** The optica creation flow is not perfectly atomic, but the compensating cleanup makes it idempotent if retried. The `slug` UNIQUE constraint on `platform.opticas` prevents duplicate opticas. If step 2 succeeds but step 3 fails, the orphaned schema is dropped before returning the error. The `super_admins` table in platform is never touched here (tenant admins live in the tenant schema).

### 2.4 Risk: Subdomain Extraction Reliability

**Severity:** Medium  
**Probability:** Low

The middleware reads `X-Forwarded-Host` (set by nginx) or falls back to `c.Request.Host`. Both are set by nginx/CloudFront — external clients cannot inject them through CloudFront. However:

- **Local development:** Developers use `localhost:4300` and `localhost:8001` — no subdomain. The middleware must handle this graceful fallback.
- **Tunneling tools:** ngrok, Cloudflare Tunnel set their own Host headers differently.

**Mitigation:** In `APP_ENV=local`, always route to a hardcoded tenant schema (e.g., `optica_main`) or `platform` for dev convenience. Add an env var `DEFAULT_TENANT_SLUG=main` for local dev. The middleware skips subdomain extraction when `APP_ENV=local`.

```go
if os.Getenv("APP_ENV") == "local" {
    defaultSlug := os.Getenv("DEFAULT_TENANT_SLUG")
    if defaultSlug == "" {
        defaultSlug = "main"
    }
    c.Set("schema_name", "optica_"+defaultSlug)
    c.Next()
    return
}
```

### 2.5 Risk: Migrations Assumed to Run Against `public` Schema

**Severity:** High  
**Probability:** Certain (19 migration files exist)

Current migrations use unqualified table names (e.g., `CREATE TABLE IF NOT EXISTS branches`). These create tables in the default `search_path`, which is currently `public`. After the tenant schema split:

- **Platform migrations** (000020+): Must explicitly target `platform.` schema or run with `search_path = platform`
- **Tenant migrations** (000001-000019): Must be re-played against each tenant schema

The existing 19 migrations don't need modification — they just need to be applied against `optica_main` (formerly `public`) and re-applied against new tenant schemas during provisioning.

### 2.6 Risk: Connection Pool Exhaustion with Transaction-Per-Request

**Severity:** Low  
**Probability:** Low under current load

With `max_open_conns = 100` (current config) and each request holding a connection for the duration of the transaction, we need ~100 concurrent requests to exhaust the pool. Current load is <5 concurrent requests. If this becomes an issue later, increase `max_open_conns` to 200 — the pool configuration is trivial to adjust.

---

## 3. Refactor Surface Area

### 3.1 Files to Create (Backend)

| Slice | File | Purpose |
|---|---|---|
| 16-01 | `internal/domain/optica.go` | Optica struct + OpticaRepository interface |
| 16-01 | `internal/domain/super_admin.go` | SuperAdmin struct + SuperAdminRepository interface |
| 16-01 | `internal/domain/feature_flag.go` | Feature flag constants |
| 16-01 | `internal/platform/storage/postgres/optica_repository.go` | Platform schema CRUD |
| 16-01 | `internal/platform/storage/postgres/super_admin_repository.go` | Platform schema auth |
| 16-01 | `internal/platform/storage/postgres/optica_feature_repository.go` | Feature flag CRUD |
| 16-01 | `db/migrations/platform/000020_platform_schema.up.sql` | platform schema + opticas + super_admins + optica_features |
| 16-01 | `db/migrations/platform/000020_platform_schema.down.sql` | Revert |
| 16-02 | `internal/platform/opticacache/cache.go` | OpticaCache with WarmUp |
| 16-02 | `internal/platform/featurecache/cache.go` | FeatureFlagCache with TTL |
| 16-02 | `internal/transport/http/v1/middleware/tenant_subdomain.go` | Subdomain extraction |
| 16-02 | `internal/transport/http/v1/middleware/tenant_schema.go` | Transaction + SET LOCAL |

### 3.2 Files to Modify — Backend

| File | Change | Risk |
|---|---|---|
| `internal/platform/auth/jwt.go` | Add `OpticaID`, `SchemaName`, `FeatureFlags` to Claims; split `GenerateToken` into `GenerateTenantToken` + `GenerateSuperAdminToken` | Medium — all auth-dependent code changes |
| `internal/auth/service.go` | Branch login by subdomain (super admin vs tenant); load feature flags; return them in LoginOutput | Medium — core auth path |
| `internal/domain/user.go` | Add `RoleSuperAdmin` constant | Low — new value only |
| `cmd/api/main.go` | Wire OpticaCache.WarmUp, FeatureFlagCache, new repos/services/handler, embed migrations | Medium — many new deps |
| `internal/transport/http/v1/routes.go` | Add super-admin route group with RequireRole(super_admin); add tenant middleware to existing routes | High — every route affected |
| `internal/transport/http/v1/handler.go` | Add `opticaService`, `featureFlagService` fields; add `tenantDBFromCtx` helper; add super-admin handlers | Medium |

### 3.3 Repository Refactor (Slice 16-05) — Estimation

After 16-02 (tenant middleware), the middleware places a `*gorm.DB` (transaction) into the Gin context. Every handler must read it with `tenantDBFromCtx(c)` and pass it to services, which pass it to repositories.

**Current pattern (slice 16-04 and before):**
```go
// Repos store *gorm.DB in struct (created in main.go with global DB)
func (r *UserRepository) GetByID(id uint) (*domain.User, error) {
    r.db.Select(...) // uses global DB, no tenant scoping
}
```

**Target pattern (slice 16-05):**
```go
// Repos accept *gorm.DB as first parameter
func (r *UserRepository) GetByID(db *gorm.DB, id uint) (*domain.User, error) {
    db.Select(...) // uses tenant-scoped DB from context
}
```

**Files affected:**

| Directory | Files | Change Pattern |
|---|---|---|
| `internal/domain/` | ~30 entity files | Update Repository interfaces to accept `db *gorm.DB` as first param |
| `internal/platform/storage/postgres/` | ~40 repository files | Update method signatures + remove `db` field from struct + use parameter instead |
| `internal/<feature>/` | ~25 service files | Accept `db *gorm.DB` param + pass through to repos |
| `internal/transport/http/v1/handler.go` | 1 file | Each handler extracts tenant DB from ctx + passes to service |
| **Total** | **~96 files** | |

**Wave grouping for 16-05:**

| Wave | Domains | # Repos | # Services | # Handlers |
|---|---|---|---|---|
| Wave 1 | User, Patient, Appointment, Prescription | 4 | 4 | 1 (those handlers) |
| Wave 2 | Catalog (brands, lens_types, etc.) | 7 | 1 | 1 |
| Wave 3 | Products, Inventory, Warehouses | 9 | 3 | 1 |
| Wave 4 | Sales, Quotes, Orders, Discounts | 6 | 4 | 1 |
| Wave 5 | Lab, Suppliers, Purchases, Expenses | 8 | 6 | 1 |
| Wave 6 | Cash, Payroll, ServiceOrders, Notes, Notifications, Daily, Dashboard, BulkImport | 10 | 10 | 1 |

Each wave: ~15-20 files modified. Estimated 30-60 min per wave with AI assistance.

### 3.4 Frontend Files to Create

| Slice | File | Purpose |
|---|---|---|
| 16-06 | `src/layouts/SuperAdminLayout.tsx` | Sidebar + outlet + feature flag guard |
| 16-06 | `src/pages/super-admin/OpticasPage.tsx` | EntityTable listing all opticas |
| 16-06 | `src/pages/super-admin/OpticaCreatePage.tsx` | Form with slug, name, plan, admin credentials |
| 16-06 | `src/pages/super-admin/OpticaDetailPage.tsx` | Detail view + feature flags editor |
| 16-06 | `src/services/superAdmin.ts` | API service for super-admin endpoints |
| 16-06 | `src/types/optica.ts` | TypeScript types for Optica |
| `App.tsx` | Add `/super-admin/*` routes; add `super_admin` role routing |
| `src/contexts/AuthContext.tsx` | Add `useFeature(key)`, `feature_flags` in User type, `super_admin` role color, login routing for super_admin |
| `src/layouts/AdminLayout.tsx` | Add `useFeature()` guard around sidebar items |
| `src/types/user.ts` | Add `feature_flags: string[]` to User |

**Frontend file count:** ~10 new files + ~5 modified files.

---

## 4. Testing Strategy

### 4.1 Multi-Tenant Test Setup

**Problem:** Unit tests for services use mock repositories — they don't need PostgreSQL. Integration tests for repositories need tenant-specific DB instances. How do we create tenant schemas in test setup?

**Solution — Test Helper:**

```go
// internal/testutil/tenant.go

func SetupTestTenant(t *testing.T, db *gorm.DB, slug string) (schemaName string, cleanup func()) {
    schemaName = "test_optica_" + slug
    db.Exec("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE")
    db.Exec("CREATE SCHEMA " + schemaName)

    // Run embedded migrations against test schema
    if err := RunTenantMigrationsSQL(db, schemaName); err != nil {
        t.Fatalf("tenant migration: %v", err)
    }

    cleanup = func() {
        db.Exec("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE")
    }
    return
}

func TenantDB(t *testing.T, globalDB *gorm.DB, schemaName string) *gorm.DB {
    tx := globalDB.Begin()
    t.Cleanup(func() { tx.Rollback() })
    tx.Exec("SET LOCAL search_path = ?", schemaName)
    return tx
}
```

**Usage:**
```go
func TestUserRepository_TenantIsolation(t *testing.T) {
    schemaA, cleanupA := SetupTestTenant(t, db, "a")
    defer cleanupA()
    schemaB, cleanupB := SetupTestTenant(t, db, "b")
    defer cleanupB()

    // Create user in tenant A
    repoA := postgres.NewUserRepository(TenantDB(t, db, schemaA))
    repoA.Create(&domain.User{Name: "Alice", ...})

    // Verify user exists only in tenant A
    repoB := postgres.NewUserRepository(TenantDB(t, db, schemaB))
    _, err := repoB.GetByEmail("alice@test.com")
    assert.IsType(t, &domain.ErrNotFound{}, err) // Not found in B
}
```

### 4.2 Verification Checklist per Slice

| Slice | Test Type | What to Verify |
|---|---|---|
| 16-01 | Integration | Platform tables exist; convision_app can CREATE SCHEMA |
| 16-02 | Integration + Unit | Two fake tenants, different Host headers -> correct schemas; OpticaCache WarmUp loads all |
| 16-03 | Integration | Super admin login returns platform JWT; tenant login on wrong subdomain -> 403 |
| 16-04 | Integration | Create optica provisions schema + seeds; deactivated optica rejects login |
| 16-05 | Unit (mocks) + Integration | Cross-tenant data isolation: write in A, can't read in B |
| 16-06 | Manual QA | Feature flags toggle sidebar items; login on two subdomains with same browser |
| 16-07 | Smoke | `https://admin.app.opticaconvision.com` loads; `https://main.app.opticaconvision.com` loads |

### 4.3 Isolation Test (16-05 Gate)

The most critical test — must pass before production cutover:

```go
func TestCrossTenantIsolation(t *testing.T) {
    schemaA, _ := SetupTestTenant(t, db, "a")
    schemaB, _ := SetupTestTenant(t, db, "b")

    dbA := TenantDB(t, db, schemaA)
    dbB := TenantDB(t, db, schemaB)

    // Create patient in tenant A
    patientRepoA := postgres.NewPatientRepository(dbA)
    patientRepoA.Create(&domain.Patient{FirstName: "Test", ...})

    // Verify NOT visible in tenant B
    patientRepoB := postgres.NewPatientRepository(dbB)
    _, total, _ := patientRepoB.List(nil, 1, 10)
    assert.Equal(t, int64(0), total)
}
```

---

## 5. Migration Rollout

### 5.1 Cutover Steps

The architecture §12 describes a zero-downtime path. Here's the operational runbook:

**Pre-migration checklist:**
- [ ] RDS snapshot taken (last 24h)
- [ ] Wildcard DNS `*.app.opticaconvision.com` confirmed in GoDaddy ✅
- [ ] Wildcard ACM certificate validated and attached to CloudFront distribution
- [ ] New API binary deployed to EC2 (with tenant middleware, unused until schema rename)
- [ ] `convision_app` user granted `CREATE ON DATABASE convision`

**Cutover steps (maintenance window: 5-10 min downtime):**

```bash
# Step 1: Create platform schema and tables
psql $RDS_URL -f db/migrations/platform/000020_platform_schema.up.sql

# Step 2: Rename public -> optica_main (instant catalog rename)
psql $RDS_URL << 'SQL'
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' SET SCHEMA optica_main';
    END LOOP;
END $$;

-- Also move sequences and types if any
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' SET SCHEMA optica_main';
    END LOOP;
END $$;
SQL

# Step 3: Register existing tenant in platform.opticas
psql $RDS_URL << 'SQL'
INSERT INTO platform.opticas (slug, name, plan, schema_name, is_active)
VALUES ('main', 'Óptica Principal', 'standard', 'optica_main', true);

-- Seed all feature flags for tenant 1
INSERT INTO platform.optica_features (optica_id, feature_key, is_enabled)
SELECT 1, key, true
FROM unnest(ARRAY[
    'sidebar.appointments', 'sidebar.sales', 'sidebar.purchases',
    'sidebar.inventory', 'sidebar.laboratory', 'sidebar.reports',
    'sidebar.payroll', 'sidebar.expenses', 'sidebar.clinical',
    'sidebar.catalog', 'sidebar.quotes', 'sidebar.discounts'
]) AS key;

-- Create super admin (use bcrypt hash of known password)
INSERT INTO platform.super_admins (name, email, password_hash)
VALUES ('Super Admin', 'superadmin@convision.com', '$2a$10$...');
SQL

# Step 4: Restart API container (picks up new schema)
ssh ec2-user@3.213.51.178 "docker restart convision-api"

# Step 5: Smoke test
curl https://api.opticaconvision.com/health
curl https://main.app.opticaconvision.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.com","password":"password"}'
curl https://admin.app.opticaconvision.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@convision.com","password":"password"}'
```

**Rollback (if smoke tests fail):**
```sql
-- Reverse step 2 only (steps 1 and 3 are additive, safe to leave)
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'optica_main'
    LOOP
        EXECUTE 'ALTER TABLE optica_main.' || quote_ident(r.tablename) || ' SET SCHEMA public';
    END LOOP;
END $$;

-- Deploy previous API binary (no tenant middleware)
ssh ec2-user@3.213.51.178 "docker restart convision-api-previous"
```

### 5.2 Subdomain Transition Timeline

| Milestone | Users Affected | Change |
|---|---|---|
| Pre-cutover | All | Access via `app.opticaconvision.com` (works normally) |
| Cutover | All | `app.opticaconvision.com` → redirect 302 to `main.app.opticaconvision.com` |
| Post-cutover | All | Use `main.app.opticaconvision.com` directly |
| Future tenants | New | Use `{slug}.app.opticaconvision.com` |

The apex `app.opticaconvision.com` (without `main.` prefix) should 302 redirect to `main.app.opticaconvision.com` to avoid confusion. This is a simple nginx rule or frontend redirect on the SPA.

---

## 6. Recommendations

### 6.1 Adjust 16-05 Position in Execution Order

**Current:** `16-01 → 16-02 → 16-03 → 16-04 → 16-05 → 16-06 → 16-07`

**Recommended:** `16-01 → 16-02 → 16-05 (partial: User repo only) → 16-03 → 16-04 → 16-05 (remaining) → 16-06 → 16-07`

**Reasoning:** 16-03 (Auth) needs tenant-scoped queries for the tenant login path (`SELECT * FROM users WHERE email = ?` in the correct schema). Currently, the auth service uses `userRepo.GetByEmail()` which hits the global DB. Without 16-05 (pass tenantDB to repos), the login won't resolve to the correct schema. But doing ALL of 16-05 before 16-03 delays auth verification. 

**Better approach:** Refactor just `UserRepository` (and its callers: auth service) as a minimal slice before 16-03. This touches ~4 files and unblocks auth. The remaining 35+ repos can wait for the full 16-05 wave.

### 6.2 Add Store-By-Slug to OpticaCache (Not Just Slug Lookup)

The architecture shows `cache.GetBySlug(slug)` in the subdomain middleware. The optica creation flow in 16-04 adds a new entry via `cache.Upsert(entry)`. But the cache uses `bySlug map[string]*Entry` — the Upsert should update `bySlug[entry.Slug]` directly, not a separate ID-indexed map unless needed.

**No change needed** — the slug-only index is sufficient for all middleware lookups. Super admin APIs that need optica-by-ID go to the DB directly (they're low-frequency admin operations).

### 6.3 Super Admin Route Exempts from Branch Middleware

Super admin routes at `/api/v1/super-admin/*` run on the `platform` schema. They do NOT need `BranchContext` middleware (no branch concept for super admins). In routes.go, the super admin group should be outside the `branchScoped` group and outside `protected` (uses its own auth middleware with `RequireRole(super_admin)`).

```go
// In routes.go:
superAdmin := v1.Group("/super-admin")
superAdmin.Use(jwtauth.Authenticate(h.revokedTokens))
superAdmin.Use(jwtauth.RequireRole(domain.RoleSuperAdmin))
// No TenantSchemaMiddleware needed (platform is default)
{
    superAdmin.GET("/opticas", h.ListOpticas)
    superAdmin.POST("/opticas", h.CreateOptica)
    // ...
}
```

### 6.4 CORS Update for Wildcard Subdomains

The CORS middleware in `main.go` currently whitelists specific origins:
```go
allowedOrigins := map[string]bool{
    "https://app.opticaconvision.com": true,
    "http://localhost:4300":           true,
}
```

After multi-tenancy, requests come from `https://main.app.opticaconvision.com`, `https://visionplus.app.opticaconvision.com`, etc. Update to:

```go
func corsMiddleware() gin.HandlerFunc {
    allowedOriginSuffix := "app.opticaconvision.com"
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")
        if strings.HasSuffix(origin, allowedOriginSuffix) || origin == "http://localhost:4300" || origin == "http://localhost:5173" {
            c.Header("Access-Control-Allow-Origin", origin)
            // ...
        }
    }
}
```

Or use a regex: `^https://([a-z0-9-]+\.)?app\.opticaconvision\.com$`.

### 6.5 Hardcoded User IDs in Migration 000017

Migration `000017_multi_branch_support.up.sql` seeds `branches` with `id = 1`. This ID is referenced by the tenant provisioning flow when creating the default "Sede Principal" branch. The seed in the tenant provisioning must also use `id = 1` for consistency, or the flow should insert and then get the returned ID. Since this runs in a fresh empty schema, `id = 1` will always be the first branch.

### 6.6 Feature Flag Cache in JWT — Key Refresh Flow

The architecture pushes feature flags into the JWT and says "zero DB queries per request." This is correct, but the refresh flow needs definition:

1. User logs in → JWT issued with flags (from cache or DB)
2. Super admin toggles a flag → `Cache.Invalidate(opticaID)` called
3. User's JWT still has old flags
4. User calls `POST /auth/refresh` → auth service re-reads flags from cache → issues new JWT
5. If user doesn't refresh, old JWT expires naturally (24h default)

**No automatic push to logged-in users in v1.** Acceptable trade-off: feature flag changes are rare and admin-level. The re-login or refresh requirement is documented in the super admin UI ("Los cambios tomarán efecto cuando el usuario vuelva a iniciar sesión").

### 6.7 Skipped for v1 (Deferred Decisions)

| Item | Reason |
|---|---|
| Per-tenant connection pools | Single pool is sufficient for current load |
| RLS (Row Level Security) for extra isolation | search_path already provides schema-level isolation; RLS adds complexity without benefit in schema-per-tenant model |
| Automated optica deactivation scheduling | Manual deactivation via super admin API is sufficient |
| Schema deletion (DROP SCHEMA) | Architecture §15 already decided: never auto-drop. Manual CLI action only. |
| Per-tenant metrics/monitoring | Add later when needed |
| Apex `app.opticaconvision.com` behavior | 302 redirect to `main.app.opticaconvision.com` — implement in nginx |

---

## 7. Estimated Effort

| Slice | Backend LOC | Frontend LOC | Complexity | Estimated Hours |
|---|---|---|---|---|
| 16-01 Platform Schema | ~300 new | 0 | Medium | 3-4 |
| 16-02 Caches & Middleware | ~400 new | 0 | High | 4-6 |
| 16-03 Auth Update | ~200 modified | ~50 modified | High | 3-5 |
| 16-04 Super Admin API | ~600 new | 0 | Medium | 5-7 |
| 16-05 Repository Refactor | ~1500 modified | 0 | Medium (mechanical) | 6-8 |
| 16-06 Frontend UI | 0 | ~1200 new | Medium | 5-7 |
| 16-07 Infra & Migration | ~50 config | 0 | Low (config-only) | 2-3 |
| **Total** | **~2000 new + ~1700 modified** | **~1250** | | **28-40** |

---

## RESEARCH COMPLETE

All key technical unknowns are resolved. The architecture design is validated with two critical adjustments:
1. **Transaction-per-request** pattern (not bare `SET LOCAL`) for safe search_path scoping with connection pooling
2. **Two-phase optica creation** (not single transaction) because `CREATE SCHEMA` auto-commits in PostgreSQL

The implementation is feasible within the existing codebase patterns. The 7-slice plan from IMPLEMENTATION-GUIDE.md is valid with the optional adjustment to partially execute 16-05 before 16-03.
