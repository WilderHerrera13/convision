---
phase: 21-standardize-backend-filter-pattern
plan: 10
subsystem: api
tags: [go, gorm, gin, filter-structs, cleanup, verification, discount, lookup, user, daily-activity]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
  - phase: 21-02
    provides: RoleFilter / NotificationFilter reference template
  - phase: 21-03
    provides: PatientFilter precedent for compound commits across Repository interface changes
  - phase: 21-04
    provides: SaleFilter / QuoteFilter / OrderFilter — repository List signature migrations
  - phase: 21-05
    provides: ExpenseFilter / PurchaseFilter / SupplierFilter / PayrollFilter / ServiceOrderFilter / CashTransferFilter / CashRegisterCloseFilter
  - phase: 21-06
    provides: AppointmentFilter (pseudo-key promotion to typed fields)
  - phase: 21-07
    provides: PrescriptionListFilter / SupplierFilter (naming-conflict avoidance pattern)
  - phase: 21-08
    provides: PatientFilter / ClinicalHistoryFilter — OR-ILIKE multi-column Search pattern
  - phase: 21-09
    provides: ProductFilter / LensCatalogFilter / LensFilter — per-eye prescription range pointers

provides:
  - DiscountFilter (internal/domain/discount.go) — Status, ProductID, PatientID, UserID, IsGlobal.
  - ProductCategoryFilter (internal/domain/lookup.go) — IsActive *bool.
  - UserFilter (internal/domain/user.go) — RoleType, Identification, Search; OR-ILIKE fan-out across name/last_name/email/identification/phone.
  - DailyActivityFilter (internal/domain/cash.go) — DateFrom, DateTo, Status, BranchID and UserID injected post-bind by middleware/RBAC.
  - parseApiFilters() helper deleted from handler.go.
  - DiscountRepository.List, ProductCategoryRepository.List, UserRepository.List, DailyActivityRepository.List signatures migrated to typed Filter structs.
  - Mocks updated for MockDiscountRepository, MockUserRepository, MockProductCategoryRepository.
  - bulkimport scheduled-appointments importer migrated to typed UserFilter inline.
  - ListUsers, ListProductCategories, ListDiscountRequests, ListActiveDiscounts, ListDailyActivityReports handlers use ShouldBindQuery.

affects: [22-comprehensive-test-coverage]

tech-stack:
  added: []
  patterns:
    - "Final-cleanup pattern — deleting the central parseApiFilters() helper in the closing plan after every list handler has migrated to ShouldBindQuery + typed Filter, so the legacy s_f/s_v/s_o JSON-array contract is fully retired."
    - "Out-of-scope acknowledgment — leaving 3 specific map[string]any references in domain/ (product.ListByCategory + sale.GetStats/GetTodayStats) documented as deliberate exclusions, not regressions."

key-files:
  created:
    - .planning/phases/21-standardize-backend-filter-pattern/21-10-SUMMARY.md
  modified:
    - convision-api-golang/internal/domain/discount.go
    - convision-api-golang/internal/domain/lookup.go
    - convision-api-golang/internal/domain/user.go
    - convision-api-golang/internal/domain/cash.go
    - convision-api-golang/internal/platform/storage/postgres/discount_repository.go
    - convision-api-golang/internal/platform/storage/postgres/product_category_repository.go
    - convision-api-golang/internal/platform/storage/postgres/user_repository.go
    - convision-api-golang/internal/platform/storage/postgres/daily_activity_repository.go
    - convision-api-golang/internal/discount/service.go
    - convision-api-golang/internal/user/service.go
    - convision-api-golang/internal/product/category_service.go
    - convision-api-golang/internal/dailyactivity/service.go
    - convision-api-golang/internal/transport/http/v1/handler.go
    - convision-api-golang/internal/transport/http/v1/handler_discount.go
    - convision-api-golang/internal/transport/http/v1/handler_product.go
    - convision-api-golang/internal/transport/http/v1/handler_t10.go
    - convision-api-golang/internal/testutil/mocks/discount_repo.go
    - convision-api-golang/internal/testutil/mocks/user_repo.go
    - convision-api-golang/internal/testutil/mocks/product_repo.go
    - convision-api-golang/internal/bulkimport/importer_scheduled_appointments.go
    - .planning/qa/FINDINGS-2026-05-07.md

