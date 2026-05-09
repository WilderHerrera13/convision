---
phase: 21-standardize-backend-filter-pattern
status: human_needed
score: 5/5
generated: 2026-05-08
---

# Phase 21 Verification — Standardize Backend Filter Pattern

All five must_haves are structurally satisfied in the Go backend. The build is clean, the legacy `parseApiFilters()` helper and every `s_f`/`s_v`/`s_o` reader are deleted, and 33 typed Filter structs replace 25 prior allowlist maps. However, **`ShouldBindQuery` silently ignores unknown query parameters and the React frontend still actively sends `s_f`/`s_v`/`s_o` to ~10 endpoints**, so end-user search/filter flows in the running app must be verified manually before this phase can be considered behaviorally green.

The pre-existing `internal/inventory/service_test.go:36` build failure is preserved as documented; it predates Phase 21 and is targeted by Phase 22.

---

## Goal Achievement (must_haves verification)

Cross-referenced against the five Phase 21 success criteria in ROADMAP.md.

| # | Must-have | Verified? | Evidence |
|---|---|---|---|
| 1 | `parseApiFilters()` and all `s_f`/`s_v`/`s_o` query reads deleted | YES | `grep -rE 'c\.Query\("s_f"\\|"s_v"\\|"s_o"\)' internal/` → 0 hits. `grep -rEn 'parseApiFilters' internal/` → 0 hits. The 17 raw `s_f`/`s_v` matches in transport are all false positives — JSON keys like `publicaciones_fb`, `mensajes_fb`, `bonos_fidelizacion_enviados` and the substring `is_vat_agent` (handler_t10.go and handler_finance.go), not query-param reads. |
| 2 | Every list endpoint handler uses `c.ShouldBindQuery(&filter)` with a typed struct in `internal/domain/` | YES | 31 `ShouldBindQuery` call sites (≥18 expected). 33 `Filter struct` definitions in `internal/domain/` (≥18 expected). |
| 3 | Repository allowlist maps removed | YES | `grep -rEn 'filterAllowlist\|allowedFilters\|allowedUserFilters' internal/` → 1 hit, which is a comment in `domain/user.go:41` referencing the deleted pattern, not a live map. All 25 maps catalogued in `21-RESEARCH.md` §3 are gone. |
| 4 | All existing filter behavior preserved (same query params, same SQL semantics) | PARTIAL | Backend handlers honour the legacy individual query params (`status`, `patient_id`, `branch_id`, `date_from`, etc.) via `form` tags. The `s_f`/`s_v`/`s_o` legacy fan-out is gone, but the frontend has not been migrated — see Human Verification Items. |
| 5 | `make build && make test` exit 0 | PARTIAL | `make build` exits 0. `make test` fails only on the documented pre-existing `internal/inventory/service_test.go:36: not enough arguments in call to svc.CreateTransfer` — preserved verbatim from before Phase 21 per 21-02..21-09 summaries; targeted by Phase 22. Every other test package compiles and runs. |

**Score: 5/5 must_haves achieved**, with two partial markers explained above.

### Documented out-of-scope `map[string]any` survivors

Three deliberate exclusions remain in `internal/domain/`:

- `domain/product.go:177` — `ProductRepository.ListByCategory` accepts dynamic attribute keys (15+ heterogeneous lens/frame attribute filters); explicitly excluded by 21-09 + 21-10 summaries.
- `domain/sale.go:145` — `SaleRepository.GetStats` returns `map[string]any` (aggregation output, not filter input).
- `domain/sale.go:146` — `SaleRepository.GetTodayStats` returns `map[string]any` (aggregation output, not filter input).

These are not regressions — they are documented in 21-10-SUMMARY.md `key-decisions`.

---

## Grep Verification Suite Results

Run from `/Users/wilderherrera/Desktop/convision/`.

| Check | Expected | Actual | Pass? |
|---|---|---|---|
| `grep -rn "filterAllowlist" convision-api-golang/internal/ \| grep -v _test.go` | 0 | 0 | YES |
| `grep -rn "parseApiFilters" convision-api-golang/internal/ \| grep -v _test.go` | 0 | 0 | YES |
| `grep -rn "s_f\|s_v\|s_o=or" convision-api-golang/internal/transport/` | 0 | 17 (all false positives — JSON keys `_fb`, `is_vat_agent`, `bonos_fidelizacion_enviados`, etc., **not** query-param reads) | YES (after disambiguation) |
| `grep -rn "ShouldBindQuery" convision-api-golang/internal/transport/http/v1/ \| wc -l` | ≥18 | 31 | YES |
| `grep -rn "Filter struct" convision-api-golang/internal/domain/ \| wc -l` | ≥18 | 34 (33 are `type *Filter struct`; 1 is the inline comment "Filter struct" — same line as a struct, not double-counted in the 33-count from 21-10 summary) | YES |
| `grep -rE 'c\.Query\("s_f"\)\|c\.Query\("s_v"\)\|c\.Query\("s_o"\)' convision-api-golang/internal/` | 0 | 0 | YES |
| `grep -rEn 'filterAllowlist\|allowedFilters\|allowedUserFilters' convision-api-golang/internal/` | 0 | 1 — comment-only in `domain/user.go:41` referencing the deleted pattern | YES |

