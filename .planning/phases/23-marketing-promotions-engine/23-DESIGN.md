# Phase 23 — Marketing Promotions Engine (Design & Implementation Plan)

**Status:** Draft for review · **Author:** engineering · **Date:** 2026-07-02
**Depends on:** Phase 18 (Sales-Inventory), Phase 19 (RBAC), Phase 21 (typed filters)

---

## 1. Goal

Add **automatic, admin-configured marketing promotions** that apply at checkout, on top
of the existing per-product/per-patient **discount approval** module (`discount_requests`),
which stays untouched.

Deliver five promotion types, one vertical slice at a time, each shippable and tested E2E:

1. **Cart-total threshold** — spend ≥ $X → % or fixed off.
2. **Fixed-amount** — flat $ off (optionally gated by a minimum).
3. **Birthday** — % or $ off during the patient's birthday month.
4. **Category/brand/product-type** — discount limited to matching items.
5. **Second pair (segundo par / 2x1)** — discount the cheaper additional unit.

---

## 2. Why this is a *new* subsystem, not an extension of `discount_requests`

The existing `discount_requests` table is a **manual, single-product, approval-workflow**
record (`status pending/approved/rejected`, `product_id`, `patient_id`, snapshot
`original_price`/`discounted_price`, `approved_by`). Marketing promotions are a different
concept: **rules evaluated against the whole cart at checkout**, with no per-product row and
no approval step. Overloading `discount_requests` would pollute its approval UI and
semantics. → **New `promotions` domain + service + engine.**

This mirrors the codebase's own separation of concerns (one package per feature under
`internal/`, per `DEVELOPMENT_GUIDE.md`).

---

## 3. What the first (aborted) attempt got wrong — and how this plan fixes it

| First attempt (rejected) | The better way (this plan) |
|---|---|
| Discount computed in the browser and **trusted** by `sale.Create` | **Server-authoritative**: the engine is the single source of truth; `sale.Create` re-evaluates and persists the real amount. Frontend only *previews*. |
| Schema created only via GORM `AutoMigrate` (struct tags) | **Numbered SQL migrations** in `db/migrations/platform/` per `DATABASE_GUIDE.md §10`, idempotent, for staging/prod. AutoMigrate remains local-only convenience. |
| No tests | **Table-driven unit tests first** for the pure engine (its logic is a pure function → trivially testable), plus handler integration tests, then Playwright E2E per slice. |
| One giant change (foundation + admin UI + cart) landed at once | **Vertically sliced**: a stable foundation, then one promotion type per sub-plan, each independently mergeable + E2E-verified. |
| Applied promotion left no trace on the sale | **Persist `promotion_id` + `promotion_discount` on the sale** for audit, reporting, and cash-close correctness. |
| Tax interaction unspecified | **Explicit**: promotion reduces the taxable base (applied *before* IVA). |

---

## 4. Data model

### 4.1 `promotions` table (lives in each tenant schema, like `discount_requests`)

Isolation is by **schema-per-tenant** (Phase 16), so — consistent with `discount_requests`
— the table carries **no `clinic_id`**. Branch scoping is deferred (see Open Questions).

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGSERIAL PK` | |
| `name` | `VARCHAR(150) NOT NULL` | admin-facing campaign name |
| `type` | `VARCHAR(30) NOT NULL` | `CHECK IN ('cart_total','fixed_amount','birthday','category','second_pair')` |
| `active` | `BOOLEAN NOT NULL DEFAULT true` | |
| `priority` | `INTEGER NOT NULL DEFAULT 0` | tie-breaker when several match |
| `discount_percentage` | `NUMERIC(5,2) NULL` | |
| `discount_amount` | `NUMERIC(12,2) NULL` | money → NUMERIC, never FLOAT |
| `min_cart_total` | `NUMERIC(12,2) NULL` | threshold gate |
| `min_quantity` | `INTEGER NULL` | for second_pair / volume |
| `scope` | `VARCHAR(20) NOT NULL DEFAULT 'cart'` | `CHECK IN ('cart','category','brand','product_type')` |
| `product_category_id` | `BIGINT NULL REFERENCES product_categories(id)` | |
| `brand_id` | `BIGINT NULL REFERENCES brands(id)` | |
| `product_type` | `VARCHAR(30) NULL` | |
| `start_date` | `TIMESTAMPTZ NULL` | window start (NULL = open) |
| `end_date` | `TIMESTAMPTZ NULL` | window end (NULL = open) |
| `description` | `TEXT` | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | trigger `set_updated_at` |
| `deleted_at` | `TIMESTAMPTZ NULL` | soft delete + partial index |

**Indexes:** partial B-tree `(active) WHERE deleted_at IS NULL`; `(start_date, end_date)`
for the active-window scan; `(type)`.

**Design intent:** one wide table with a `type` discriminator + nullable rule columns
keeps the engine a single switch and avoids a table-per-type explosion. Validation of
"which columns are required for which type" lives in the **service**, enforced by CHECK
constraints only where cheap.

### 4.2 `sales` additions (audit + reporting)

```
ALTER TABLE sales ADD COLUMN promotion_id BIGINT NULL REFERENCES promotions(id);
ALTER TABLE sales ADD COLUMN promotion_discount NUMERIC(12,2) NOT NULL DEFAULT 0;
```

`sale.Discount` continues to hold per-line discounts; `promotion_discount` is the
cart-level promotion, stored separately so reports can attribute revenue impact.

---

## 5. Backend architecture (3 layers, per DEVELOPMENT_GUIDE)

```
internal/domain/promotion.go              # Promotion struct, PromotionType/Scope, Filter, Repository interface
internal/platform/storage/postgres/
    promotion_repository.go               # GORM impl; ErrRecordNotFound → domain.ErrNotFound