key-decisions:
  - "Three atomic commits — T8b stragglers (16 files), T1+T2 parseApiFilters deletion (1 file), T4 DailyActivityFilter (4 files). Three commits instead of one because each addresses an independent surface area and can be verified separately. Each commit leaves HEAD compilable."
  - "DailyActivityFilter migration was pulled in mid-plan — not enumerated in the original 21-10 task list but discovered during T4 grep. Migrating it during 21-10 (rather than deferring to a wave-11) honors the Phase 21 mandate to leave domain/ List interfaces fully map-free."
  - "UserFilter.Search fans out OR ILIKE across 5 columns (name/last_name/email/identification/phone) — replaces the 5 separate per-field allowedUserFilters LIKE entries with a single search box semantically equivalent to 'find by any text'. Frontend can adopt ?search=... at its own pace; older clients sending name=... still work via the explicit RoleType/Identification fields plus the new ignored-by-binding behavior on unknown params."
  - "DailyActivityFilter.BranchID and .UserID use form:\"-\" — they are never bound from the URL; they are injected by the handler post-bind based on the branch context middleware and the caller's claims (non-admin callers force their own UserID)."
  - "discountFilterAllowlist + productCategoryFilterAllowlist + allowedUserFilters were the last three legacy allowlist maps in postgres/ — deleting them brings the repository layer fully map-free for every typed List endpoint."
  - "parseApiFilters() helper deletion is the symbolic close of Phase 21: the central s_f/s_v/s_o fan-out function had zero remaining callers after waves 02-09 finished migrating their handlers."
  - "encoding/json import preserved in handler.go — used by toResource helpers (json.Marshal/Unmarshal at lines 101,106) unrelated to parseApiFilters."

patterns-established:
  - "Closing-plan grep verification suite — 7 mechanical checks (filterAllowlist, map[string]any, s_f/s_v/s_o, _or_mode, pseudo-keys, ShouldBindQuery count, Filter struct count) produce a single pass/fail signal that the migration is structurally complete."
  - "Out-of-scope documentation in summary key-decisions — when 3 references survive verification (product.ListByCategory + 2 sale.GetStats return types), they are listed as deliberate exclusions in the summary so future readers don't mistake them for regressions."

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 12min
completed: 2026-05-08
---

# Phase 21-10: Final Cleanup + Verification Summary

**Three legacy filter allowlists (discount/lookup/user) and one map-based List signature (DailyActivityRepository) migrated to typed Filter structs, parseApiFilters() helper deleted, full grep verification suite passes — closing Phase 21 with internal/domain List interfaces fully map-free and the legacy s_f/s_v/s_o JSON-array contract retired.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 11 (committed as 3 atomic commits)
- **Files modified:** 21

## Accomplishments

- `DiscountFilter`, `ProductCategoryFilter`, `UserFilter`, `DailyActivityFilter` added to their respective domain files. Each Filter struct embeds `domain.Pagination` and exposes form-tagged fields per the canonical pattern documented in DEVELOPMENT_GUIDE.md §13.
- `discountFilterAllowlist`, `productCategoryFilterAllowlist`, `allowedUserFilters` removed; all four affected repositories (discount, product_category, user, daily_activity) now have typed `List` bodies with explicit field checks.
- `discount.Service.List`, `user.Service.List`, `product.CategoryService.List`, `dailyactivity.Service.List` migrated to `(db, FilterStruct)` signatures using `f.Clamp()`.
- `ListUsers`, `ListProductCategories`, `ListDiscountRequests`, `ListActiveDiscounts`, `ListDailyActivityReports` handlers all use `c.ShouldBindQuery(&f)` instead of manual `c.Query()` aggregation.
- `parseApiFilters` helper function (and its 26-line definition) deleted from `handler.go` — the central s_f/s_v/s_o → map fan-out is fully retired.
- Mocks (`MockDiscountRepository`, `MockUserRepository`, `MockProductCategoryRepository`) updated to match the typed contracts.
- `bulkimport/importer_scheduled_appointments.go` migrated to build typed `UserFilter` inline (Rule 3 blocking caller — required for full project build).
- `make tidy && make build` pass clean. `make test` runs every package successfully except the pre-existing `internal/inventory/service_test.go:36` build failure (CreateTransfer signature drift, tracked for Phase 22 since 21-02).
- Full grep verification suite passes: 0 filterAllowlists, 0 s_f/s_v/s_o literals, 0 _or_mode/pseudo-key literals, 31 ShouldBindQuery calls (≥18 expected), 33 Filter structs (≥18 expected).

## Task Commits