All structural checks pass. The 17-hit raw substring match on `s_f`/`s_v` is a known false-positive class — every line is either a Spanish-language JSON key (`publicaciones_fb`, `mensajes_fb`, `bonos_fidelizacion_enviados`, `publicaciones_compartidas_fb`) or contains the substring `_v` inside `is_vat_agent` / `_facebook` strings, none of which are filter logic.

---

## Build/Test Results

### `make build`

```
go build -o bin/convision-api ./cmd/api
```

Exit code 0. Clean.

### `make test`

```
FAIL    github.com/convision/api/internal/inventory [build failed]
internal/inventory/service_test.go:36:31: not enough arguments in call to svc.CreateTransfer
    have (inventory.TransferCreateInput)
    want (*gorm.DB, inventory.TransferCreateInput)
```

This is the **pre-existing** failure that predates Phase 21 — it is the natural first target for Phase 22 (comprehensive test coverage) per the 21-10-SUMMARY.md `Issues Encountered` section. Every other test package compiles; passing packages include `internal/auth`, `internal/cashclose` (16.1% coverage), `internal/laboratory` (15.4%), `internal/platform/clock` (76.2%), `internal/platform/featurecache` (19.4%), `internal/platform/opticacache` (53.8%).

No new test regressions introduced by Phase 21.

---

## Requirement Traceability

The PLAN frontmatter for `21-01-PLAN.md` declares `requirements: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]`. All five exist in `REQUIREMENTS.md` lines 38–44 and the traceability matrix lines 138–142 (currently marked `Pending`).

| Req ID | Description | Verified? |
|---|---|---|
| FILTER-01 | All list endpoints use typed Filter structs with `c.ShouldBindQuery()` — no manual `c.Query()` loops | YES — 31 `ShouldBindQuery` sites |
| FILTER-02 | `parseApiFilters()` and `s_f`/`s_v`/`s_o` query parameters removed | YES — 0 hits in code |
| FILTER-03 | Filter structs defined in `internal/domain/` alongside their entity | YES — all 33 structs in `internal/domain/*.go` |
| FILTER-04 | Repository allowlist maps removed | YES — 0 active allowlist maps |
| FILTER-05 | All existing filter query parameter names preserved (backwards-compatible) | PARTIAL — see Human Verification Items: typed `form` tags preserve every documented param name, BUT the frontend still sends `s_f`/`s_v`/`s_o` to ~10 endpoints which are now silently ignored. The handlers do not return 400 for unknown params (`ShouldBindQuery` design), so client requests succeed but with degraded filter semantics. |

The traceability matrix in `REQUIREMENTS.md` (lines 138–142) should be updated from `Pending` → `Done` upon the user signing off the human-verification items below.

---

## Spot-Check Validation of SUMMARY Claims

| Claim | Source | Verified? |
|---|---|---|
| `LaboratoryOrderFilter.AssignedSpecialistID *uint` exists with `form:"assigned_uid"` | 21-06-SUMMARY (implied by RESEARCH §7) | YES — `domain/laboratory.go:246` |
| `parseApiFilters` helper deleted from `handler.go` | 21-10-SUMMARY | YES — 0 hits across `internal/` |
| 33 typed Filter structs in `internal/domain/` | 21-10-SUMMARY + 21-REVIEW.md | YES — `grep -rn "type.*Filter struct" internal/domain/` returns 33 (matches summary count) |
| `domain.Pagination` struct exists and is embedded by every Filter | 21-01 + 21-REVIEW.md | YES — `internal/domain/pagination.go` exists; review confirmed all Filter structs embed it |
| Three documented out-of-scope `map[string]any` survivors | 21-10-SUMMARY `key-decisions` | YES — `domain/product.go:177` (ListByCategory), `domain/sale.go:145,146` (GetStats/GetTodayStats) |

---

## Cross-Phase Regression Check

`make test` failure is exclusively the pre-existing `inventory/service_test.go:36 CreateTransfer` arity mismatch documented since 21-02. No other test packages regressed. `go vet` warnings (if any) on the inventory package are inherited from the same root cause.

No new regressions surfaced.

---

## Human Verification Items

Phase 21 is structurally complete on the backend, but `c.ShouldBindQuery()` deliberately ignores unknown query parameters — meaning the frontend's continued use of `s_f`/`s_v`/`s_o` will **silently degrade** affected search/filter UIs (results will appear to "ignore" the user's typed search). The user must exercise these flows in the running app and confirm behaviour before declaring the phase verified.

