# Phase 24 — System Audit Log Module (Design & Implementation Plan)

**Status:** Draft for review · **Author:** engineering · **Date:** 2026-07-03
**Depends on:** Phase 16 (multi-tenancy), Phase 19 (RBAC permissions), Phase 21 (typed filters)

---

## 1. Goal

Give the admin a complete **audit trail** of every mutating action in the system — **who**
did it, **what** they did, **when**, and **how** (IP, user agent, payload) — including
actions by admins and super admins, with an admin UI to filter by user, action, entity,
branch, and date range.

**Scope for v1 (explicit decision):** only *mutations* are audited — `create`, `update`,
`delete`. Reads/consults are **not** logged (volume would explode); the design leaves the
door open (an `action` column with a CHECK constraint that a one-line migration extends —
e.g. `view`, `export`, `login` later).

**Non-negotiable performance requirement:** audit recording must add **zero latency** to
the business request. Events are captured in-memory and persisted **asynchronously** by a
background goroutine that batch-inserts.

---

## 2. Key architectural facts this design is built on (verified in code)

| Fact | Where | Consequence for this design |
|---|---|---|
| Tenant isolation is schema-per-tenant: each request runs inside one GORM transaction with `SET LOCAL search_path`, committed/rolled back by middleware | `internal/transport/http/v1/middleware/tenant_schema.go:20-66` | An async writer **cannot** use the request's DB. Each event must carry its `schema_name`; the worker writes with the base pool using a schema-qualified table name. |
| Claims carry `UserID, Email, Role, OpticaID, SchemaName, Permissions` — **not** the user's name | `internal/platform/auth/jwt.go:17-27`, `GetClaims` in `middleware.go:77-84` | Snapshot `user_id + user_email + user_role` on the row; resolve display name at read time with a LEFT JOIN to `users`. |
| No request-ID / IP / user-agent middleware exists; access log only records method/path/ip | `internal/transport/http/middleware/logger.go:11-35` | The audit middleware captures `c.ClientIP()` and `User-Agent` itself. |
| `main.go` has **no graceful shutdown** (`srv.ListenAndServe()` directly, no `signal.Notify`) | `cmd/api/main.go:274-284` | This phase introduces the first shutdown hook: `signal.NotifyContext` → `srv.Shutdown(ctx)` → `recorder.Stop(ctx)` (drain the queue before exit). |
| The only async precedent is the request-scoped bulk-import worker pool; `NewSchemaConnection` pins a pooled conn to a schema | `internal/bulkimport/service.go:226`, `db.go:370` | The recorder follows the same idioms (buffered channels, WaitGroup, Zap-logged swallowed errors) but is the first *long-lived* worker. |
| Closest existing audit precedent: `DailyReportEditLog` — best-effort inline `Create`, errors ignored | `internal/domain/cash.go:334-349`, `internal/dailyactivity/service.go:144,187,213,236,281` | Same philosophy generalized: auditing is best-effort and must never fail the business action. |
| Runtime schema source of truth is GORM AutoMigrate (both platform and tenant lists); SQL migrations exist but the CLI is partly stale | `db.go:132,244` (BulkImportLog precedent at `db.go:229,358`) | Register `AuditLog` in **both** AutoMigrate lists **and** ship numbered SQL (next platform number: `000044`). |
| Standard list envelope: `{current_page, data, last_page, per_page, total}` (+ nested `meta` for frontend compat) | `sale/service.go:149-155`, `handler.go:491-503` | Audit list endpoint returns the same shape. |
| RBAC is permission-key based: `RequirePermission("module:action")` | `internal/platform/auth/middleware.go:110` | New key **`audit_logs:view`**, seeded into the catalog and granted to the admin system role. |
| Admin branch filter convention: `?branch_id=` with `0`/`all` = all branches, via `resolveBranchOverride()` | `handler.go:844-859` | The audit list handler uses the same helper; frontend sends `branch_id` per `.cursor/rules`. |

---

## 3. Capture strategy — middleware auto-capture, not per-service calls

Three options were considered:

| Option | Coverage | Effort | Old/new diff | Verdict |
|---|---|---|---|---|
| A. Explicit `Record()` call in every service mutation | Only what you remember to instrument | High, ~40 call sites, drifts over time | Yes | ❌ guarantees gaps — violates "track ALL" |
| B. GORM callbacks (hooks on Create/Update/Delete) | All DB writes, incl. internal ones (noise: stock movements, notification rows…) | Medium | Partial (`Updates(map)` loses old values) | ❌ logs *storage* events, not *user actions*; hard to attach actor/IP |
| C. **Gin middleware on the authenticated route groups** | 100% of mutating HTTP requests, automatically — including future endpoints | One middleware + a route→entity mapping | Via captured (redacted) request payload; per-domain diffs can be layered later | ✅ **chosen** |

