# Multi-Tenancy Super Admin — Architecture Design

> **Status:** Design · **Approach:** Subdomain-per-tenant  
> **Date:** 2026-05-01  
> **Scope:** `convision-api-golang` + `convision-front`  
> **High-level execution map (handoff to implementer):** `16-IMPLEMENTATION-GUIDE.md`

---

## 1. Current State

The system today is **single-tenant, multi-branch**:

- One PostgreSQL schema (`public`) holds all data.
- `Branch` / `UserBranch` provide branch-level access control within one clinic owner.
- `User.Role` has four values: `admin`, `specialist`, `receptionist`, `laboratory`.
- JWT carries `user_id`, `email`, `role` — no tenant dimension.

**Goal:** Add a control-plane layer where a **super admin** manages isolated optica tenants. Each optica lives in its own PostgreSQL schema. Tenant resolution uses **subdomains** — zero DB lookups per request. Super admin controls feature flags per optica to enable/disable sidebar sections.

---

## 2. Architecture Overview

```
admin.app.opticaconvision.com        ← super admin portal (reserved slug)
visionplus.app.opticaconvision.com   ← tenant A
central.app.opticaconvision.com      ← tenant B

         │  Host header
         ▼
┌─────────────────────────────────┐
│  nginx  →  Go API (:8001)       │
│                                 │
│  1. TenantFromSubdomain         │  reads slug from Host header
│     middleware                  │  → schema_name from in-memory cache
│  2. JWT Authenticate            │  validates token
│  3. TenantSchema middleware     │  SET LOCAL search_path = optica_slug
│  4. Handler                     │  calls service → repo with tenant DB
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                PostgreSQL 15+                       │
│                                                     │
│  schema: platform                                   │
│  ├── opticas          ← tenant registry + cache     │
│  ├── super_admins     ← platform-level users        │
│  └── optica_features  ← feature flags per optica    │
│                                                     │
│  schema: optica_vision_plus   ← tenant A            │
│  ├── users, branches, patients, appointments …      │
│                                                     │
│  schema: optica_central       ← tenant B            │
│  └── (same structure)                               │
└─────────────────────────────────────────────────────┘
```

### Why subdomain over email-based tenant lookup?

| Criterion | Email lookup table | Subdomain |
|---|---|---|
| Tenant resolution on login | 1 DB query | 0 queries — comes in `Host` header |
| Tenant resolution per request | 0 (JWT) | 0 (JWT or `Host` header) |
| Same email in two opticas | Ambiguous | No problem — subdomain defines scope |
| UX | User doesn't know which optica | URL makes it explicit |
| Cookie isolation | Shared base domain | Isolated per subdomain |
| Infrastructure | No changes | Wildcard DNS + wildcard SSL (free on ACM) |

---

## 3. Database Design

### 3.1 Platform Schema (Control Plane)

Always accessible — never swapped by `search_path`.

```sql
CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE platform.opticas (
    id           SERIAL PRIMARY KEY,
    slug         VARCHAR(60)  NOT NULL UNIQUE,
    name         VARCHAR(150) NOT NULL,
    plan         VARCHAR(30)  NOT NULL DEFAULT 'standard'
                     CHECK (plan IN ('standard', 'premium', 'enterprise')),
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    schema_name  VARCHAR(70)  NOT NULL UNIQUE,   -- = 'optica_' || slug
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);
CREATE INDEX ON platform.opticas (slug) WHERE deleted_at IS NULL;

CREATE TABLE platform.super_admins (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE platform.optica_features (
    id          SERIAL PRIMARY KEY,
    optica_id   INTEGER     NOT NULL REFERENCES platform.opticas(id) ON DELETE CASCADE,
    feature_key VARCHAR(80) NOT NULL,
    is_enabled  BOOLEAN     NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (optica_id, feature_key)
);
CREATE INDEX ON platform.optica_features (optica_id);
```

**No `email_tenant_map` table.** The subdomain carries the tenant identity — no resolution lookup needed.

### 3.2 Tenant Schema Template

Created when super admin provisions a new optica:

```sql
CREATE SCHEMA optica_{slug};
SET search_path = optica_{slug};
-- all current migration files run here (unchanged)
```

Each tenant schema is structurally identical to the current `public` schema.

