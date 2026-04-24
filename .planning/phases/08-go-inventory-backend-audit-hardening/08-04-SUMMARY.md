---
plan: 08-04
status: complete
---

## Summary

Created the curl-based integration verification script and a human-readable VERIFICATION.md checklist for Phase 8: Inventory Backend Hardening. The script exercises the full inventory lifecycle end-to-end — warehouse/location CRUD, item creation with guards, AdjustStockByItemID, transfer validation guards, atomic stock movement via CompleteTransfer, state machine enforcement, unified GetTotalStock response shape, and location/warehouse delete guards. The VERIFICATION.md provides grep-verifiable checks for all must_haves from Plans 08-02 and 08-03, plus SQL queries for DB-level confirmation and concurrency test instructions.

## Key Files

### Created
- path: convision-api-golang/scripts/verify-inventory.sh
  purpose: Executable bash integration script with 25+ assert_status calls and a login step; prints PASS/FAIL per test and a final summary line
- path: .planning/phases/08-go-inventory-backend-audit-hardening/VERIFICATION.md
  purpose: 252-line human-readable checklist with grep checks, build check, integration script instructions, DB verification queries, concurrency test instructions, and sign-off criteria

## Decisions

- The script includes an auto-login section (step 0) that fires when TOKEN is not set in the environment. This makes the script usable standalone without pre-obtaining a JWT.
- The script uses `set -euo pipefail` but wraps the product-dependent section in an explicit `if [ -z "$PROD_ID" ]` guard to emit a clear SKIP message rather than crashing when no products are seeded.
- VERIFICATION.md covers both Plans 08-02 and 08-03 must_haves as grep commands — each is independently runnable from the repo root without any running server.
- The concurrency test section uses a parallel bash loop (not ab/k6) to avoid requiring additional tools, while still demonstrating the pattern for race condition validation.

## Self-Check: PASSED