Option C matches the requirement literally: *every* action any user (admin included)
performs goes through an authenticated HTTP endpoint. New endpoints are audited by default
without anyone remembering to add a call. Services stay untouched.

### 3.1 The `AuditTrail` middleware

New file: `internal/transport/http/v1/middleware/audit.go`.

```
protected.Use(
    jwtauth.Authenticate(...),      // claims available
    auditmw.AuditTrail(recorder),   // ← BEFORE TenantSchema (see why below)
    branchmw.TenantSchema(globalDB),
)
```

**Ordering is deliberate:** `TenantSchema` commits the request transaction inside *its*
deferred logic. Because `AuditTrail` sits *outside* it in the chain, its post-`c.Next()`
code runs **after the tenant transaction has committed**. So an event is only enqueued for
actions that actually persisted — no false-positive audit rows for rolled-back requests.
(Context values set by inner middleware — branch ID, annotations — are still readable
after `c.Next()` because `gin.Context` is shared.)

Behavior:

1. **Skip fast** if method ∈ {GET, HEAD, OPTIONS} — zero overhead on reads.
2. For mutating methods, tee the request body (bounded, see §3.3) and let the request run.
3. After `c.Next()`, if `status < 400`:
   - Resolve `(entity_type, action)` from the **route mapping** (§3.2) using
     `c.FullPath()` (the route template, e.g. `/api/v1/sales/:id`) + method.
   - `entity_id`: from the `:id` path param; for `POST` creates, best-effort extracted
     from the teed response body (`data.id`), else NULL.
   - Actor from `jwtauth.GetClaims(c)`; branch from `branchmw.BranchIDFromCtx(c)`;
     `ip = c.ClientIP()`, `user_agent = c.GetHeader("User-Agent")`.
   - Enqueue a `domain.AuditEvent` on the recorder (non-blocking, §4).
4. Requests that end ≥ 400 are not logged in v1 (failed attempts are a future `security`
   extension, same table).

**Annotation escape hatches** (exported helpers, optional, used from handlers only —
keeps the transport→service dependency rule intact):

```go
auditmw.Skip(c)                                  // exclude this request (e.g. token refresh)
auditmw.SetEntity(c, "sale", saleID, "V-00123")  // override entity type/id + human label
auditmw.SetChanges(c, changesJSON)               // richer old/new diff when a handler has it
```

### 3.2 Route → entity mapping

A single declarative table in `audit.go` keyed by `METHOD + c.FullPath()` prefix:

```go
// entity derived from the first path segment after /api/v1, overridable per route
{"POST /api/v1/sales", "sale", ActionCreate}
{"PUT /api/v1/cash-register-closes/:id/approve", "cash_register_close", ActionUpdate}
{"DELETE /api/v1/patients/:id", "patient", ActionDelete}
...
```

Default rule (covers ~90% without explicit entries): entity = singularized first path
segment (`/sales/:id` → `sale`), action = POST→`create`, PUT/PATCH→`update`,
DELETE→`delete`. Explicit entries only for semantic overrides (`approve`, `cancel` map to
`update` in v1) and for **skips** (e.g. `/auth/login`, `/auth/refresh`, `/notifications/:id/read`).
Unknown mutating routes are still logged with the derived entity — **fail-open coverage**.

### 3.3 Payload capture ("how") — redacted, bounded

- Request body captured **only** for `create`/`update`, only if `Content-Type` is JSON,
  capped at **32 KB** (larger bodies stored as `{"_truncated": true}`) — bulk-import
  uploads are skipped by mapping entry.
- **Redaction before enqueue**: keys matching `password`, `token`, `secret`,
  `authorization` (case-insensitive, recursive) replaced with `"[REDACTED]"`.
- Stored in a `changes JSONB` column. This answers "how/what was sent" from day one;
  precise old→new field diffs per domain are a future enhancement that reuses the same
  column via `SetChanges`.

### 3.4 Super-admin coverage

The `superAdmin` group (`routes.go:62-81`) runs **without** tenant schema. The same
`AuditTrail` middleware is attached to it; events carry `schema_name = "platform"` and the
worker writes them to `platform.audit_logs` (same DDL + `optica_id` column). Super-admin
actions on opticas (create/deactivate optica, feature flags, permission ceilings) are
therefore audited too, satisfying "even admin and super admin".