### 3.3 Schema Naming

| Optica name | Slug | Schema | Subdomain |
|---|---|---|---|
| Super Admin portal | `admin` (reserved) | `platform` | `admin.app.opticaconvision.com` |
| Visión Plus | `vision_plus` | `optica_vision_plus` | `visionplus.app.opticaconvision.com` |
| Óptica Central | `central` | `optica_central` | `central.app.opticaconvision.com` |

**Slug rules:** `[a-z0-9_]`, max 60 chars, immutable after creation.

**Reserved slugs** — cannot be used when creating an optica:

```go
var reservedSlugs = map[string]bool{
    "admin":      true,
    "superadmin": true,
    "platform":   true,
    "api":        true,
    "www":        true,
    "app":        true,
    "health":     true,
    "static":     true,
}
```

The middleware detects `slug == "admin"` → routes to `platform` schema, no tenant lookup.

---

## 4. Authentication Flow

### 4.1 Super Admin Login

```
Host: admin.app.opticaconvision.com
POST /api/v1/auth/login  { email, password }

1. Subdomain slug is `admin` (reserved) → platform login path
2. Lookup platform.super_admins WHERE email = ?
3. Verify bcrypt
4. Issue JWT { role: "super_admin", optica_id: 0, schema_name: "platform", feature_flags: [] }
5. Frontend redirects to /super-admin dashboard
```

### 4.2 Tenant User Login

```
Host: visionplus.app.opticaconvision.com
POST /api/v1/auth/login  { email, password }

1. TenantFromSubdomain middleware: slug = "vision_plus"
   → cache lookup (in-memory, no DB) → schema_name = "optica_vision_plus", optica_id = 7
2. SET LOCAL search_path = optica_vision_plus
3. Lookup users WHERE email = ? in tenant schema
4. Verify bcrypt
5. Load feature flags for optica_id = 7 (in-memory cache, TTL 5 min)
6. Issue JWT {
     user_id: 42,
     role: "admin",
     optica_id: 7,
     schema_name: "optica_vision_plus",
     feature_flags: ["sidebar.appointments", "sidebar.sales", ...]
   }
7. Return token + branches + feature_flags
```

### 4.3 JWT Claims

```go
type Claims struct {
    UserID       uint        `json:"user_id"`
    Email        string      `json:"email"`
    Role         domain.Role `json:"role"`
    OpticaID     uint        `json:"optica_id"`      // 0 = super admin
    SchemaName   string      `json:"schema_name"`    // "platform" | "optica_*"
    FeatureFlags []string    `json:"feature_flags"`
    jwt.RegisteredClaims
}
```

**Feature flags in JWT** → zero DB queries per request. Changes take effect at next login or token refresh. Acceptable tradeoff for sidebar toggles.

---

## 5. Middleware Stack (per request)

```
Request
  │
  ├─ TenantFromSubdomainMiddleware   (public routes + all routes)
  │    reads Host header → slug → cache lookup → sets schema_name in Gin ctx
  │    super admin portal subdomain → sets schema_name = "platform"
  │
  ├─ JWTAuthenticateMiddleware       (protected routes only)
  │    validates token → sets claims in Gin ctx
  │
  ├─ TenantSchemaMiddleware          (protected routes only)
  │    validates schema_name from JWT matches subdomain (anti-spoofing)
  │    calls SET LOCAL search_path = schema_name
  │    sets tenant *gorm.DB in Gin ctx
  │
  └─ Handler
       calls tenantDBFromCtx(c) → passes to service → repo
```

### 5.1 Subdomain Middleware

```go
// internal/transport/http/v1/middleware/tenant_subdomain.go

var validSchemaRe = regexp.MustCompile(`^optica_[a-z0-9_]{1,60}$`)

func TenantFromSubdomainMiddleware(cache *opticacache.Cache, baseDomain string) gin.HandlerFunc {
    return func(c *gin.Context) {
        host := c.GetHeader("X-Forwarded-Host")
        if host == "" {
            host = c.Request.Host
        }

        slug := extractSlug(host, baseDomain)
        if slug == "admin" {
            c.Set("schema_name", "platform")
            c.Set("optica_id", uint(0))
            c.Next()
            return
        }

        optica, ok := cache.GetBySlug(slug)
        if !ok {
            c.AbortWithStatusJSON(404, gin.H{"error": "optica not found"})
            return
        }
        if !optica.IsActive {
            c.AbortWithStatusJSON(403, gin.H{"error": "optica inactive"})
            return
        }

        c.Set("schema_name", optica.SchemaName)
        c.Set("optica_id", optica.ID)
        c.Next()
    }
}
```

