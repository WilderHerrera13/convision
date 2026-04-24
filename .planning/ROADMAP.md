# Roadmap: Convision

## Overview

This roadmap stabilizes and hardens the existing brownfield clinic system before feature expansion, focusing first on platform safety, then business-critical flows, and finally verification/quality closure for sustainable iteration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): planned milestone work
- Decimal phases (2.1, 2.2): urgent insertions if needed (marked with INSERTED)

- [ ] **Phase 1: Platform Baseline & Auth Safety** - Align auth/session behavior and guardrails across API and frontend
- [ ] **Phase 2: Clinical Workflow Stability** - Confirm patient/appointment/prescription workflows are consistent and non-regressive
- [ ] **Phase 3: Commercial Flow Reliability** - Secure quote/sale/PDF paths and discount-related business rules
- [ ] **Phase 4: Finance & Orders Consistency** - Stabilize expenses/payroll/purchases/service-lab orders and related API contracts
- [ ] **Phase 5: Quality Hardening & Verification** - Close gaps in conventions, regressions, and verification evidence
- [x] **Phase 6: Cash Register Close Module — Cierre de Caja diario por asesor** - Cierre de caja, reporte de gestión diaria, aprobación admin (2026-04-14)

## Phase Details

### Phase 1: Platform Baseline & Auth Safety
**Goal**: Ensure authentication, authorization, and session/token behaviors are reliable and consistent across the stack.
**Depends on**: Nothing (first phase)
**Requirements**: [PLAT-01, PLAT-02, PLAT-03]
**Success Criteria** (what must be TRUE):
  1. Role-based access is enforced consistently in API and routed UI views
  2. Token/session behavior is deterministic across current frontend API client paths
  3. No auth regressions are introduced in critical entry workflows
**Plans**: 3 plans

Plans:
- [ ] 01-01: Audit and normalize auth/session handling paths
- [ ] 01-02: Validate role protections and endpoint guards
- [ ] 01-03: Add verification evidence for platform safety checks

### Phase 2: Clinical Workflow Stability
**Goal**: Preserve and stabilize day-to-day clinical operations already in use.
**Depends on**: Phase 1
**Requirements**: [CLIN-01, CLIN-02, CLIN-03]
**Success Criteria** (what must be TRUE):
  1. Patient CRUD/search behaves correctly through UI and API
  2. Appointment and specialist flows complete without contract mismatches
  3. Prescription/history flows remain operational without regressions
**Plans**: 3 plans

Plans:
- [ ] 02-01: Validate and patch patient/appointment workflow defects
- [ ] 02-02: Stabilize specialist and history-related endpoints/screens
- [ ] 02-03: Verify critical clinical paths with artifacts

### Phase 3: Commercial Flow Reliability
**Goal**: Ensure quote-to-sale lifecycle and PDF outputs are reliable.
**Depends on**: Phase 2
**Requirements**: [COMM-01, COMM-02, COMM-03]
**Success Criteria** (what must be TRUE):
  1. Quote and sale flows execute end-to-end with expected business rules
  2. Discount-sensitive sale paths produce correct outcomes
  3. Authenticated and guest PDF generation paths remain functional
**Plans**: 3 plans

Plans:
- [ ] 03-01: Stabilize quote and sale API/UI contract points
- [ ] 03-02: Validate discount and pricing-sensitive workflows
- [ ] 03-03: Verify PDF generation and tokenized guest access

### Phase 4: Finance & Orders Consistency
**Goal**: Unify and stabilize current finance/procurement/service-order modules.
**Depends on**: Phase 3
**Requirements**: [FIN-01, FIN-02, FIN-03]
**Success Criteria** (what must be TRUE):
  1. Expense/payroll modules read/write data correctly
  2. Purchase/supplier/payment flows remain coherent across backend/frontend
  3. Service and laboratory order flows support create/update/detail safely
**Plans**: 4 plans

Plans:
- [ ] 04-01: Stabilize expenses/payroll module behavior
- [ ] 04-02: Stabilize procurement and supplier payment flows
- [ ] 04-03: Stabilize service order flows
- [ ] 04-04: Stabilize laboratory order flows

### Phase 5: Quality Hardening & Verification
**Goal**: Raise confidence and maintainability with explicit quality gates.
**Depends on**: Phase 4
**Requirements**: [QUAL-01, QUAL-02, QUAL-03]
**Success Criteria** (what must be TRUE):
  1. Modified backend/frontend code follows established conventions
  2. Critical regression-prone paths have reproducible verification evidence
  3. Phase closure artifacts support safe continuation for next milestone
**Plans**: 3 plans

Plans:
- [ ] 05-01: Conventions and architectural consistency hardening
- [ ] 05-02: Regression and coverage-oriented verification sweep
- [ ] 05-03: Final milestone audit and execution readiness report

### Phase 6: Cash Register Close Module — Cierre de Caja diario por asesor
**Goal**: Desarrollar el módulo completo de cierre de caja diario para asesores: control por medios de pago, conteo físico de efectivo por denominaciones, reporte de gestión diaria y revisión/aprobación administrativa.
**Depends on**: Phase 5 (or can run after Phase 3 if commercial flows are stable)
**Requirements**: [CASH-01, CASH-02, CASH-03, CASH-04, CASH-05]
**Success Criteria** (what must be TRUE):
  1. Asesor puede crear, rellenar y enviar un cierre de caja con 10 medios de pago y conteo por denominaciones
  2. El sistema calcula diferencias (sobra/falta) automáticamente por medio de pago y en total
  3. Admin puede ver todos los cierres, filtrarlos y aprobarlos
  4. Asesor puede registrar reporte diario de gestión por jornada (mañana/tarde)
**Plans**: 4 plans