---

## 4. The async recorder (goroutine design)

New package: `internal/audit` — `recorder.go`.

```
handler goroutine                     background worker goroutine
─────────────────                     ───────────────────────────
Record(event) ──► chan (cap 4096) ──► accumulate → group by schema
   non-blocking:                       flush when: batch ≥ 100 events
   select { ch <- e; default: drop }              OR 1s ticker fires
                                       INSERT batch per schema:
                                       db.Table("<schema>.audit_logs").Create(&rows)
```

Design decisions (each is a deliberate trade-off):

1. **Non-blocking enqueue.** `select` with `default`: if the channel is full the event is
   **dropped**, a `dropped_events` counter increments, and the event is written to the Zap
   log at WARN (so it is never fully lost — it lives in app logs). The business request is
   *never* delayed or failed by auditing. Channel cap 4096 ≈ several seconds of burst at
   any realistic clinic write rate.
2. **Batched inserts.** One multi-row `INSERT` per schema per flush instead of one
   round-trip per event — this is the "database effort" control. Flush thresholds
   (100 events / 1 s) are constants, trivially tunable.
3. **Schema-qualified writes from the base pool.** The worker holds the base `*gorm.DB`
   (search_path = public) and targets `"<schema>.audit_logs"` explicitly. The schema name
   is revalidated against the existing `^optica_[a-z0-9_]{1,60}$` regex (plus literal
   `platform`) before use — no injection surface, no `SET search_path` juggling, and one
   worker serves every tenant.
4. **Single worker goroutine.** Audit writes are append-only and cheap; one worker keeps
   ordering per tenant and avoids pool pressure (pool is capped at 25 conns). The design
   allows raising worker count later without API changes.
5. **Graceful shutdown — new to the codebase.** `main.go` gains:
   `ctx := signal.NotifyContext(SIGINT, SIGTERM)` → `srv.Shutdown(5s)` →
   `recorder.Stop(5s)` which closes intake, drains the channel, flushes the final batch.
   Worst case (hard kill) loses ≤ a few seconds of audit events — acceptable for v1 and
   stated explicitly.
6. **Failure isolation.** Insert errors are Zap-logged with the batch size and schema and
   the batch is dropped after one retry — a broken audit table must never build unbounded
   memory or crash the API (mirrors the bulk-import "log and continue" precedent).

**Atomicity stance (answering the requirement directly):** the audit write is
*eventually consistent* with the business transaction — enqueued only **after** the tenant
transaction commit (§3.1 ordering), persisted within ~1 s by the worker. It is not part of
the business transaction by design: coupling them would reintroduce the latency the async
requirement forbids.

---

## 5. Data model

### 5.1 `audit_logs` (one per tenant schema + one in `platform`)

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGSERIAL PK` | |
| `branch_id` | `BIGINT NULL` | NULL for non-branch-scoped actions (users, catalog…) |
| `user_id` | `BIGINT NOT NULL` | **no FK** — deliberate (see below) |
| `user_email` | `VARCHAR(150) NOT NULL` | snapshot from claims |
| `user_role` | `VARCHAR(30) NOT NULL` | snapshot from claims |
| `action` | `VARCHAR(20) NOT NULL` | `CHECK (action IN ('create','update','delete'))` — extended by future migration |
| `entity_type` | `VARCHAR(60) NOT NULL` | `sale`, `patient`, `cash_register_close`, … |
| `entity_id` | `BIGINT NULL` | NULL when not resolvable |
| `entity_label` | `VARCHAR(200) NULL` | human-readable hint via `SetEntity` |
| `http_method` | `VARCHAR(8) NOT NULL` | |
| `route` | `VARCHAR(200) NOT NULL` | route *template* (`/api/v1/sales/:id`) |
| `status_code` | `SMALLINT NOT NULL` | |
| `changes` | `JSONB NULL` | redacted payload or old/new diff |
| `ip_address` | `VARCHAR(45) NULL` | IPv4/IPv6 |
| `user_agent` | `VARCHAR(255) NULL` | truncated |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Deliberate deviations from the standard table checklist (justified):**

- **Append-only**: no `updated_at`, no `deleted_at`, no `set_updated_at` trigger. An audit
  row that can be edited or soft-deleted is not an audit row. Immutability is the feature.
- **No FK on `user_id`**: the row must survive anything that happens to the user, and the
  hot insert path skips a constraint check. The user's email/role are snapshotted; the
  display name is resolved at read time (`LEFT JOIN users`) so renames still show current
  names.

**Indexes** (per DATABASE_GUIDE — no lone booleans, no redundancy):

```sql
CREATE INDEX idx_audit_logs_user_created  ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity        ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_brin  ON audit_logs USING BRIN (created_at);
```

The BRIN index makes date-range scans cheap at near-zero storage cost — the right choice
for an ever-growing insert-ordered table. A `(branch_id, created_at)` B-tree is added only
if branch-filtered queries prove slow (avoid speculative indexes).

**Migrations:** SQL pair `db/migrations/platform/000044_audit_logs.up/down.sql`
(idempotent `IF NOT EXISTS`) + `AuditLog` registered in both AutoMigrate lists in `db.go`
(the `BulkImportLog` precedent, `db.go:229,358`) so local envs get it automatically and
`MigrateAllTenantSchemas` propagates it to every existing tenant.

**Retention:** env `AUDIT_RETENTION_DAYS` (default `0` = keep forever). When set, the
recorder's worker runs a daily `DELETE ... WHERE created_at < now() - interval` per
schema. Monthly partitioning is the documented future path if volume ever warrants it —
not built now (YAGNI, clinics write hundreds of mutations/day, not millions).

---

## 6. Backend layout (3 layers, per DEVELOPMENT_GUIDE)

```
internal/domain/auditlog.go                    # AuditLog struct, AuditEvent, AuditLogFilter,
                                               #   AuditLogRepository interface, action constants