### 5.2 Schema Middleware

```go
// internal/transport/http/v1/middleware/tenant_schema.go

func TenantSchemaMiddleware(globalDB *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        schemaName, _ := c.Get("schema_name")
        name := schemaName.(string)

        if name != "platform" && !validSchemaRe.MatchString(name) {
            c.AbortWithStatusJSON(400, gin.H{"error": "invalid tenant"})
            return
        }

        claims := jwtauth.ClaimsFromCtx(c)
        if claims != nil && claims.SchemaName != name {
            // JWT schema must match the subdomain — prevents token reuse across tenants
            c.AbortWithStatusJSON(403, gin.H{"error": "token tenant mismatch"})
            return
        }

        tenantDB := globalDB.Session(&gorm.Session{NewDB: true})
        tenantDB.Exec("SET LOCAL search_path = ?", name)
        c.Set("tenant_db", tenantDB)
        c.Next()
    }
}
```

### 5.3 Handler Pattern

```go
func tenantDBFromCtx(c *gin.Context) *gorm.DB {
    db, _ := c.Get("tenant_db")
    return db.(*gorm.DB)
}

// Every handler:
func (h *Handler) ListPatients(c *gin.Context) {
    db := tenantDBFromCtx(c)
    // all queries run in the correct tenant schema automatically
}
```

---

## 6. In-Memory Caches

### 6.1 Optica Cache (slug → optica)

```go
// internal/platform/opticacache/cache.go

type Entry struct {
    ID         uint
    Slug       string
    SchemaName string
    IsActive   bool
}

type Cache struct {
    mu     sync.RWMutex
    bySlug map[string]*Entry
}

func (c *Cache) WarmUp(db *gorm.DB) error {
    var opticas []domain.Optica
    if err := db.Where("deleted_at IS NULL").Find(&opticas).Error; err != nil {
        return err
    }
    c.mu.Lock()
    defer c.mu.Unlock()
    for _, o := range opticas {
        c.bySlug[o.Slug] = &Entry{
            ID: o.ID, Slug: o.Slug,
            SchemaName: o.SchemaName, IsActive: o.IsActive,
        }
    }
    return nil
}
```

**Loaded at startup via `WarmUp`** — called in `main.go` before the HTTP server starts. A single query loads all opticas into memory. With 1,000 opticas the map is ~200 KB. After a deploy the cache is ready before the first request arrives — no user ever hits a cold miss.

Refreshed (single entry upsert) when super admin creates or updates an optica.

### 6.2 Feature Flag Cache (optica_id → []string)

```go
// internal/platform/featurecache/cache.go

type Cache struct {
    mu    sync.RWMutex
    store map[uint]cacheEntry
}

const featureTTL = 5 * time.Minute

func (c *Cache) Invalidate(opticaID uint) {
    c.mu.Lock()
    defer c.mu.Unlock()
    delete(c.store, opticaID)
}
```

Invalidated immediately when super admin changes flags. Next login/refresh picks up new flags.

---

## 7. Feature Flags

### 7.1 Defined Keys

```go
// internal/domain/feature_flag.go

const (
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
)

var AllFeatureKeys = []string{ /* all constants above */ }
```

All flags default to **enabled** when an optica is provisioned.

### 7.2 Super Admin API for Flags

```
GET  /api/v1/super-admin/opticas/:id/features
     → returns { features: [{ key, is_enabled }, ...] }

PUT  /api/v1/super-admin/opticas/:id/features
     body: { features: [{ key: "sidebar.payroll", is_enabled: false }, ...] }
     → bulk update, invalidates feature cache for optica_id

PATCH /api/v1/super-admin/opticas/:id/features/:key
      body: { is_enabled: false }
      → single toggle, invalidates feature cache
```

### 7.3 Frontend Guard

