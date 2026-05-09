---
phase: 21-standardize-backend-filter-pattern
plan: 09
subsystem: api
tags: [go, gorm, gin, filter-structs, product, lens, lens-catalog, prescription-range]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template
  - phase: 21-08
    provides: precedent of compound commit when changing repository interfaces

provides:
  - ProductFilter typed struct (internal/domain/product.go) with Status, ProductCategoryID, BrandID, SupplierID, ProductType, TracksStock, InternalCode, Search.
  - LensCatalogFilter typed struct (internal/domain/product.go) with BrandID, SupplierID, Status, Search and per-eye prescription range pointers (SphereOD/OS, CylinderOD/OS, AdditionOD/OS).
  - LensFilter typed struct (internal/domain/lens.go) covering the equality-only filters of the standalone Lens entity.
  - PrescriptionFilter (lens-range JSON DTO used by ListByPrescription) preserved verbatim — distinct from the new typed query Filters; comment added documenting the distinction.
  - ProductRepository.List + ProductRepository.ListLensCatalog + LensRepository.List signatures migrated to typed Filter structs.
  - product/service.go List + ListLensCatalog collapsed to (db, FilterStruct).
  - ListProducts handler (handler_product.go) and ListLensCatalog handler (handler_inventory.go) using ShouldBindQuery; strconv.ParseFloat loop removed; "strconv" import dropped from handler_inventory.go.
  - MockProductRepository List + ListLensCatalog signatures match the typed contract.
  - bulkimport/importer_inventory.go and importer_lenses.go callers migrated to build typed ProductFilter inline.

affects: [21-10]

tech-stack:
  added: []
  patterns:
    - "Coexistence pattern — when a domain package already exposes a struct named *Filter (PrescriptionFilter, used as a JSON body DTO by ListByPrescription), the new typed query Filter takes a more specific name (LensCatalogFilter) and a clarifying comment is added on the existing struct so downstream readers don't conflate the two."
    - "Per-eye prescription range pointers — LensCatalogFilter exposes SphereOD/OS, CylinderOD/OS, AdditionOD/OS form-tagged float64 pointers; the repository fans these out using the OD-priority-falls-back-to-OS rule against the joined product_lens_attributes range columns (sphere_min/max, cylinder_min/max, addition_min/max)."

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/product.go
    - convision-api-golang/internal/domain/lens.go
    - convision-api-golang/internal/platform/storage/postgres/product_repository.go
    - convision-api-golang/internal/platform/storage/postgres/lens_repository.go
    - convision-api-golang/internal/product/service.go
    - convision-api-golang/internal/transport/http/v1/handler_product.go
    - convision-api-golang/internal/transport/http/v1/handler_inventory.go
    - convision-api-golang/internal/testutil/mocks/product_repo.go
    - convision-api-golang/internal/bulkimport/importer_inventory.go
    - convision-api-golang/internal/bulkimport/importer_lenses.go

key-decisions:
  - "Single compound commit (10 files) — same precedent as 21-04..21-08: changing the ProductRepository and LensRepository interfaces forces matching repo impls + service + handlers + mocks + bulkimport callers all in one commit to keep HEAD compilable."
  - "PrescriptionFilter preserved verbatim — it is a JSON body DTO consumed by ListLensesByPrescription (POST), not a query-string typed Filter. Renaming or merging it would force out-of-scope changes to the prescription-matching feature. A short comment was added on the struct documenting the distinction."
  - "ListByCategory left untouched — its filter map carries 15+ heterogeneous attribute keys (lens_type_id, frame_type, contact_type, gender, etc.) that span three different attribute tables. Migrating it would be a substantial planning task on its own and is outside 21-09's scope."
  - "LensCatalogFilter range filter logic — adopted the OD-priority-falls-back-to-OS rule the existing ListByPrescription already uses; product_lens_attributes carries a single sphere/cylinder/addition range, so we cannot satisfy both eyes independently. This preserves the legacy SQL semantics."
  - "LensRepository.List migrated to typed LensFilter even though it has zero production callers today — needed to honor the phase-21 mandate to leave the repository layer fully map-free; LensRepository will likely be deleted entirely in a later cleanup phase."

patterns-established:
  - "Mixed JSON-DTO + query-Filter package — when a domain file already contains a JSON body DTO named *Filter, the new ShouldBindQuery struct takes a more specific name (e.g. LensCatalogFilter alongside the existing PrescriptionFilter). Comments on both structs cross-reference each other."
  - "Per-eye numeric range form fields — *float64 pointers with form tags (sphere_od, cylinder_od, addition_od, sphere_os, cylinder_os, addition_os) work directly with ShouldBindQuery; no custom binding glue needed. Replaces the strconv.ParseFloat loop pattern."

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 8min
completed: 2026-05-08
---

