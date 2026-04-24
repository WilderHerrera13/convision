---
status: human_needed
phase: 08-go-inventory-backend-audit-hardening
verified_at: 2026-04-24
must_haves_checked: 19
must_haves_passed: 19
---

## Phase 08 Verification

### Goal

Audit the Go inventory backend against the Laravel reference module, identify all gaps, and harden the implementation by fixing all CRITICAL and HIGH severity bugs — primarily the absent stock-movement logic in CompleteTransfer, transfer validation guards, state machine enforcement, DeleteLocation inventory guard, and the ambiguous/un-atomic AdjustStock method. Rename LensID to ProductID throughout and align all API response shapes.

### Must-Haves Check

#### From 08-02-PLAN.md

| # | Must-Have | Evidence | Status |
|---|-----------|----------|--------|
| 1 | `go build ./...` exits 0 after all tasks | `cd convision-api-golang && go build ./...` passes | ✓ |
| 2 | `inventory.Service` struct has field `db *gorm.DB` | `service.go:54` — `db *gorm.DB` inside Service struct | ✓ |
| 3 | `NewService` first parameter is `db *gorm.DB` | `service.go:64` — `db *gorm.DB,` is first param in signature | ✓ |
| 4 | `CompleteTransfer` service method exists and uses `s.db.Transaction` | `service.go:646` — method exists; `service.go:648` — `s.db.Transaction` call confirmed | ✓ |
| 5 | `CancelTransfer` service method exists | `service.go:731` — `func (s *Service) CancelTransfer` defined | ✓ |
| 6 | `CreateTransfer` returns `ErrValidation` when `SourceLocationID == DestinationLocationID` | `service.go:607` — equality check returning `ErrValidation` | ✓ |
| 7 | `CreateTransfer` returns `ErrValidation` when source has insufficient stock | `service.go:626` — "stock insuficiente en la ubicación de origen" message | ✓ |
| 8 | `UpdateTransfer` routes to `CompleteTransfer` when next status is `completed` | `service.go:793` — `return s.CompleteTransfer(id)` inside UpdateTransfer | ✓ |
| 9 | `POST /api/v1/inventory-transfers/:id/complete` route exists in routes.go | `routes.go:352` — `inventoryTransfers.POST("/:id/complete", jwtauth.RequireRole(...), h.CompleteInventoryTransfer)` | ✓ |
| 10 | `POST /api/v1/inventory-transfers/:id/cancel` route exists in routes.go | `routes.go:353` — `inventoryTransfers.POST("/:id/cancel", jwtauth.RequireRole(...), h.CancelInventoryTransfer)` | ✓ |
| 11 | `InventoryTransferRepository.Update` only writes `notes`, `status`, `completed_at` | `inventory_transfer_repository.go:53-59` — map contains exactly those 3 keys, no immutable fields | ✓ |

#### From 08-03-PLAN.md

| # | Must-Have | Evidence | Status |
|---|-----------|----------|--------|
| 12 | `ProductID uint` on `InventoryTransfer` struct (not LensID) | `domain/inventory.go:77` — `ProductID uint` with `gorm:"column:product_id;not null"` | ✓ |
| 13 | No `LensID` reference in `domain/inventory.go` | Grep confirms absent — no LensID anywhere in the file | ✓ |
| 14 | `func (s *Service) AdjustStockByItemID` exists | `service.go:816` — method defined with SELECT FOR UPDATE inside transaction | ✓ |
| 15 | `func validateItemStatus` exists | `service.go:24` — function defined, checks against `validItemStatuses` map | ✓ |
| 16 | `Quantity *int` on `ItemUpdateInput` | `service.go:361` — `Quantity *int` confirmed on ItemUpdateInput struct | ✓ |
| 17 | `warehouse_location_id` filter present in `ListInventoryItems` handler | `handler_inventory.go:192-194` — filter parsed from query param and added to filters map | ✓ |
| 18 | `total_units` in `GetTotalStock` response | `handler_inventory.go:288` — `"total_units": totalUnits` present in gin.H response | ✓ |

#### From 08-04-PLAN.md

| # | Must-Have | Evidence | Status |
|---|-----------|----------|--------|
| 19 | `convision-api-golang/scripts/verify-inventory.sh` exists and is executable | File exists as `-rwxr-xr-x`; 25 `assert_status` calls; 17 PASS/FAIL references; `bash -n` exits 0 | ✓ |

### Requirement Traceability

Note: INV-01 through INV-05 are phase-internal requirement IDs referenced in the PLAN files. They are not registered in the global REQUIREMENTS.md. The closest global requirements they serve are QUAL-01 (backend endpoint conventions) and QUAL-03 (critical paths have executable verification evidence).