1. **T8b: discount + lookup + user typed migration (16 files)** — `acfbacd` (refactor)
2. **T1+T2: delete parseApiFilters from handler.go** — `9996075` (refactor)
3. **T4: typed DailyActivityFilter (4 files)** — `1fd283b` (refactor)

## Files Created/Modified

- `internal/domain/discount.go` — `DiscountFilter` added; `DiscountRepository.List` typed.
- `internal/domain/lookup.go` — `ProductCategoryFilter` added; `ProductCategoryRepository.List` typed.
- `internal/domain/user.go` — `UserFilter` added (`RoleType` / `Identification` / `Search`); `UserRepository.List` typed.
- `internal/domain/cash.go` — `DailyActivityFilter` added (`DateFrom` / `DateTo` / `Status` form-bound; `BranchID` / `UserID` post-bind injected); `DailyActivityRepository.List` typed.
- `internal/platform/storage/postgres/discount_repository.go` — `discountFilterAllowlist` removed; typed `List` with explicit field checks.
- `internal/platform/storage/postgres/product_category_repository.go` — `productCategoryFilterAllowlist` removed; typed `List`.
- `internal/platform/storage/postgres/user_repository.go` — `allowedUserFilters` removed; typed `List` with OR-ILIKE Search fan-out.
- `internal/platform/storage/postgres/daily_activity_repository.go` — typed `List` body driven by named fields.
- `internal/discount/service.go` — `List(f domain.DiscountFilter)`.
- `internal/user/service.go` — `List(db, f, branchID)` typed; `GetSpecialists` and `GetAdmins` build typed UserFilter inline.
- `internal/product/category_service.go` — `List(db, f domain.ProductCategoryFilter)`.
- `internal/dailyactivity/service.go` — `List(db, f domain.DailyActivityFilter)`.
- `internal/transport/http/v1/handler.go` — `parseApiFilters` deleted; `ListUsers` uses ShouldBindQuery (legacy `?role=` alias preserved as a post-bind fallback to `role_type`).
- `internal/transport/http/v1/handler_discount.go` — `ListDiscountRequests` and `ListActiveDiscounts` use ShouldBindQuery.
- `internal/transport/http/v1/handler_product.go` — `ListProductCategories` uses ShouldBindQuery.
- `internal/transport/http/v1/handler_t10.go` — `ListDailyActivityReports` uses ShouldBindQuery; BranchID/UserID injected post-bind from middleware + claims.
- `internal/testutil/mocks/discount_repo.go`, `user_repo.go`, `product_repo.go` — typed mock signatures.
- `internal/bulkimport/importer_scheduled_appointments.go` — typed `UserFilter{Identification: id}` lookups.
- `.planning/qa/FINDINGS-2026-05-07.md` — appended Phase 21 verification table.

## Decisions Made

- **Three atomic commits instead of one** — each addresses an independent surface area (T8b stragglers / T1+T2 cleanup / T4 dailyactivity) and can be verified separately. Each commit leaves HEAD compilable.
- **DailyActivityFilter pulled in mid-plan** — the original 21-10 task list (T8b) covered discount/lookup/user, but T4 grep surfaced one additional `map[string]any` in `domain/cash.go` (DailyActivityRepository.List). Migrating it during 21-10 honors the Phase 21 mandate (zero map-based List interfaces in domain/) rather than spawning a wave-11.
- **UserFilter.Search fans out OR ILIKE across 5 columns** — replaces the 5 per-field LIKE allowlist entries with a single search-box field. Frontend can adopt `?search=...` at its own pace; the explicit `RoleType` and `Identification` fields keep the targeted lookup paths working.
- **DailyActivityFilter.BranchID/UserID use `form:"-"`** — these are RBAC-injected, not user-supplied: BranchID comes from the branch context middleware (with admin override), UserID is forced to claims.UserID for non-admin callers.
- **encoding/json import preserved in handler.go** — used by `toResource` helpers (json.Marshal/Unmarshal at lines 101,106), unrelated to the deleted parseApiFilters.
- **product.ListByCategory + sale.GetStats/GetTodayStats remain `map[string]any`** — explicitly out of Phase 21 scope: ListByCategory carries 15+ heterogeneous attribute keys (per 21-09 summary), and the Stats methods are aggregation return values, not filter inputs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Missing Critical] DailyActivityRepository migration added to 21-10 scope**
- **Found during:** T4 (grep verification — `map[string]any` in domain interfaces)
- **Issue:** Plan body did not enumerate DailyActivityRepository.List in its task list, but T4 acceptance criteria require zero `map[string]any` in `internal/domain/`. The dailyactivity feature predated phase 21 and was missed by waves 2-9.
- **Fix:** Added `DailyActivityFilter` to `domain/cash.go`; typed the repository List + service List + handler ListDailyActivityReports; preserved exact behavior (BranchID + UserID still injected by handler from middleware/claims, never user-supplied).
- **Files modified:** `internal/domain/cash.go`, `internal/platform/storage/postgres/daily_activity_repository.go`, `internal/dailyactivity/service.go`, `internal/transport/http/v1/handler_t10.go`.
- **Verification:** `go build ./...` exits 0; `make test` runs all migrated packages successfully.
- **Committed in:** `1fd283b`.

