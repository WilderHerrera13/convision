# Phase 14: Multi-Branch / Clinic Support — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Source:** PRD Express Path (user requirements)

<domain>
## Phase Boundary

Add first-class **branch** (sede/clínica) support to Convision so that clinic-scoped operations
(appointments, inventory, cash-close, daily-activity reports) are isolated per branch, while
global entities (users, patients, master product catalog, lenses, discounts) remain visible from
any branch context.

A **Branch** is a physical location (sucursal) that belongs to the single Óptica (company).
"Clinic" and "Branch" are synonyms in this domain. The chosen code identifier is `branch_id`.

Dev environment — free to wipe/recreate DB schema. No backward-compatibility constraints.

</domain>

<decisions>
## Implementation Decisions

### D-01 — Data Visibility Split (LOCKED)

**Global (no branch_id):**
- `users` — doctors, advisors, admins
- `patients` — shared across all branches
- `products` / `lenses` / `product_lens_attributes` — master catalog
- `discounts`
- `laboratories`, `suppliers`, `service_order_types`

**Local (branch_id NOT NULL):**
- `appointments`
- `sales` and `sale_items`
- `cash_closes` and related sub-tables
- `daily_activity_reports`
- `warehouses`, `warehouse_locations`, `inventory_items`
- `stock_movements`, `inventory_adjustments` (Phase 13 WMS tables)

### D-02 — Branch Entity Schema (LOCKED)

```sql
CREATE TABLE branches (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    address    VARCHAR(255),
    city       VARCHAR(100),
    phone      VARCHAR(30),
    email      VARCHAR(150),
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### D-03 — User–Branch Assignment (LOCKED)

```sql
CREATE TABLE user_branches (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id  INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);
```

Admin role implicitly has access to all branches and does not need `user_branches` rows.

### D-04 — Branch Context Transport: `X-Branch-ID` Header (LOCKED)

After login + branch selection, every frontend request includes an `X-Branch-ID: {id}` HTTP header.
The backend middleware:
1. Reads `X-Branch-ID` from the request.
2. Validates the branch exists and `is_active`.
3. For non-admin roles: verifies the authenticated user has a row in `user_branches` for that branch.
4. Attaches `branch_id` to the Gin context key `"branch_id"` for downstream handlers.
5. Admin requests may omit the header on admin-only endpoints (e.g., managing branches), but
   must include it on data-scoped endpoints (appointments, inventory, etc.).

### D-05 — Login Flow Enhancement (LOCKED)

`POST /api/v1/auth/login` response is enriched:
```json
{
  "token": "...",
  "user": { "id": 1, "name": "...", "role": "specialist" },
  "branches": [
    { "id": 1, "name": "Sede Norte", "is_primary": true },
    { "id": 2, "name": "Sede Sur",   "is_primary": false }
  ]
}
```
- If `branches` has exactly 1 entry → frontend auto-selects it and navigates to main app.
- If `branches` has >1 entries → frontend shows branch-selector screen (Figma ref: node-id 898-79).
- Admin → `branches` returns all active branches.

### D-06 — `clinic_id` → `branch_id` Rename (LOCKED)

The following domain models already have a `clinic_id` column that references a phantom entity.
That column must be renamed to `branch_id` with a real FK to `branches`:
- `warehouses`
- `warehouse_locations`
- `inventory_items`
- `stock_movements` (Phase 13)
- `inventory_adjustments` (Phase 13)
- `clinical_records` (all sub-tables: `visual_exams`, `diagnoses`, `keratometry`, `prosthesis`)

### D-07 — New `branch_id` Columns (LOCKED)

These tables currently have NO branch association. Add `branch_id INTEGER NOT NULL REFERENCES branches(id)`:
- `appointments`
- `sales` (and `sale_items` via parent `sale_id`)
- `cash_closes`
- `daily_activity_reports`

### D-08 — Admin Role Bypass (LOCKED)

`RoleAdmin` users:
- Are NOT required to have rows in `user_branches`.
- When they send `X-Branch-ID`, middleware validates the branch exists (but skips the
  user_branches membership check).
- Branch CRUD endpoints (list, create, edit, assign users) are admin-only.
- For admin-only management endpoints (e.g., `PATCH /branches/:id`), the middleware may be
  skipped entirely; those handlers do not need a branch context.

### D-09 — Frontend Branch Context Architecture (LOCKED)

```
BranchContext (React Context)
  branch_id      : number | null
  branch_name    : string | null
  setBranch(id, name) : void   — persists to localStorage + context
  clearBranch()        : void   — called on logout