# Phase 21-09: Product Catalog Filters Migration Summary

**Migrated product, lens-catalog, and standalone-lens list endpoints from `map[string]any` allowlists to typed Filter structs (ProductFilter, LensCatalogFilter, LensFilter) — replacing the strconv.ParseFloat loop for prescription range params with form-tagged *float64 pointers — while preserving the unrelated PrescriptionFilter JSON DTO used by ListByPrescription.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 7 (committed as 1 compound commit)
- **Files modified:** 10

## Accomplishments

- `ProductFilter` and `LensCatalogFilter` added to `internal/domain/product.go`. The existing `PrescriptionFilter` (lens-range JSON DTO) is preserved verbatim with a comment documenting the distinction.
- `LensFilter` added to `internal/domain/lens.go` covering the seven equality filters the legacy allowlist accepted.
- `productFilterAllowlist` and `lensFilterAllowlist` deleted; both repository List signatures + ProductRepository.ListLensCatalog flipped to typed Filter structs.
- `ListLensCatalog` repository method now uses the OD-priority-falls-back-to-OS prescription range rule against `product_lens_attributes.{sphere,cylinder,addition}_{min,max}` (preserves the legacy semantics).
- `product.Service.List` and `product.Service.ListLensCatalog` collapsed to `(db, FilterStruct)` using `f.Clamp()`.
- `ListProducts` (handler_product.go) and `ListLensCatalog` (handler_inventory.go) handlers use `ShouldBindQuery`. The 6-key `strconv.ParseFloat` loop for prescription params is gone; `"strconv"` import dropped from handler_inventory.go.
- `MockProductRepository.List` and `MockProductRepository.ListLensCatalog` mock signatures migrated to the typed Filter contract.
- `bulkimport/importer_inventory.go` and `importer_lenses.go` Rule-3 blocking callers migrated to build typed ProductFilter inline (preserves duplicate internal_code+product_type lookup behavior).
- `go build ./...` passes clean. `go test ./...` succeeds for every package except the pre-existing `internal/inventory/service_test.go:36` build failure (CreateTransfer signature drift) documented in 21-02..21-08 — unchanged by this plan, scoped to phase 22.

## Task Commits

1. **T1 (read-only) + T2..T7 (full migration: 2 domain Filters + 1 LensFilter + 2 repos + 1 service + 2 handlers + 1 mock + 2 bulkimport callers)** — `bf2f662` (refactor)

## Files Created/Modified

- `internal/domain/product.go` — `ProductFilter` and `LensCatalogFilter` added; `ProductRepository.List` and `ListLensCatalog` typed; `PrescriptionFilter` annotated to clarify it is a JSON body DTO, not the new query Filter.
- `internal/domain/lens.go` — `LensFilter` added; `LensRepository.List` typed.
- `internal/platform/storage/postgres/product_repository.go` — `productFilterAllowlist` removed; typed `List` with explicit field checks; typed `ListLensCatalog` with the OD-priority-falls-back-to-OS prescription range logic.
- `internal/platform/storage/postgres/lens_repository.go` — `lensFilterAllowlist` removed; typed `List` with seven equality field checks.
- `internal/product/service.go` — `List(db, f domain.ProductFilter)` and `ListLensCatalog(db, f domain.LensCatalogFilter)`; `f.Clamp()` replaces inline `clampPage`.
- `internal/transport/http/v1/handler_product.go` — `ListProducts` uses `ShouldBindQuery`; the inline-search fallthrough preserved (it preserves the legacy Search response contract).
- `internal/transport/http/v1/handler_inventory.go` — `ListLensCatalog` uses `ShouldBindQuery`; `strconv.ParseFloat` loop deleted; `"strconv"` import dropped.
- `internal/testutil/mocks/product_repo.go` — typed mock signatures.
- `internal/bulkimport/importer_inventory.go` and `importer_lenses.go` — typed inline ProductFilter construction for the duplicate-detection lookup.

## Decisions Made