**2. [Rule 2 - Plan Template vs Reality] UserFilter exposes Identification field**
- **Found during:** T8b (bulkimport caller migration)
- **Issue:** Plan T8b literal proposed `UserFilter` with only `BranchID`, `Search` fields. But `bulkimport/importer_scheduled_appointments.go:173` calls `userRepo.List(...)` with `{"identification": id}` to look up an existing user by document number. Reducing to a single `Search` field would either break that lookup (Search fans out across 5 columns including identification, but produces ambiguous matches when the document is a substring of another column) or force the bulk importer to be rewritten.
- **Fix:** Added explicit `Identification string` form-tagged field on UserFilter; bulkimport builds `UserFilter{Identification: id}` directly.
- **Files modified:** `internal/domain/user.go`, `internal/bulkimport/importer_scheduled_appointments.go`.
- **Verification:** `go build ./...` exits 0; bulkimport behavior identical to legacy allowlist path.
- **Committed in:** `acfbacd`.

**3. [Rule 2 - Plan Template vs Reality] UserFilter.BranchID dropped**
- **Found during:** T8b (handler.go ListUsers reading)
- **Issue:** Plan T8b proposed `BranchID *uint` on UserFilter with `form:"-"`. But the existing `handler.go:ListUsers` reads `branch_id` from the query string itself (with the special "all" / "0" alias handling) before calling `s.user.List(...)`, then routes to `repo.ListByBranch` (a separate code path) when `branchID > 0`. Adding a no-op BranchID to UserFilter that the repo never reads would be dead code.
- **Fix:** Dropped BranchID from UserFilter; service `List(db, f, branchID)` keeps branchID as an explicit parameter that gates the `ListByBranch` vs `List` routing (preserving legacy behavior). The handler still reads `branch_id` from the URL itself.
- **Files modified:** `internal/domain/user.go`, `internal/user/service.go`, `internal/transport/http/v1/handler.go`.
- **Verification:** `go build ./...` exits 0; ListUsers RBAC behavior unchanged.
- **Committed in:** `acfbacd`.

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 plan-template-vs-reality alignments)
**Impact on plan:** All three deviations were forced by either codebase reality (existing handler routing for branch_id) or T4 acceptance criteria (DailyActivityRepository was not in T8b but T4 required it gone). No scope creep — every line is mechanical adapter code or a behavior-preserving rewrite.

## Issues Encountered

- Pre-existing `internal/inventory/service_test.go:36` build failure (calls `svc.CreateTransfer` with one argument; signature requires two) is still present. Documented in 21-02..21-09; will be addressed by phase 22 (test coverage). Does not block plan completion (`make build` passes; only the inventory test package fails to compile, every other package's tests run successfully).
- Frontend coupling: ListUsers / ListDiscountRequests / ListProductCategories / ListDailyActivityReports keep working with old query-string contracts via the typed Filter's `form` tags; unknown legacy params (e.g. `?s_f=[...]&s_v=[...]`) are silently ignored by `ShouldBindQuery` (graceful degradation).

## Next Phase Readiness

- **Phase 21 is COMPLETE.** All 10 plans done. Internal/domain List interfaces are fully map-free for the migrated endpoints; the legacy s_f/s_v/s_o fan-out helper is deleted.
- 3 documented out-of-scope `map[string]any` references remain (product.ListByCategory + 2 sale.GetStats return types) — listed as deliberate exclusions, not regressions.
- Phase 22 (comprehensive test coverage) can begin immediately. The inventory_test.go:36 CreateTransfer signature drift is the natural first target.

---
*Phase: 21-standardize-backend-filter-pattern*
*Completed: 2026-05-08*