```

- Key in localStorage: `convision_branch_id`, `convision_branch_name`
- Axios interceptor: if `branchCtx.branch_id` is set, attaches `X-Branch-ID: {id}` to every request.
- Route guard: if user is logged in but has no branch selected and role ≠ admin, redirect to branch-selector.
- Branch-selector page: `/select-branch` — lists branches from login response; on select calls `setBranch()` and navigates to `/` (main dashboard).

### D-10 — Figma Design Reference (LOCKED)

Branch-selector UI: https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=898-79&m=dev
Use the design as the visual spec. Implement using existing shadcn/ui primitives and Convision Tailwind tokens.

### Agent's Discretion

- Exact column ordering and index strategy beyond FKs.
- Whether to use a separate Go package `internal/branch` or fold into `internal/platform`.
- HTTP middleware integration point (before or after role middleware).
- Whether `POST /auth/select-branch` is needed as a separate endpoint (not required if header approach
  is sufficient).
- Error message wording in Spanish for the branch-selector UI.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Conventions
- `convision-api-golang/DEVELOPMENT_GUIDE.md` — 3-layer arch, entity checklist, RBAC patterns
- `convision-api-golang/DATABASE_GUIDE.md` — PostgreSQL conventions, migration patterns, FK/index rules
- `CLAUDE.md` — English-only identifiers, layer rules, frontend conventions

### Existing Domain Models (read before modifying)
- `convision-api-golang/internal/domain/user.go` — User struct, Role consts, UserRepository interface
- `convision-api-golang/internal/domain/appointment.go` — Appointment struct (no branch_id yet)
- `convision-api-golang/internal/domain/inventory.go` — Warehouse/InventoryItem with clinic_id (to be renamed)
- `convision-api-golang/internal/domain/clinical_record.go` — ClinicalRecord with clinic_id (to be renamed)
- `convision-api-golang/internal/domain/sale.go` — Sale struct (no branch_id yet)

### Auth & JWT
- `convision-api-golang/internal/platform/auth/jwt.go` — Claims struct (UserID, Email, Role)
- `convision-api-golang/internal/platform/auth/middleware.go` — Authenticate and RequireRole middleware

### Existing Routes
- `convision-api-golang/internal/transport/http/v1/routes.go` — where to add branch middleware + routes

### Frontend Auth
- `convision-front/src/contexts/AuthContext.tsx` — existing auth context (wrap or extend for branch)
- `convision-front/src/services/` — existing API service layer (add branch header to interceptor)
- `convision-front/src/App.tsx` — React Router v6 routes (add branch-selector route + guard)

### Phase 13 WMS tables (also need branch_id / clinic_id rename)
- `.planning/phases/13-unified-product-inventory-wms/13-01-PLAN.md`
- `.planning/phases/13-unified-product-inventory-wms/13-02-PLAN.md`

</canonical_refs>

<specifics>
## Specific Ideas / Concrete Requirements

### DB Migration order (critical)
1. Create `branches` table first.
2. Insert at least one default seed branch (id=1, name='Principal') so existing FK columns can be backfilled.
3. Add `branch_id` columns with default=1, then add NOT NULL constraint, then add FK.
4. Rename `clinic_id` → `branch_id` on inventory/clinical_record tables + add FK.

### Middleware signature in Go
```go
func BranchContext(branchRepo domain.BranchRepository) gin.HandlerFunc {
    return func(c *gin.Context) {
        // read X-Branch-ID header
        // validate branch exists + is_active
        // if non-admin: verify user_branches membership
        // set c.Set("branch_id", branchID)
        c.Next()
    }
}
```

### Helper to extract branch from context
```go
func BranchIDFromCtx(c *gin.Context) uint {
    v, _ := c.Get("branch_id")
    id, _ := v.(uint)
    return id
}
```

### Frontend branch selector page (Figma node 898-79)
- Route: `/select-branch`
- Shows cards/list of branches available to user
- On select: stores in context + localStorage, navigates to `/`
- Use `SearchableCombobox` if branch count > 6, cards otherwise
- Must show branch name and city

### Axios interceptor extension
```ts
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    const branchId = localStorage.getItem('convision_branch_id');
    if (branchId) config.headers['X-Branch-ID'] = branchId;
    return config;
});
```

### Admin global view
Admin users who navigate to branch-scoped routes without an `X-Branch-ID` selected should see
data across ALL branches (or be prompted to filter by branch). Initially, redirect admin to branch
selector as well (same flow); admin can see all branches in the selector.

</specifics>

<deferred>
## Deferred Ideas

- Cross-branch transfers / stock transfers between branches (defer to a later WMS phase)
- Branch-level reporting aggregation / consolidation dashboard (defer to analytics phase)
- Real-time branch activity via WebSockets (out of scope)
- Native mobile branch selection (not applicable)
- Multi-tenant architecture (different organizations) — explicitly out of scope per REQUIREMENTS.md

</deferred>

---

*Phase: 14-multi-branch-clinic-support*
*Context gathered: 2026-04-28 via PRD Express Path (user direct requirements)*