```tsx
// src/contexts/AuthContext.tsx

export function useFeature(key: string): boolean {
    const { user } = useAuth();
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.feature_flags.includes(key);
}

// Usage in AdminLayout sidebar:
const showPayroll = useFeature('sidebar.payroll');
{showPayroll && <NavItem to="/admin/payroll" label="Nómina" />}
```

---

## 8. Super Admin Capabilities

### 8.1 What super admin can do

| Action | Endpoint |
|---|---|
| Login to platform portal | `POST /api/v1/auth/login` on `admin.app.<root>` |
| List all opticas | `GET /api/v1/super-admin/opticas` |
| Create optica (provisions schema + first admin) | `POST /api/v1/super-admin/opticas` |
| View optica detail | `GET /api/v1/super-admin/opticas/:id` |
| Update optica (name, plan, active status) | `PATCH /api/v1/super-admin/opticas/:id` |
| Deactivate optica (blocks all logins) | `PATCH /api/v1/super-admin/opticas/:id` `{ is_active: false }` |
| View feature flags for an optica | `GET /api/v1/super-admin/opticas/:id/features` |
| Bulk update feature flags | `PUT /api/v1/super-admin/opticas/:id/features` |
| Toggle single feature flag | `PATCH /api/v1/super-admin/opticas/:id/features/:key` |
| List admins of an optica | `GET /api/v1/super-admin/opticas/:id/admins` |
| Create admin for an optica | `POST /api/v1/super-admin/opticas/:id/admins` |

### 8.2 Create Optica Flow

```
POST /api/v1/super-admin/opticas
{
  "name": "Visión Plus",
  "slug": "vision_plus",
  "plan": "standard",
  "admin": {
    "name": "Carlos López",
    "email": "admin@visionplus.com",
    "password": "secret123"
  }
}
```

**Backend steps (single transaction):**

1. Validate slug: unique, format `[a-z0-9_]+`, max 60 chars.
2. `BEGIN` on platform DB.
3. `INSERT INTO platform.opticas` → get `optica_id`.
4. `CREATE SCHEMA optica_vision_plus`.
5. Run all tenant migrations inside new schema via `golang-migrate` (embedded).
6. `INSERT` admin user into `optica_vision_plus.users` (bcrypt hash, role = admin).
7. `INSERT` "Sede Principal" branch into `optica_vision_plus.branches`.
8. `INSERT` all feature flags (all enabled) into `platform.optica_features`.
9. `COMMIT`.
10. Refresh optica cache entry.

**On any error:** `ROLLBACK` + `DROP SCHEMA IF EXISTS optica_vision_plus CASCADE`.

---

## 9. New Role

```go
// internal/domain/user.go

const (
    RoleSuperAdmin   Role = "super_admin"   // platform level — NEW
    RoleAdmin        Role = "admin"
    RoleSpecialist   Role = "specialist"
    RoleReceptionist Role = "receptionist"
    RoleLaboratory   Role = "laboratory"
)
```

RBAC in `routes.go`:

```go
superAdminOnly := protected.Group("/super-admin")
superAdminOnly.Use(jwtauth.RequireRole(domain.RoleSuperAdmin))
{
    superAdminOnly.GET("/opticas", h.ListOpticas)
    superAdminOnly.POST("/opticas", h.CreateOptica)
    // ...
}
```

---

## 10. Performance Profile

### Per-request overhead vs. today

| Step | Time | Notes |
|---|---|---|
| Parse `Host` header + extract slug | < 0.01 ms | String split |
| Optica cache lookup (slug → schema) | < 0.01 ms | In-memory map, RWMutex read lock |
| Schema name validation (regex) | < 0.01 ms | Pre-compiled regex |
| `SET LOCAL search_path` | < 0.1 ms | Session variable, no disk IO |
| **Total overhead** | **< 0.15 ms** | Negligible |

### Login overhead vs. today

| Step | Time |
|---|---|
| Optica cache lookup | < 0.01 ms |
| Feature flag cache hit | 0 ms |
| Feature flag cache miss (first login after restart) | ~1 ms (single query, tiny table) |
| **Total login overhead** | **< 1 ms** |

### No bottlenecks introduced

