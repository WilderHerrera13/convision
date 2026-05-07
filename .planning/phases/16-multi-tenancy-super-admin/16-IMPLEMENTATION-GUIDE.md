---
phase: 16
title: "Multi-tenancy + super admin — high-level implementation handoff"
audience: "Specialized agent that will write detailed PLAN.md files and implement"
canonical_design: "16-ARCHITECTURE.md"
---

## Purpose

This document is the **high-level execution map** for phase 16. It tells a specialized agent **what to build, in what order, and how to know each slice is done**. It does **not** replace detailed plans: the implementing agent should produce `16-01-PLAN.md` … `16-07-PLAN.md` (or equivalent waves) with file-level tasks before coding.

**Canonical design:** read `16-ARCHITECTURE.md` first — it defines subdomain routing (`admin.app.*` for super admin, tenant slugs for opticas), `platform` schema vs per-tenant schemas, JWT claims, feature flags, caches, security rules, and GoDaddy DNS status (wildcard `*.app` already added).

---

## Global constraints (non-negotiable)

- **Code:** English identifiers, paths, comments per repo rules. **UI:** Spanish strings.
- **Backend:** `convision-api-golang/` only — follow `DEVELOPMENT_GUIDE.md` and `DATABASE_GUIDE.md`.
- **Frontend:** `convision-front/` — `EntityTable` for tables, `DatePicker` for dates, `SearchableCombobox` for selects, admin pages with branch filter where applicable (super-admin area is exempt from branch filter).
- **No new AWS paid services** for caching — in-process caches + warm-up at startup (see architecture).
- **Reserved slug `admin`** maps to super admin portal; block reserved slugs on optica create.

---

## Dependency order (must follow)

```
16-07 (infra: ACM + CloudFront + nginx) can partially overlap with 16-01
       but HTTPS for *.app must work before production cutover.

16-01 → 16-02 → 16-03 → 16-04 → 16-05 → 16-06
  │        │
  └────────┴── 16-05 is large; may be split into waves (repos by domain).

16-07 data migration (schema move) runs after 16-01..16-04 are stable in staging,
       or as a dedicated maintenance window — see architecture §12.
```

---

## Slice 16-01 — Platform data model (backend)

**Goal:** Postgres has a `platform` schema with `opticas`, `super_admins`, `optica_features`. Go domain + repositories can read/write them using explicit `platform.` table names or `search_path` limited to platform for those repos only.

**Main work:** Numbered SQL migrations under `convision-api-golang/db/migrations/platform/`. GORM models with `TableName()` returning `platform.<table>`. Wire minimal repos in `main.go` for bootstrap reads if needed.

**Exit criteria:** `migrate up` applies cleanly on empty DB extension path; unit tests or smoke `SELECT` against platform tables; `convision_app` has `CREATE SCHEMA` if migrations create schemas (confirm on RDS).

**Handoff to detailed plan:** migration file names, exact columns, indexes, down migrations, and whether AutoMigrate in local dev must include new structs.

---

## Slice 16-02 — Tenant resolution + DB scoping (backend)

**Goal:** Every authenticated tenant request runs with `SET LOCAL search_path` to the correct tenant schema; subdomain slug resolves to tenant via in-memory cache warmed at startup; reserved slug `admin` resolves to `platform` for super-admin routes only.

**Main work:** Middleware chain in `internal/transport/http/v1/` (or `middleware/`): parse `X-Forwarded-Host` / `Host`, validate slug, attach `schema_name` and `optica_id` to Gin context. `OpticaCache.WarmUp` from `main.go` before listening. `TenantSchemaMiddleware` + JWT tenant mismatch check per architecture §5.2.

**Exit criteria:** Local run: two fake tenants in `platform.opticas` + two empty schemas — hit API on different `Host` values (curl `-H "Host: ..."`) and prove tables resolve to different schemas.

**Handoff:** exact middleware order vs public routes (`/auth/login`, guest PDFs), and how guest routes behave (likely single tenant or disabled until defined).

---

## Slice 16-03 — Auth + JWT (backend)

**Goal:** Login distinguishes super admin (`platform.super_admins` on `admin.*` host) vs tenant users (user row in tenant schema). JWT includes `optica_id`, `schema_name`, `feature_flags` for tenants; super admin JWT uses `platform` and empty flags. Refresh path reloads flags from cache when implemented.

**Main work:** Extend `internal/platform/auth/jwt.go` claims; `internal/auth/service.go` login flow; handler response shape for front; `RequireRole` includes `super_admin`.