- **Single compound commit** — same precedent as 21-04/21-05/21-06/21-07/21-08: changing two Repository interfaces forces matching repo impls + service + handlers + mocks + bulkimport callers all in one commit. Any partial split leaves HEAD uncompilable.
- **PrescriptionFilter preserved** — it is a JSON body DTO used by `ListLensesByPrescription` (POST endpoint), not a query-string Filter. The plan explicitly required preserving it; I added a comment cross-referencing the new `LensCatalogFilter` so future readers don't conflate the two.
- **ListByCategory left untouched** — its filter map carries 15+ attribute keys spanning three different attribute tables (lens, frame, contact_lens). Migrating it would be a substantive plan of its own and is outside 21-09's scope.
- **OD-priority-falls-back-to-OS for the lens catalog range filter** — `product_lens_attributes` carries a single sphere/cylinder/addition range, so we cannot satisfy both eyes independently. Adopting the same priority rule that `ListByPrescription` already uses preserves the legacy SQL semantics.
- **LensRepository.List migrated despite zero production callers** — the phase-21 mandate is to leave the repository layer fully map-free. The mock for LensRepository does not exist (no test depends on it), so the migration is mechanical and free of risk; LensRepository may be deleted in a future cleanup phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bulkimport callers migrated to typed ProductFilter**
- **Found during:** T7 (`go build ./...`)
- **Issue:** `bulkimport/importer_inventory.go:273` and `importer_lenses.go:70` call `productRepo.List(db, map[string]any{"internal_code": code, "product_type": pt}, 1, 1)`. After flipping `ProductRepository.List` to typed, these callers no longer compiled. The plan body did not enumerate them.
- **Fix:** Replaced both call sites with `r.productRepo.List(db, domain.ProductFilter{Pagination: domain.Pagination{Page: 1, PerPage: 1}, InternalCode: code, ProductType: pt})`. Behavior identical (same equality lookup, same page bounds).
- **Files modified:** `internal/bulkimport/importer_inventory.go`, `internal/bulkimport/importer_lenses.go`.
- **Verification:** `go build ./...` passes.
- **Committed in:** `bf2f662`.

**2. [Rule 2 - Plan Template vs Reality] LensRepository.List uses LensFilter (not LensCatalogFilter)**
- **Found during:** T1 read-pass / T2 design
- **Issue:** Plan T2/T4 implied a single `LensCatalogFilter` covering both `ProductRepository.ListLensCatalog` and `LensRepository.List`. But the lens table schema has range fields (`sphere_min`/`sphere_max`/`cylinder_min`/...) per row, not the `sphere_od` columns the plan's literal SQL referenced. The legacy `lensFilterAllowlist` only carried equality filters (status, type_id, brand_id, material_id, lens_class_id, treatment_id, supplier_id) — no sphere/cylinder. Reusing `LensCatalogFilter` (which has 6 prescription-range pointers) for `LensRepository.List` would be misleading: those fields would be silently ignored.
- **Fix:** Introduced a separate `LensFilter` (no Sphere/Cylinder/Addition fields) for `LensRepository.List`. `LensCatalogFilter` exclusively serves `ProductRepository.ListLensCatalog` (the path the actual `/inventory/lens-catalog` endpoint uses).
- **Files modified:** `internal/domain/lens.go`, `internal/platform/storage/postgres/lens_repository.go`.
- **Verification:** `go build ./...` passes.
- **Committed in:** `bf2f662`.

**3. [Rule 2 - Plan Template vs Reality] handler_product.go inline-search branch preserved**
- **Found during:** T6
- **Issue:** Plan T6 said `ListProducts` should be a 7-line `ShouldBindQuery` → service call. But `ListProducts` already had an inline-search fallthrough — when `?search=...` is present, it routes to `Service.Search` (which produces a different SQL via `LIKE LOWER(...)` + identifier/internal_code/description columns + optional category join), and returns the same `meta` envelope. Replacing this with the plain `Service.List` Search path would change the wire-format response on the search endpoint.
- **Fix:** Kept the inline-search branch but driven by the typed `f.Search` field; otherwise the handler is the typed-Filter shape the plan called for.
- **Files modified:** `internal/transport/http/v1/handler_product.go`.
- **Verification:** `go build ./...` passes; manual review confirms search response shape is unchanged.
- **Committed in:** `bf2f662`.

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 plan-template-vs-reality alignments)
**Impact on plan:** All three deviations were forced by the codebase reality (out-of-scope callers, schema mismatch on lens table, legacy search-response contract). No scope creep — every line is mechanical adapter code or a behavior-preserving rewrite.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:36` build failure (calls `svc.CreateTransfer` with one argument; signature requires two) is still present. Documented in 21-02..21-08; will be addressed by phase 22 (test coverage). Does not block plan completion (`go build ./...` passes clean; only the inventory test package fails to compile).
- Frontend coupling: the receptionist product list still sends `?search=<term>` for the inline-search branch (preserved). The new typed Filter struct silently ignores any unknown legacy params (e.g. `tracks_stock=1` is now a clean bool, while older clients sending `tracks_stock=yes` will see no effect). No frontend change required.

## Next Phase Readiness

- 9 of 10 plans done in Phase 21 (90%).
- Only 21-10 (catch-all `parseApiFilters` cleanup in handler.go) remains.
- 21-10 can begin immediately. No blockers.

---
*Phase: 21-standardize-backend-filter-pattern*
*Completed: 2026-05-08*