- No per-tenant connection pools (single pool, schema switching per transaction).
- No DB lookup to resolve tenant — subdomain → in-memory cache only.
- No DB lookup for feature flags after first access — in-memory cache.
- `SET LOCAL search_path` does not touch disk — pure session variable.
- All existing queries remain unchanged — table names resolve automatically.

---

## 11. AWS Infrastructure Changes

### DNS — GoDaddy ✅ DONE

Two records needed in GoDaddy DNS panel for `opticaconvision.com`:

| Type | Name | Value | Status |
|---|---|---|---|
| CNAME | `app` | `di4rurkxvzkhm.cloudfront.net` | Already existed |
| CNAME | `*.app` | `di4rurkxvzkhm.cloudfront.net` | **Added ✅** |

The wildcard `*.app` covers every current and future tenant subdomain automatically:
- `admin.app.opticaconvision.com` → super admin portal
- `visionplus.app.opticaconvision.com` → tenant A
- `central.app.opticaconvision.com` → tenant B
- `<any-slug>.app.opticaconvision.com` → any future tenant

No further DNS changes needed for new opticas.

### SSL (ACM) — Terraform change required

The current cert covers only `app.opticaconvision.com`. Add `subject_alternative_names` to cover the wildcard:

```hcl
# terraform/main.tf
resource "aws_acm_certificate" "app" {
  domain_name               = "app.${var.root_domain}"
  subject_alternative_names = ["*.app.${var.root_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
```

ACM wildcard certificates are free. Validation is done via a CNAME record in GoDaddy (same process as the existing cert).

### CloudFront — Terraform change required

Add the wildcard as an alternate domain name on the existing distribution `EPTJUWJZVGVW`:

```hcl
# terraform/modules/cdn/main.tf
aliases = [
  var.app_fqdn,             # "app.opticaconvision.com"
  "*.${var.app_fqdn}",      # "*.app.opticaconvision.com"
]
```

### nginx on EC2 — change required on deploy

```nginx
server {
    server_name *.app.opticaconvision.com app.opticaconvision.com;

    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Real-IP        $remote_addr;

    location /api/ {
        proxy_pass http://localhost:8001;
    }

    location / {
        root /var/www/convision-front;
        try_files $uri /index.html;
    }
}
```

### Frontend build — no changes

One build deployed once to S3. The SPA reads `window.location.hostname` at runtime to extract the slug for display purposes. The API base URL is always `/api` (relative), so the correct tenant subdomain is used automatically.

### Cost delta: $0

All changes are configuration-only. ACM certs are free. CloudFront alternate domain names are free. The wildcard DNS record in GoDaddy has no additional cost.

---

## 12. Migration from Current Single Tenant

The existing `public` schema is the first tenant.

```sql
-- Step 1: Create platform schema
CREATE SCHEMA platform;
-- ... create platform tables (opticas, super_admins, optica_features)

-- Step 2: Rename public to optica_main (< 1 ms per table — catalog change only)
ALTER TABLE public.users              SET SCHEMA optica_main;
ALTER TABLE public.branches           SET SCHEMA optica_main;
-- ... (all 25+ tables)

-- Step 3: Register the existing tenant
INSERT INTO platform.opticas (slug, name, plan, schema_name, is_active)
VALUES ('main', 'Óptica Principal', 'standard', 'optica_main', true);

-- Step 4: Seed feature flags (all enabled for existing tenant)
INSERT INTO platform.optica_features (optica_id, feature_key, is_enabled)
SELECT 1, unnest(ARRAY[
    'sidebar.appointments', 'sidebar.sales', 'sidebar.purchases',
    'sidebar.inventory', 'sidebar.laboratory', 'sidebar.reports',
    'sidebar.payroll', 'sidebar.expenses', 'sidebar.clinical',
    'sidebar.catalog', 'sidebar.quotes', 'sidebar.discounts'
]), true;

-- Step 5: Create super admin user
INSERT INTO platform.super_admins (name, email, password_hash)
VALUES ('Super Admin', 'superadmin@convision.com', '<bcrypt hash>');
```

**Zero downtime path:**
1. Steps 1–4 are additive — run live while old API is up.
2. `ALTER TABLE ... SET SCHEMA` is an instant catalog rename (no data moved).
3. Deploy new API binary.
4. Old binary still works with the old schema if rollback is needed (re-rename schemas).

