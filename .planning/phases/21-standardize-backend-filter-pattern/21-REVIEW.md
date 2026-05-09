---
phase: 21-standardize-backend-filter-pattern
status: issues_found
depth: quick
files_reviewed: 109
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
generated: 2026-05-08
---

## Summary

Phase 21 cleanly migrated 33 typed Filter structs across the entire Go backend.
Spot checks confirm:

- Every Filter struct in `internal/domain/` embeds `domain.Pagination`. PerPage/Page/Clamp work uniformly.
- `form:"-"` is used correctly for middleware-injected fields (BranchID on Sale/CashClose/Warehouse/InventoryItem/InventoryTransfer/Appointment, BranchID+UserID on DailyActivity).
- `parseApiFilters` and the `s_f`/`s_v`/`s_o` legacy fan-out helper are deleted; no `filterAllowlist` maps survive in `internal/platform/storage/postgres/`.
- Repositories migrated to typed `List` use parameterised `q.Where("col = ?", val)` exclusively — no string-concatenated raw SQL into `Order(...)` or `Where(...)` clauses; pseudo-keys (`_assigned_uid`, `_search`, `_start_date`, `_end_date`, `_patient_search`, `_attended_by`, `_pending_report`) are now typed fields with documented mapping comments.
- All `Updates(...)` calls use `db.Model(&e).Updates(map[string]any{...})`; no `db.Save()` regressions.
- `f.Clamp()` is consistently invoked at service entry (and defensively re-clamped in repository bodies — harmless idempotent double-clamp).
- Role-based scoping in `CashRegisterCloseRepository.List` correctly uses `domain.RoleAdmin` constant.
- 31 `ShouldBindQuery` call sites in `internal/transport/http/v1/`; 33 Filter structs in `internal/domain/`.

The two warnings below are missed-opportunity quality issues — not behavioral regressions. The three info items document acceptable pre-existing posture preserved by the migration.

## Findings

### WR-001  Hardcoded `"admin"` literal preserved in migrated handler
**Severity:** warning
**File:** /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/transport/http/v1/handler_t10.go
**Lines:** 549, 553
**Issue:** Phase 21-10 T4 (`1fd283b`) refactored `ListDailyActivityReports` to the typed-Filter pattern but kept the legacy literal `claims.Role != "admin"` and `claims.Role == "admin"` checks rather than swapping them to the canonical `domain.RoleAdmin` constant. CLAUDE.md mandates that role comparisons use `domain.Role*` constants, and this exact handler block was actively edited by the Phase 21 commit (the surrounding `userIDStr` rename happened on the same line as 553). Other `"admin"` literals in the file (lines 594, 610, 680, 696, 717, 737, 768, 810) are pre-existing and outside the migrated function — flag for follow-up but not Phase 21's regression.
**Recommendation:** Replace both literals with `domain.RoleAdmin`. Optional follow-up: sweep the remaining 8 occurrences in the same file in a small refactor commit.

### WR-002  `User.List` parameterises ILIKE pattern via raw `%` concatenation
**Severity:** warning
**File:** /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/platform/storage/postgres/user_repository.go
**Lines:** 119–127
**Issue:** `f.Identification` and `f.Search` build the LIKE pattern as `"%" + raw + "%"`. While the value is bound as a parameter (so this is **not** SQL-injectable), the user-supplied input is not escaped for LIKE meta-characters (`%`, `_`, `\`), meaning an attacker could craft `?search=%` to scan the whole table or `_` to perform broad fuzzy matches that bypass the intended index path. The same pattern is repeated in `patient_repository.go` (line 105) and `laboratory_repository.go` (search ILIKE) and was preserved verbatim from the legacy `parseApiFilters` flow — Phase 21 did not introduce it but did formalise it as the canonical pattern. Worth noting because the canonical Filter pattern is now what future filters will copy.
**Recommendation:** Add a small helper (e.g. `escapeLike(s string) string`) that escapes `%`, `_`, `\` before wrapping with `%...%` and use it in every Search/ILIKE entry point. Alternative: reject obviously-abusive single-character inputs at the service layer.

### IN-001  `clampPage` helper retained in `prescription/service.go`
**Severity:** info
**File:** /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/prescription/service.go
**Lines:** 93, 124
**Issue:** Phase 21-07 migrated `Service.List` to the typed `PrescriptionListFilter` pattern (uses `f.Clamp()` at line 110) but `Service.ListByPatient` (line 123) still calls the legacy `clampPage(page, perPage)` helper because that method has not been migrated to a Filter struct. The helper is therefore **not** dead code — but it is the only remaining reason the package keeps a private `clampPage`. Same situation in `internal/catalog/service.go:58` (catalog package was not in Phase 21 scope per the file list).
**Recommendation:** Optional follow-up phase: migrate `ListByPatient` (and the catalog list methods) to typed Filter structs so the duplicate `clampPage` helpers can be deleted. Not Phase 21 scope.

### IN-002  `SaleFilter.UserID` and `OrderFilter` accept client-supplied `user_id` without RBAC
**Severity:** info
**File:** /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/domain/sale.go (line 130) ; /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/transport/http/v1/handler_sale.go (lines 17–42)
**Lines:** sale.go:130 ; handler_sale.go:17–42
**Issue:** `SaleFilter.UserID *uint` is `form:"user_id"` (client-bindable). The handler does not enforce that non-admin callers be limited to `claims.UserID` — any authenticated user can pass `?user_id=99` to view another advisor's sales filter. This posture is identical to the pre-Phase 21 `map[string]any{"created_by": v}` flow (verified via git log of `handler_sale.go`), so it is **not a Phase 21 regression** — but the migration was an opportunity to apply the same RBAC-injection pattern that `CashRegisterCloseFilter.UserID` and `DailyActivityFilter.UserID` (`form:"-"`) now use.
**Recommendation:** Future hardening — convert `SaleFilter.UserID` (and the Quote/Order analogues if applicable) to `form:"-"` and have the handler set it from `claims.UserID` for non-admin roles. Track in roadmap, not a Phase 21 hotfix.

### IN-003  `LaboratoryRepository.List` and `OrderRepository.List` use `Select("table.*")`
**Severity:** info
**File:** /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go (lines 85, 217) ; /Users/wilderherrera/Desktop/convision/convision-api-golang/internal/platform/storage/postgres/order_repository.go (line 111)
**Lines:** laboratory_repository.go:85, 217 ; order_repository.go:111
**Issue:** DEVELOPMENT_GUIDE rule "Nunca `SELECT *` en listas: `Select("col1, col2, ...")` siempre" is bypassed by `Select("laboratories.*")` / `Select("laboratory_orders.*")` / `Select("orders.*")`. The qualified table-prefixed `*` is technically legal GORM but semantically equivalent to `SELECT *` for that table. Pre-existing, preserved by the Phase 21 migration. Other migrated repositories (cash_transfer, cash_register_close, user, product_category) correctly enumerate columns.
**Recommendation:** Future refactor — replace `Select("table.*")` with explicit column lists matching the user_repository.go `userCols` pattern. Not Phase 21 scope.

---

*Reviewed at quick depth: pattern-matching across 33 Filter structs, 31 ShouldBindQuery handlers, and ~30 migrated List repositories. No critical regressions found; the migration is structurally complete.*