**Exit criteria:** curl login against `admin` subdomain returns super admin token; login against tenant subdomain returns tenant token; wrong subdomain + token → 403.

**Handoff:** response JSON contract for `AuthContext` (field names, branches array for tenants only).

---

## Slice 16-04 — Super admin API (backend)

**Goal:** CRUD for opticas (create = new schema + run tenant migrations + seed admin branch + default flags), list/update/deactivate; feature flag read/update with cache invalidation; optional list/create tenant admins from platform context using tenant `search_path` for inserts.

**Main work:** New `internal/` package(s) e.g. `optica`, `superadmin` or grouped under `platformtenant`; handlers in `transport/http/v1`; routes under `/api/v1/super-admin/` with `RequireRole(super_admin)` only.

**Exit criteria:** Postman/curl: super admin token can create optica, toggle flag, list opticas; inactive optica rejects tenant login.

**Handoff:** idempotency of create-optica, transaction boundaries, failure rollback (`DROP SCHEMA`), and how migration runner is invoked (embedded golang-migrate vs shell).

---

## Slice 16-05 — Repository refactor (backend)

**Goal:** All business queries use the tenant-scoped `*gorm.DB` from context (or explicit schema for platform repos). No accidental queries against `public` when tenant is active.

**Main work:** Mechanical refactor across `internal/platform/storage/postgres/*_repository.go` and services/handlers — pass `db` as first parameter or inject per-request DB factory. This is the largest diff; split by domain in detailed plans.

**Exit criteria:** `make test` / `make lint` green; spot-check critical flows (patients, appointments, login) on two tenants without cross-leakage.

**Handoff:** list of repositories grouped by wave to avoid merge hell.

---

## Slice 16-06 — Frontend (super admin + flags)

**Goal:** Super admin UI on `admin.app.*` routes: opticas list/create/detail, feature flags editor. Tenant apps use `useFeature()` (or equivalent) to hide sidebar entries per JWT flags. Login page works on tenant subdomains; super admin bookmark uses `admin.app.*`.

**Main work:** `App.tsx` routes, `SuperAdminLayout`, services under `src/services/`, extend `AuthContext` with `feature_flags` and role `super_admin`. Do not duplicate table UIs — `EntityTable` + empty states per project rules.

**Exit criteria:** Manual QA on two subdomains (or hosts file locally); flags toggle reflects after re-login or refresh token per design.

**Handoff:** exact menu keys ↔ feature flag keys matrix for QA.

---

## Slice 16-07 — Infra + data cutover

**Goal:** TLS and routing accept `*.app.opticaconvision.com`. nginx forwards `Host` / `X-Forwarded-Host`. Data migration moves existing single-tenant `public` tables into first tenant schema `optica_main` and seeds `platform` rows per architecture §12.

**Main work:** Terraform ACM SAN wildcard + CloudFront alternate domain names; nginx `server_name`; deploy order documented; migration SQL script reviewed against production row counts.

**Exit criteria:** Browser loads `https://admin.app.opticaconvision.com` and `https://<slug>.app.opticaconvision.com` without cert warnings; smoke test production-like stack.

**Handoff:** GoDaddy wildcard already done — only ACM/CloudFront/nginx + migration runbook remain.

---

## What the specialized agent should produce next

1. **`16-01-PLAN.md` … `16-07-PLAN.md`** (or fewer files if waves merge) with: YAML frontmatter, task IDs, `read_first` file lists, exact paths, verification commands, rollback notes.
2. **`16-CONTEXT.md`** (optional) — links to PRs, env vars added, bootstrap super admin email policy.
3. **Update `ROADMAP.md` / `STATE.md`** when phase starts and when it completes (repo convention).

---

## Risks to call out in deep plans

- **PgBouncer / connection pooling:** if introduced later, `SET LOCAL` must remain transaction-scoped; session pooling breaks `search_path` patterns.
- **Guest PDF routes and unauthenticated endpoints:** decide tenant per token vs per subdomain vs single-tenant legacy.
- **Email uniqueness:** today global unique on `users.email` — with per-schema users, uniqueness is per tenant; super admin emails live only in `platform.super_admins`.
- **Deploy order:** new API before data migration vs migration before API — pick one and document rollback.

---

## Done = phase complete when

- Super admin can provision an optica and manage feature flags from the UI.
- Two tenants on two subdomains have isolated data (spot-check + automated test where feasible).
- Existing production tenant migrated to `optica_main` (or agreed slug) without prolonged downtime, with a written rollback.
- Documentation: this guide + architecture updated if reality diverges (e.g. guest route decision).