Plans:
- [x] 06-01: Backend — Cierre de Caja (migrations, models, service, controller, resources, routes)
- [x] 06-02: Backend — Reporte Diario de Gestión del Asesor (migration, model, service, controller)
- [x] 06-03: Frontend — Vistas del Asesor (formulario cierre, conteo efectivo, reporte diario, historiales)
- [x] 06-04: Frontend — Vistas del Admin (lista cierres, detalle + aprobación, lista reportes)

### Phase 7: Figma — Bodega & Inventory Module Design
**Goal**: Design the complete Warehouse & Inventory module in Figma (page "bodega"), covering all views required by the Laravel backend: warehouses CRUD, warehouse locations CRUD, inventory items management, total stock view, product inventory summary, and inventory transfers workflow — all using Admin role palette and system components.
**Depends on**: Phase 6
**Requirements**: [BODEGA-01, BODEGA-02, BODEGA-03, BODEGA-04, BODEGA-05, BODEGA-06]
**Success Criteria** (what must be TRUE):
  1. Figma page "bodega" exists with all warehouse module screens designed
  2. All screens use Admin role palette (#3A71F7), system components (Table/Frame 78:89, Sidebar 83:2), and Lucide icons
  3. Bodegas: list view, create view, detail/edit view with locations tab
  4. Ubicaciones: list within warehouse, create view, detail view with inventory items
  5. Inventario: items list with filters, create item form, total stock view, product inventory summary
  6. Transferencias: list view, create transfer form with pending/completed/cancelled states
**Plans**: 4 plans

Plans:
- [x] 07-01: Figma — Bodegas: Lista, Nueva Bodega, Detalle Bodega
- [ ] 07-02: Figma — Ubicaciones: Lista en Bodega, Nueva Ubicación, Detalle Ubicación
- [ ] 07-03: Figma — Inventario: Lista de Ítems, Nuevo Ítem, Stock Total, Resumen por Producto
- [ ] 07-04: Figma — Transferencias: Lista, Nueva Transferencia (estados pending/completed/cancelled)

### Phase 8: Go Inventory Backend Audit & Hardening
**Goal**: Audit, fix, and validate all Go backend code for the warehouse and inventory module so that inventory math (quantities, transfers, stock totals) is provably correct, business rules match the Laravel reference, and all endpoints are coherent end-to-end.
**Depends on**: Phase 6 (Phase 7 is independent Figma work — this runs in parallel or after)
**Requirements**: [INV-01, INV-02, INV-03, INV-04, INV-05]
**Success Criteria** (what must be TRUE):
  1. Transfer completion atomically moves stock from source location to destination location
  2. Transfer creation validates: source ≠ destination, source has sufficient stock, quantity ≥ 1
  3. Transfer status transitions are enforced (pending→completed, pending→cancelled only; completed_at set on completion)
  4. DeleteLocation is protected: returns validation error if location has active inventory items
  5. AdjustStock operates on a specific InventoryItem by ID (not by product_id heuristic)
  6. All inventory quantity operations use DB transactions with row-level locking to prevent race conditions
  7. All critical inventory paths have integration-test verification evidence (Go test files or curl scripts)
**Plans**: 4 plans

Plans:
- [x] 08-01: Audit — full inventory backend gap analysis vs Laravel reference (domain, service, repos, handlers, routes)
- [x] 08-02: Fix — transfer business logic (atomic stock movement, state machine, validation guards)
- [x] 08-03: Fix — inventory item & warehouse data-integrity guards (location delete protection, AdjustStock, status enums)
- [x] 08-04: Validate — integration test suite for all critical inventory math paths

### Phase 9: Go Backend Test Suite
**Goal**: Write comprehensive unit and integration tests for all Go backend services and HTTP handlers so that every business rule, validation, and endpoint is verifiable in CI without relying on manual testing.
**Depends on**: Phase 8 (or can run independently — tests exercise existing code)
**Requirements**: [TEST-01, TEST-02, TEST-03, TEST-04, TEST-05]
**Success Criteria** (what must be TRUE):
  1. Every service package under `internal/` has a `service_test.go` with unit tests covering happy path and key error branches using mocked Repository interfaces
  2. Every HTTP handler group has integration tests (httptest) covering 2xx success, 4xx validation errors, and 403 role guards
  3. `make test` passes with ≥ 70% coverage across service packages
  4. Tests use no real database (unit) or a dedicated test DB via `testcontainers-go` (integration)
  5. All test helpers, fixtures, and mock factories live in `internal/testutil/` and are reusable across packages
**Plans**: 5 plans

Plans:
- [ ] 09-01: Test infrastructure — testutil package, mock factories, httptest helpers, testcontainers setup
- [ ] 09-02: Unit tests — auth, patient, appointment, prescription, clinical workflow services
- [ ] 09-03: Unit tests — product, sale, quote, discount, commercial flow services
- [ ] 09-04: Unit tests — inventory, laboratory, cash-close, finance services
- [ ] 09-05: Integration tests — HTTP handler suites for all feature groups (role guards + contract validation)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Baseline & Auth Safety | 0/3 | Not started | - |
| 2. Clinical Workflow Stability | 0/3 | Not started | - |
| 3. Commercial Flow Reliability | 0/3 | Not started | - |
| 4. Finance & Orders Consistency | 0/4 | Not started | - |
| 5. Quality Hardening & Verification | 0/3 | Not started | - |
| 6. Cash Register Close Module | 4/4 | Complete | 2026-04-14 |
| 7. Figma — Bodega & Inventory Module Design | 0/4 | Not started | - |
| 8. Go Inventory Backend Audit & Hardening | 0/4 | Not started | - |
| 9. Go Backend Test Suite | 0/5 | Not started | - |