| Requirement ID | Description | Status |
|----------------|-------------|--------|
| INV-01 | Atomic stock movement: CompleteTransfer must decrement source and increment destination inside a DB transaction with SELECT FOR UPDATE row locking | Satisfied — `service.go:646-728` uses `s.db.Transaction` + `clause.Locking{Strength:"UPDATE"}` on transfer row, source item, and destination item |
| INV-02 | Transfer validation guards: source location ID must differ from destination, quantity must be ≥ 1, source must have sufficient stock at creation time | Satisfied — `service.go:607-628` checks all three guards; binding tag `min=1` on Quantity at `service.go:567` |
| INV-03 | Transfer state machine: only pending→completed and pending→cancelled are valid transitions; completed_at is stamped on completion; terminal states cannot be further mutated | Satisfied — `allowedTransitions` map at `service.go:759-766`; `completed_at` stamped in CompleteTransfer at `service.go:712-716`; terminal guard at `service.go:774-778` |
| INV-04 | Inventory item data integrity: DeleteLocation guards against active inventory; AdjustStock operates on item ID with row lock in a transaction; item status enum is validated; ItemUpdateInput.Quantity is a pointer to avoid zero-value overwrites | Satisfied — `service.go:312-327` (DeleteLocation guard); `service.go:816-846` (AdjustStockByItemID with SELECT FOR UPDATE); `service.go:24-33` (validateItemStatus); `service.go:361` (Quantity *int) |
| INV-05 | API parity with Laravel reference: warehouse_location_id filter in ListInventoryItems; GetTotalStock returns unified {data, total_units} shape; LensID renamed to ProductID across domain, service, repository, and DB migration | Satisfied — `handler_inventory.go:192`; `handler_inventory.go:265-290`; `domain/inventory.go:77`; migration `000016_rename_lens_id_to_product_id.up.sql` exists |

### Gaps (post-phase code review findings not in must_haves)

The following gaps were identified in 08-REVIEW.md after implementation. They are not failures of the phase must_haves, but they require follow-up work:

1. **CR-001 (critical)**: `CreateTransfer` stock pre-check runs outside a transaction — TOCTOU race allows queuing more pending transfers than stock allows. CompleteTransfer re-validates under lock so actual over-transfer is prevented at completion, but the creation path is not concurrency-safe. A follow-up phase should wrap CreateTransfer in a transaction with SELECT FOR UPDATE.

2. **CR-002 (critical)**: All four inventory entities (`Warehouse`, `WarehouseLocation`, `InventoryItem`, `InventoryTransfer`) lack `clinic_id`. The mandatory multi-clinic data isolation rule from DATABASE_GUIDE is not enforced. Any authenticated user can access inventory data across all clinics. Requires a dedicated hardening phase.

3. **CR-003 (warning)**: Migration `000016` UP uses `RENAME COLUMN` with no `IF EXISTS` guard — non-idempotent, will fail on a second run.

4. **CR-004 (warning)**: Migration `000016` DOWN references the `lenses` table which may not exist in all environments — down migration is not reliably reversible.

5. **CR-005 (warning)**: Orphaned index `idx_inventory_transfers_lens_id` is left behind after the column rename — migration 016 does not drop it.

6. **CR-007 (warning)**: `DeleteTransfer` allows hard-deleting completed transfers, destroying the audit trail of a committed stock movement.

### Human Verification Items

The following behaviors require a running backend and cannot be confirmed by static analysis:

1. **End-to-end stock movement**: Run `BASE_URL=http://localhost:8001 bash convision-api-golang/scripts/verify-inventory.sh` (auto-login included). Confirm all tests pass and especially that location A quantity decreases and location B quantity increases by the transfer amount after CompleteTransfer.

2. **State machine enforcement**: Verify that calling `POST /api/v1/inventory-transfers/:id/complete` on an already-completed transfer returns HTTP 422 with the message "solo se pueden completar transferencias en estado pendiente".

3. **AdjustStockByItemID negative guard**: Verify that a delta producing negative stock returns HTTP 422 with "el ajuste resultaría en stock negativo".

4. **Location delete guard**: Verify that `DELETE /api/v1/warehouse-locations/:id` for a location with active inventory returns HTTP 422 with "no se puede eliminar una ubicación que tiene inventario activo".

5. **DB migration 000016**: Verify the migration runs cleanly (`migrate up`) and that `inventory_transfers.product_id` is NOT NULL with a FK to `products(id)` using `ON DELETE RESTRICT`.

6. **Concurrency test**: Send 10 simultaneous `POST /api/v1/inventory-transfers/:id/complete` requests for the same transfer ID. Confirm exactly one succeeds (HTTP 200) and the rest return HTTP 422. Confirm stock is moved exactly once by querying `inventory_items` directly after the test.