internal/platform/storage/postgres/
    audit_log_repository.go                    # CreateBatch(db, schema, rows), List(db, f),
                                               #   GetByID(db, id) — ErrRecordNotFound mapped
internal/audit/
    recorder.go                                # Recorder: Record(), Start(), Stop(ctx) — goroutine + batching
    redact.go                                  # payload redaction (pure, table-driven tested)
    service.go                                 # read side: List/Get for the admin endpoint
    service_test.go / recorder_test.go
internal/transport/http/v1/
    middleware/audit.go                        # AuditTrail middleware + route mapping + annotations
    handler_audit.go                           # thin: ShouldBindQuery → service → respond
    routes.go (edit)                           # middleware wiring + GET /audit-logs group
    handler.go (edit)                          # inject *audit.Service
cmd/api/main.go (edit)                         # recorder start, graceful shutdown, wiring
db/migrations/platform/000044_audit_logs.*    # DDL
```

### 6.1 Typed filter (Phase 21 pattern)

```go
type AuditLogFilter struct {
    Pagination
    UserID     *uint  `form:"user_id"`
    Action     string `form:"action"`
    EntityType string `form:"entity_type"`
    EntityID   *uint  `form:"entity_id"`
    BranchID   *uint  `form:"-"`          // resolveBranchOverride, never client-bound
    DateFrom   string `form:"date_from"`  // yyyy-mm-dd
    DateTo     string `form:"date_to"`
    Search     string `form:"search"`     // OR-ILIKE over user_email, entity_type, entity_label
}
```

Repository `List` projects explicit columns (**never** `SELECT *`, and `changes` is
**excluded** from the list projection — it's fetched only in `GetByID` for the detail
view; this keeps list pages light even with large payloads).

### 6.2 API

| Endpoint | Permission | Notes |
|---|---|---|
| `GET /api/v1/audit-logs` | `audit_logs:view` | standard envelope + `meta`; all filters above + `branch_id` |
| `GET /api/v1/audit-logs/:id` | `audit_logs:view` | full row incl. `changes`, user display name |
| `GET /api/v1/audit-logs/facets` | `audit_logs:view` | distinct `entity_type`s + static action list, for filter dropdowns |

New permission key `audit_logs:view` added to the Phase 19 permission catalog seed and
granted to the **admin** system role only.

---

## 7. Frontend (`convision-front`)

Follows the exemplars found in the codebase (CashCloses page + filter bar + EntityTable):

```
src/services/auditService.ts                  # typed flat snake_case params (cashRegisterCloseService style)
src/pages/admin/audit/AuditLogPage.tsx        # PageLayout + EntityTable (≤200 lines)
src/pages/admin/audit/auditLogColumns.tsx     # DataTableColumnDef[] (usersTableColumns pattern)
src/pages/admin/audit/AuditLogFiltersBar.tsx  # date range + user + action + entity + branch
src/pages/admin/audit/AuditLogDetailModal.tsx # Dialog: metadata + pretty-printed changes JSON
```

- **Page**: `EntityTable` with `queryKeyBase="admin-audit-logs"`, all filters in
  `extraFilters` (they enter the React Query key — `branch_id` included, per
  `.cursor/rules/convision-admin-branch-filter.mdc`), `emptyStateNode` **and**
  `filterEmptyStateNode` (EntityTable rule), `enableSearch` wired to the backend `search`.
  Columns: Fecha/hora · Usuario (name + email) · Acción (colored badge: create=green,
  update=amber, delete=red) · Entidad (`entity_type` + `entity_label`/`#id`) · Sucursal ·
  IP. Row click opens the detail modal.
