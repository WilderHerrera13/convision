---
status: partial
phase: 18-sales-inventory-stock-deduction
source: [18-VERIFICATION.md]
started: 2026-05-07T20:30:00Z
updated: 2026-05-07T20:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. HV-01: Branch default warehouse assignment (SALE-STOCK-01)
expected: Branch edit form shows warehouse selector; PUT /branches/:id persists default_warehouse_id; GET returns it; setting null clears it
result: [pending]

### 2. HV-02: Stock deduction on sale creation (SALE-STOCK-02)
expected: Creating a sale for a branch with default_warehouse_id reduces inventory item quantity and creates an exit StockMovement with reference_type=sale
result: [pending]

### 3. HV-03: Stock deduction is best-effort — sale never blocked (SALE-STOCK-04)
expected: Sales complete successfully even when branch has no default warehouse, zero stock, or no inventory item — only warnings logged
result: [pending]

### 4. HV-04: Stock reversal on sale cancellation (SALE-STOCK-03)
expected: Cancelling a sale restores inventory quantity and creates an adjustment_add StockMovement with notes="stock reversal due to sale cancellation"
result: [pending]

### 5. HV-05: Cancel idempotency guard
expected: Calling cancel twice on the same sale does not duplicate stock reversal or produce errors
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