---

## 13. Security

| Risk | Mitigation |
|---|---|
| Schema name injection via JWT | Regex validation `^optica_[a-z0-9_]{1,60}$` before using in SQL |
| Token from tenant A used on tenant B subdomain | Middleware cross-checks JWT `schema_name` against subdomain `schema_name` — mismatch → 403 |
| Super admin elevation | Super admins stored in `platform.super_admins`, never in tenant schemas. No role can be self-elevated. |
| Optica schema snooping | `SET LOCAL search_path` limits all queries to one schema. Cross-schema queries require explicit schema prefix — never present in existing code. |
| Feature flag forgery | Flags are inside a signed JWT. Client cannot modify them. |
| Subdomain spoofing | `X-Forwarded-Host` is set by nginx, which is behind CloudFront. External clients cannot inject this header through CloudFront. |

---

## 14. Implementation Phases

### Phase 16-01 — Platform Schema & Domain (Backend)
- SQL migrations for `platform` schema (opticas, super_admins, optica_features).
- Domain structs: `Optica`, `SuperAdmin`, `OpticaFeature`.
- Repositories: `OpticaRepository`, `SuperAdminRepository`, `OpticaFeatureRepository`.

### Phase 16-02 — Caches & Middleware (Backend)
- `OpticaCache` (slug → entry, long TTL, loaded at startup).
- `FeatureFlagCache` (optica_id → []string, 5 min TTL).
- `TenantFromSubdomainMiddleware`.
- `TenantSchemaMiddleware` (with JWT cross-check).
- Extended `Claims` struct + `GenerateToken` update.

### Phase 16-03 — Auth Service Update (Backend)
- Login service: super admin path + tenant path.
- Login response includes `feature_flags`.
- Token refresh reloads feature flags from cache.

### Phase 16-04 — Super Admin API (Backend)
- `OpticaService`: create (schema provisioning), list, update, deactivate.
- `FeatureFlagService`: list, bulk update, single toggle, cache invalidation.
- `SuperAdminHandler` + routes under `/super-admin/`.

### Phase 16-05 — Repository Refactor (Backend)
- All repository methods accept `db *gorm.DB` as first parameter.
- Handlers call `tenantDBFromCtx(c)` and pass to services.

### Phase 16-06 — Frontend Super Admin UI
- `useFeature(key)` hook in `AuthContext`.
- `SuperAdminLayout` + routes (`/super-admin/*`).
- Pages: `OpticasPage`, `OpticaCreatePage`, `OpticaDetailPage`, `OpticaFeaturesPage`.
- Sidebar guards with `useFeature()` in `AdminLayout`, `SpecialistLayout`, `ReceptionistLayout`.

### Phase 16-07 — Data Migration & Infra
- Migration script: `public` → `optica_main`.
- ~~GoDaddy wildcard DNS record `*.app`~~ **✅ Done**
- ACM wildcard cert — `terraform apply` (add `subject_alternative_names`).
- CloudFront wildcard alias — `terraform apply` (add `*.app_fqdn` alias).
- nginx config update on EC2.
- Smoke tests with all existing credentials.

---

## 15. Open Decisions

| # | Question | Recommendation |
|---|---|---|
| 1 | Slug for existing production tenant | `main` — gives `main.app.opticaconvision.com` |
| 2 | Super admin email for production | Dedicated email, not shared with any tenant admin |
| 3 | Flag changes — re-login required? | Yes for v1. Token refresh endpoint (`POST /auth/refresh`) updates flags without full re-login. |
| 4 | Schema deletion when optica is deactivated | Never auto-drop. Deactivation only sets `is_active = false`. Manual schema drop requires explicit super admin CLI action after data retention period. |
| 5 | PostgreSQL user privileges | `convision_app` needs `CREATE SCHEMA` privilege. Confirm before Phase 16-01. |
| 6 | Mobile apps (future) | Add optional `optica_slug` field to login body. Backend falls back to slug from request body if `Host` header is not a valid subdomain. |
| 7 | Apex `app.<root>` without tenant slug | Redirect 302 to `admin.app.<root>`, show static landing, or 404 for `/api` — pick one in implementation plans; do not treat as tenant. |