- **Filters bar** (`CashClosesFiltersBar` pattern): two `DatePicker`s with presets
  (Hoy/7d/Mes), `SearchableCombobox` for the **user** (async, 300 ms debounce →
  `userService.getUsers({ search, per_page: 20 })`), action/entity `SearchableCombobox`es
  (entity options from `/audit-logs/facets`), `AdminBranchFilter` (`'all'` → sends `'0'`),
  active-filter chips with "Limpiar todo".
- **Detail modal** (DiscountRequests `Dialog` pattern): full metadata grid + `changes`
  rendered as formatted JSON in a scrollable `<pre>`.
- **Routing/nav**: `{ path: "audit", element: <AdminAuditLogPage /> }` under the `/admin`
  children in `App.tsx`; sidebar entry `{ title: 'Auditoría', path: '/admin/audit',
  icon: History }` in the `GESTIÓN` section of `AdminLayout.tsx`.
- All user-visible text in Spanish; identifiers in English (golden rule).

---

## 8. Plan breakdown (vertical, each independently buildable)

| Plan | Scope | Key acceptance criteria |
|---|---|---|
| **24-01: Schema + domain + repository** | `domain/auditlog.go`, migration `000044`, AutoMigrate (both lists), `audit_log_repository.go` | table exists per tenant + platform; repo unit-testable; `make build` green |
| **24-02: Async recorder + graceful shutdown** | `internal/audit/recorder.go`, `redact.go`, `main.go` signal handling | non-blocking `Record`; batches flush ≤1 s; `Stop()` drains; drop counter + WARN fallback; recorder tests green |
| **24-03: Capture middleware** | `middleware/audit.go`, route mapping, annotations, wiring on `protected` + `superAdmin` groups | every mutating 2xx request produces exactly one row; GETs add zero overhead; passwords redacted; login/refresh skipped |
| **24-04: Read API + RBAC** | `audit/service.go`, `handler_audit.go`, routes, `audit_logs:view` seed | filters work (user/action/entity/date/branch); list excludes `changes`; non-admin gets 403 |
| **24-05: Frontend module** | `auditService.ts`, page + columns + filters bar + detail modal, route + nav | admin filters by user and sees full history; detail shows redacted payload; `npm run build` green |
| **24-06: Verification + retention (optional)** | E2E pass (create sale → row appears; check async timing), retention job if `AUDIT_RETENTION_DAYS` set | `make lint && make test && make build` + `npm run build` all exit 0 |

Suggested execution: 24-01 → 24-02 → 24-03 → 24-04 → 24-05 → 24-06 (each plan leaves
`main` compilable; 24-03 is the first plan with user-visible effect).

---

## 9. Explicit trade-offs & future extensions

| Decision | Trade-off accepted | Future path |
|---|---|---|
| Middleware capture, not service-level diffs | `changes` = redacted request payload, not old→new diff | `SetChanges` annotation lets high-value handlers (sales, cash closes) attach real diffs incrementally |
| Async with bounded queue | Hard kill can lose ≤ a few seconds of events; full queue drops to app log | queue metrics endpoint; outbox table if compliance ever demands zero loss |
| Mutations only (`create/update/delete`) | No read/consult/login tracking | extend the `action` CHECK + mapping entries (`view`, `export`, `login`, `denied`) |
| One table per tenant schema, no partitioning | Fine for clinic-scale volume | monthly partitions + `CREATE INDEX CONCURRENTLY` documented in DATABASE_GUIDE when needed |
| Only-2xx logging | Failed/forbidden attempts invisible | log ≥400 with `status_code` already in the schema — mapping flag away |

---

## 10. Open questions (defaults chosen; flag if you disagree)

1. **Notifications self-updates** (`PUT /notifications/:id/read`) — skipped by mapping
   (noise). OK?
2. **Retention default** — proposed *keep forever* (`AUDIT_RETENTION_DAYS=0`) until the
   business defines a policy.
3. **Bulk import** — logged as one `create bulk_import` event (file name in `changes`),
   not one event per imported row (the kardex already records per-row movements). OK?
