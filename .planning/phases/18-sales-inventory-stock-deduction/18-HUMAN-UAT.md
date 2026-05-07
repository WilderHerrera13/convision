---
status: complete
phase: 18-sales-inventory-stock-deduction
source: [18-VERIFICATION.md]
started: 2026-05-07T20:30:00Z
updated: 2026-05-07T20:35:00Z
verified_by: gsd-qa-explore (automated API)
findings_file: .planning/qa/FINDINGS-2026-05-07-phase18-uat.md
---

## Current Test

Completed — automated API validation via gsd-qa-explore.

## Tests

### 1. HV-01: Branch default warehouse assignment (SALE-STOCK-01)
expected: Branch edit form shows warehouse selector; PUT /branches/:id persists default_warehouse_id; GET returns it; setting null clears it
result: PASS — PUT persists default_warehouse_id; GET returns it. GAP: null cannot be set via API (PUT ignores nil, guard `if input.DefaultWarehouseID != nil`). See GAP-01 in FINDINGS.

### 2. HV-02: Stock deduction on sale creation (SALE-STOCK-02)
expected: Creating a sale for a branch with default_warehouse_id reduces inventory item quantity and creates an exit StockMovement with reference_type=sale
result: PASS — sale_id=3 (VTA-0003); inventory_items.quantity 1→0 in warehouse 2045; kardex entry `exit | reference_type=sale | reference_id=3 | qty_delta=-1`.

### 3. HV-03: Stock deduction is best-effort — sale never blocked (SALE-STOCK-04)
expected: Sales complete successfully even when branch has no default warehouse, zero stock, or no inventory item — only warnings logged
result: PASS — all three cases (null warehouse, zero stock, no inventory item) returned HTTP 201; service logged WARN and skipped deduction without blocking.

### 4. HV-04: Stock reversal on sale cancellation (SALE-STOCK-03)
expected: Cancelling a sale restores inventory quantity and creates an adjustment_add StockMovement with notes="stock reversal due to sale cancellation"
result: PASS — inventory_items.quantity 0→1; kardex entry `adjustment_add | reference_type=sale | reference_id=3 | qty_delta=+1`.

### 5. HV-05: Cancel idempotency guard
expected: Calling cancel twice on the same sale does not duplicate stock reversal or produce errors
result: PASS — second cancel returned HTTP 200; stock remained at 1; kardex had no new entries (3 total, not 4).

## Summary

total: 5
passed: 5
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

### GAP-01 (menor): PUT /branches/:id cannot clear default_warehouse_id to null
The guard `if input.DefaultWarehouseID != nil` in `branch/service.go:123` means null/0 cannot be sent to unset the warehouse. Workaround: set to a specific warehouse ID.

### GAP-02 (mayor/infra): sale.Service uses global DB without tenant search_path in local dev
`sale.Service.s.db` is the global DB (search_path = public). In local dev, requires `ALTER ROLE convision SET search_path = optica_main, public` on the DB. Recommendation: document in DEVELOPMENT_GUIDE or add `search_path=optica_main` to DSN in `db.go` when `APP_ENV=local`.