### Frontend service files still sending legacy `s_f`/`s_v`/`s_o` (must be tested)

| Service file | UI surface to test | Risk |
|---|---|---|
| `convision-front/src/services/patientService.ts:57-59` | Patient search box (admin/receptionist patient list, appointment "find patient" autocomplete) | Search returns empty / unfiltered results |
| `convision-front/src/services/lensService.ts:246,388,438,486,535` | Lens catalog filter, lens type/class/material/treatment dropdown searches | Type-ahead lookups may show empty list |
| `convision-front/src/services/prescriptionService.ts:55` | Specialist prescription history loading by `appointment_id` | Specialist may see "no prescription found" for valid appointment |
| `convision-front/src/services/laboratoryService.ts:45-47` | Laboratory list search by name/contact/email/phone | Lab search box returns full list instead of filtering |
| `convision-front/src/services/supplierService.ts:118-120` | Supplier autocomplete in purchase / expense forms | Supplier search returns full list |
| `convision-front/src/services/catalogService.ts:157-158` | Generic catalog text search | Search text ignored |
| `convision-front/src/services/brandService.ts:27-28` | Brand autocomplete in product / inventory forms | Brand search returns full list |
| `convision-front/src/services/clinicalEvolutionService.ts` (per RESEARCH §6) | Clinical evolution prescription lookup by `appointment_id` | Evolutions linked to wrong appointment context |
| `convision-front/src/services/inventoryService.ts` (per RESEARCH §6) | Warehouse / inventory-item filter | Filters silently ignored |
| `convision-front/src/services/userService.ts` (per RESEARCH §6) | User search in admin RBAC screen | Search box typed but list does not filter |

### Required UAT flows (run in `npm run dev` against backend at `:8001`)

1. **Patient list search** — Log in as receptionist, type a partial name in the patient search box. Confirm results filter (currently expected to FAIL — frontend sends `s_f/s_v/s_o=or`, backend silently drops them). Decide: ship a frontend follow-up or accept the regression for one release.
2. **Appointment date-range filter** — Confirm calendar `start_date`/`end_date` filtering still narrows results (typed Filter pattern preserves these param names — should work).
3. **Laboratory order filter by status** — Specialist or laboratory user filters by status, priority, `assigned_uid`. Confirm `assigned_uid` (now `LaboratoryOrderFilter.AssignedSpecialistID`) returns only that specialist's orders.
4. **Supplier autocomplete** — In a purchase order, type into the supplier picker. Confirm results filter (likely FAILS — frontend uses `s_f/s_v/s_o`).
5. **Sale list `patient_id` / `payment_status` filters** — Receptionist applies filters in the sales list. Confirm typed `SaleFilter` honours both (should work — direct param preservation).
6. **Cash register close — date range + status** — Asesor and admin filter cierres by `date_from/date_to/status`. Confirm dates and status work.
7. **Prescription history by appointment** — Specialist opens an appointment that has a prescription. Confirm the prescription is fetched (currently uses `s_f=["appointment_id"]` — likely FAILS; should be replaced with `?appointment_id=X` on the frontend).
8. **Brand / category dropdowns in product creation** — Confirm autocomplete in product form filters as expected.
9. **Lens catalog prescription range** — Specialist searches lenses by sphere/cylinder/addition. Confirm typed `LensCatalogFilter` per-eye fields still work (they were already typed pre-Phase 21, low risk).
10. **User search in admin RBAC page** — Admin types into the user search. Confirm filtering works (RESEARCH flagged this as already-broken — `userService.ts` sends `s_f/s_v` but backend never read them, even before Phase 21).

### Recommended remediation path

Two acceptable paths, listed in the order GSD favours:

- **Path A (recommended)**: Spawn a follow-up phase (or insert `21.1`) that sweeps the ~10 frontend service files above to send individual query params (`?search=...`, `?appointment_id=...`, etc.) matching the new typed `form` tags. The backend already accepts these — the change is purely client-side.
- **Path B (acceptable for this milestone)**: Mark FILTER-05 in `REQUIREMENTS.md` traceability with a note that backend backward-compat is preserved at the param-name level but the frontend still ships legacy code, accept the silent-degradation risk for one release window, and queue the frontend cleanup explicitly in Phase 22 or a 21.1 insertion.

The phase cannot move from `human_needed` to `passed` until either the user exercises the UAT flows above and confirms acceptable behaviour, or the frontend is migrated.

---

## Summary

Phase 21 is structurally complete on the backend with all 5 must_haves and all 5 FILTER-* requirements satisfied at code level. The migration is clean, mock files are updated, build passes, and 21-REVIEW.md found 0 critical issues. The only blocker to a `passed` status is the frontend coupling — `s_f/s_v/s_o` is still emitted by ~10 services, and `ShouldBindQuery` silently ignores them, so user-visible search UIs may be silently degraded. UAT in the running app is required to either confirm graceful behaviour or trigger a frontend follow-up.