internal/promotion/service.go             # CRUD + Evaluate() engine (PURE, no DB in the math)
internal/promotion/service_test.go        # table-driven engine tests (write FIRST)
internal/transport/http/v1/
    handler_promotion.go                   # thin handlers
    routes.go (edit)                       # /promotions group + /promotions/evaluate
    handler.go (edit)                       # inject *promotion.Service
cmd/api/main.go (edit)                     # repo → service → handler wiring
db/migrations/platform/NNN_*.up/down.sql  # promotions table + sales columns
```

### 5.1 The evaluation engine (heart of the feature)

A **pure function**: `Evaluate(cart, patient, now, activePromotions) → AppliedPromotion`.
No DB access inside the math (the repo loads `activePromotions` once) → fully unit-testable.

**Algorithm:**
1. `eligibleSubtotal = Σ(price·qty − line_discount)` over cart items (net of existing per-line discounts).
2. Load active promotions whose window contains `now` (`active AND start≤now AND end≥now`).
3. For each, `computeAmount(promo, cart, patient, eligibleSubtotal)` per `type` (switch).
4. **Selection policy:** apply **at most one** promotion — the largest amount, ties broken
   by `priority DESC`. (Prevents stacking surprises; configurable later — see Open Questions.)
5. Cap the amount at `eligibleSubtotal` (never negative totals), round to 2 decimals.

**Per-type `computeAmount`:**
- `cart_total`: `eligibleSubtotal ≥ min_cart_total` → pct·subtotal or fixed.
- `fixed_amount`: optional min gate → `discount_amount` (capped).
- `birthday`: patient birth month == now month (+ optional min) → pct or fixed on subtotal.
- `category`: `matchedSubtotal` over items matching `scope` (category/brand/product_type) → pct or fixed on matched.
- `second_pair`: expand qualifying items to units, sort desc, discount every 2nd unit.

### 5.2 Server-authoritative application (the key correctness rule)

- `POST /promotions/evaluate` → used by the cart **for preview only**.
- `sale.Create` (and `quote.Create`, if in scope) **re-runs the same engine** on the
  server, ignoring any client-sent promotion amount, and persists `promotion_id` +
  `promotion_discount`, recomputing `tax` and `total` from the server figure.
- Tax: `taxable = eligibleSubtotal − promotion_discount`; `tax = taxable·0.19`;
  `total = taxable + tax`. (Promotion reduces the IVA base.)

### 5.3 API contract

| Method | Path | RBAC | Purpose |
|---|---|---|---|
| GET | `/api/v1/promotions` | `promotions:view` | list (typed `PromotionFilter`) |
| GET | `/api/v1/promotions/:id` | `promotions:view` | detail |
| POST | `/api/v1/promotions` | `promotions:create` | create |
| PUT | `/api/v1/promotions/:id` | `promotions:edit` | update |
| DELETE | `/api/v1/promotions/:id` | `promotions:delete` | soft delete |
| POST | `/api/v1/promotions/evaluate` | any authenticated seller | cart preview |

**RBAC:** add `promotions:{view,create,edit,delete}` to the Phase 19 permission seed and
grant to Admin (matching the `discounts:*` pattern) — *not* hardcoded role strings.

---

## 6. Frontend

### 6.1 Admin management page (shared by all types)

- Route `/admin/promotions`; sidebar item **"Promociones"** under `COMERCIAL`
  (next to "Descuentos"), icon `Tag`/`BadgePercent`.
- `src/pages/admin/Promotions.tsx` using **EntityTable** (with `emptyStateNode` +
  `filterEmptyStateNode`, per the EntityTable rule).
- `src/components/promotions/PromotionFormModal.tsx` — React Hook Form + Zod; a **type
  selector** switches which fields show (threshold, %/amount, scope pickers via
  `SearchableCombobox`, date-range via `DatePicker`).
- `src/services/promotionService.ts` — CRUD + `evaluate`, through the `ApiService`/`api`
  singleton (never axios directly).

### 6.2 Cart integration (mirror the existing auto-discount pattern)

- In `useNewSale.ts`, add a `useEffect` keyed on `[saleItems, selectedPatient]` that calls
  `promotionService.evaluate(cart, patient)` — mirroring `applyBestDiscountAutomatically`
  (the per-line discount auto-apply already there).
- Store `appliedPromotion`; subtract it in **both** `recalcTotals` and the `submitSale`
  payload builder (the two places totals are computed).
- `PurchaseSummary.tsx`: render a new **"Promoción"** row (green, `formatCurrency`) below the
  "Descuento" row and above IVA. Add a `promotion` prop threaded from `useNewSale`.
- Submit payload: include `promotion_id`; backend recomputes authoritatively.

Active new-sale flow is `/receptionist/sales/new` → `NewSale.tsx` → `useNewSale.ts` →
`PurchaseSummary.tsx` (confirmed during recon).

---

## 7. Delivery plan — vertical slices

Each slice = backend rule + admin form support + cart preview + **unit tests + Playwright
E2E** + atomic commit. Slice 0 is the enabler; 1–5 are shippable increments.

| Slice | Deliverable | New surface |
|---|---|---|
| **0. Foundation** | `promotions` table + SQL migration, domain/repo/service skeleton, CRUD API + RBAC, engine scaffold with table-driven test harness, admin list page + empty form, wiring | biggest, one-time |
| **1. Cart-total** | `cart_total` compute + admin form + cart preview + server enforce in `sale.Create` + `sales` columns | engine case + sale hook |
| **2. Fixed-amount** | `fixed_amount` compute + form fields | engine case |
| **3. Birthday** | `birthday` compute (uses `patient.birth_date`) + form | engine case + patient birth_date passthrough |
| **4. Category/brand/type** | `category` compute + scope pickers | engine case + item metadata passthrough |
| **5. Second pair** | `second_pair` compute + form | engine case |

**Definition of done per slice:** unit tests green; `make lint test build` clean; Playwright
script drives login → create promo (admin) → new sale (receptionist) → asserts the
"Promoción" row + correct total → persists → reopen sale shows stored `promotion_discount`.

---

## 8. Testing strategy

- **Engine unit tests (first):** table-driven cases per type — below/at/above threshold,
  pct vs fixed, cap-at-subtotal, empty cart, no active promo, window boundaries, birthday
  month match/miss, scope match/miss, second-pair with 1/2/3/4 units, best-of-several
  selection + priority tie-break.
- **Repository/handler integration:** `ListActiveAt` window filter; validation rejections
  (missing `min_cart_total`, bad percentage, scope without target).
- **E2E (Playwright, real browser):** one scripted journey per slice against the running
  dev stack (backend :8001, frontend :4300), asserting on the actual totals in the DOM and
  the persisted sale.

---

## 9. Security & correctness checklist

- Server recomputes promotions in `sale.Create`; client amount is never trusted.
- Amount capped at subtotal; percentage bounded (0,100]; money as `NUMERIC`.
- Promotion applied before IVA (reduces taxable base) — consistent across preview + persist.
- Tenant isolation via schema (no cross-optica leakage); soft delete + partial indexes.
- Report/cash-close impact reviewed: `promotion_discount` flows into sale totals that
  daily reports and cash close already read (verify no double counting).
- Audit: `promotion_id` on the sale ties revenue impact back to a campaign.

---

## 10. Decisions needed before build (Open Questions)

1. **Stacking policy** — single best promotion (recommended, safest), or allow stacking by
   priority? *Default: single best.*
2. **Tax treatment** — promotion before IVA (recommended) vs after? *Default: before IVA.*
3. **Scope of application** — sales only, or also **quotes** and **orders**? *Default:
   sales first; quotes/orders in a follow-up.*
4. **Branch scoping** — clinic-wide promotions only (v1), or per-branch targeting now?
   *Default: clinic-wide; add optional `branch_id` later.*
5. **Coupons/other types** — out of scope here; the schema already leaves room for
   `coupon_code`, `min_quantity` (volume), and date-window campaigns as later types.

---

## 11. Rollout

1. Land Slice 0 behind the CRUD API (no cart impact yet) → verify admin can create/list.
2. Land Slice 1 → the first user-visible promotion, fully E2E-verified.
3. Iterate slices 2–5, each its own PR/commit + E2E.
4. Add SQL migrations to the staging/prod pipeline (`make migrate`), never rely on
   AutoMigrate outside local.
```
Formalize into GSD: add "Phase 23 — Marketing Promotions Engine" to ROADMAP.md, then
`/gsd-plan-phase 23` to generate the per-slice 23-0N-PLAN.md files from this design.
```
