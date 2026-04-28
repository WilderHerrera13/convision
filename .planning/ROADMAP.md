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
- [ ] **Phase 13: Unified Product-Inventory WMS Foundation** - Modelo unificado de productos (product_type + tracks_stock), Kardex (stock_movements), ajustes con aprobación, catálogo de lentes visible en inventario, unificación lens-as-product en backend
- [ ] **Phase 14: Multi-Branch / Clinic Support** - First-class branch (sede) support: branches table, user-branch assignments, X-Branch-ID middleware, scoped appointments/sales/cash/inventory, global users/patients/catalog, branch-selector UI after login

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

### Phase 13: Unified Product-Inventory WMS Foundation
**Goal**: Construir el núcleo del WMS para ópticas: modelo unificado de productos (lens/frame/contact_lens/liquid/accessory), Kardex transaccional (stock_movements), flujo de ajustes con aprobación, y catálogo de lentes visible en el módulo de inventario. Los lentes importados son Productos con product_type='lens' y tracks_stock=false. Las monturas y líquidos son Productos con tracks_stock=true y tienen InventoryItems físicos.
**Depends on**: Phase 12 (lab order flow)
**Requirements**: [INV-01, INV-02, INV-03, INV-04, INV-05, INV-06]
**Success Criteria** (what must be TRUE):
  1. `products` table has `product_type` and `tracks_stock` columns; all products imported as lenses are visible in inventory as catalog items
  2. Every stock operation (create item, transfer complete, adjustment approved) writes a `stock_movements` record with before/after quantities
  3. Manual inventory adjustments go through `pending_approval → approved` flow before modifying stock
  4. Frontend inventory module shows lens catalog (no stock) and physical stock items (tracks_stock=true) in separate sections
  5. The lens bulk import creates `Product` + `ProductLensAttributes` records (not `Lens` records) with `product_type='lens'` and `tracks_stock=false`
**Plans**: 5 plans

Plans:
- [ ] 13-01: DB Migrations — product_type, tracks_stock, stock_movements Kardex, inventory_adjustments
- [ ] 13-02: Domain Layer — Product type classification, StockMovement, InventoryAdjustment domain models
- [ ] 13-03: Backend — Lens-as-Product unification (bulk import → products, product_type filtering, catalog endpoint)
- [ ] 13-04: Backend — Kardex service (movement recording on all inventory ops), AdjustmentService with approval flow, new endpoints
- [ ] 13-05: Frontend — Inventory module: lens catalog tab + physical stock tab, adjustment UI, movement history

### Phase 14: Multi-Branch / Clinic Support
**Goal**: Add first-class branch (sede/clínica) support so every clinic-scoped operation (appointments, inventory, cash-close, daily-activity) is isolated per branch, while users, patients, and the master product catalog remain global.
**Depends on**: Phase 13 (WMS inventory models already use `clinic_id` that will be renamed to `branch_id`)
**Requirements**: [BRANCH-01, BRANCH-02, BRANCH-03, BRANCH-04, BRANCH-05, BRANCH-06, BRANCH-07, BRANCH-08, BRANCH-09, BRANCH-10]
**Success Criteria** (what must be TRUE):
  1. `branches` table and `user_branches` junction exist with FK integrity; admin CRUD endpoints work
  2. Login response includes `branches[]` for the authenticated user; branch-selector UI appears when >1 branch
  3. `X-Branch-ID` middleware rejects requests from users without access to that branch (403)
  4. Appointments, sales, cash-closes, daily-activity-reports created in a session are stored with the active `branch_id`; list endpoints return only records for that branch
  5. `clinic_id` columns in inventory tables renamed to `branch_id` with real FK to `branches`
  6. Global entities (patients, users, products, lenses, discounts) are unaffected and visible from any branch
**Plans**: 5 plans

Plans:
- [x] 14-01: DB — `branches`, `user_branches`, add/rename `branch_id` on scoped tables
- [x] 14-02: Backend Domain & Service — Branch entity, BranchRepository, UserBranch service, middleware
- [ ] 14-03: Backend Auth & Endpoints — login enrichment, branch-validation middleware, branch CRUD routes
- [ ] 14-04: Backend Scoped Queries — wire `branch_id` filter into appointment, sale, cash-close, inventory handlers
- [ ] 14-05: Frontend — branch context (React Context + localStorage), axios interceptor, branch-selector screen

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Baseline & Auth Safety | 0/3 | Not started | - |
| 2. Clinical Workflow Stability | 0/3 | Not started | - |
| 3. Commercial Flow Reliability | 0/3 | Not started | - |
| 4. Finance & Orders Consistency | 0/4 | Not started | - |
| 5. Quality Hardening & Verification | 0/3 | Not started | - |
| 6. Cash Register Close Module | 4/4 | Complete | 2026-04-14 |
| 13. Unified Product-Inventory WMS Foundation | 0/5 | Not started | - |
| 14. Multi-Branch / Clinic Support | 2/5 | In Progress|  |
