# Requirements: Convision

**Defined:** 2026-04-13
**Core Value:** Clinic staff can complete core operational and sales workflows reliably in one integrated system

## v1 Requirements

### Platform & Access

- [ ] **PLAT-01**: Role-based authentication remains stable for admin, specialist, and receptionist
- [ ] **PLAT-02**: Protected routes and API guards enforce role permissions correctly
- [ ] **PLAT-03**: Session/token refresh behavior is consistent across frontend API clients

### Clinical Operations

- [ ] **CLIN-01**: Patient CRUD and search workflows remain reliable
- [ ] **CLIN-02**: Appointment and specialist workflows remain reliable
- [ ] **CLIN-03**: Prescription/history-related workflows remain non-regressive

### Commercial Flow

- [ ] **COMM-01**: Quote creation/edit/listing works end-to-end
- [ ] **COMM-02**: Sale creation flow (including discounts rules) works end-to-end
- [ ] **COMM-03**: PDF generation and guest-token PDF access remain functional

### Finance & Procurement

- [ ] **FIN-01**: Expenses and payroll modules persist and retrieve data correctly
- [ ] **FIN-02**: Purchase, supplier, and supplier payment flows stay consistent
- [ ] **FIN-03**: Service orders and laboratory orders support create/update/detail flows without contract drift

### Quality & Maintainability

- [ ] **QUAL-01**: New/edited backend endpoints follow request/service/resource conventions
- [ ] **QUAL-02**: New/edited frontend screens use shared table/date/form patterns
- [ ] **QUAL-03**: Critical paths have executable verification evidence (tests or phase verification)

### Cash Register Close (Cierre de Caja)

- [ ] **CASH-01**: Asesores pueden registrar el cierre de caja diario por medios de pago (Efectivo, Voucher, Bancolombia, Daviplata, Nequi, Addi, Sistecredito, Anticipo, Bono, Pago Sistecredito) con valor registrado y valor contado
- [ ] **CASH-02**: El sistema calcula automáticamente diferencias (sobrante/faltante) por medio de pago y concilia el total del día
- [ ] **CASH-03**: Conteo físico de efectivo por denominaciones (billetes y monedas colombianas) con suma automática
- [ ] **CASH-04**: Asesores registran reporte diario de gestión (preguntas, cotizaciones, consultas, órdenes, actividad en redes sociales) por jornada (mañana/tarde)
- [ ] **CASH-05**: Admin puede revisar, gestionar y aprobar cierres de caja de todos los asesores con vista de historial y resumen

### Inventory & Product Management (WMS Foundation)

- [ ] **INV-01**: Todos los productos (lentes, monturas, lentillas, líquidos, accesorios) comparten el mismo modelo `products`. Cada producto tiene `product_type` (enum: `lens`, `frame`, `contact_lens`, `liquid`, `accessory`) y `tracks_stock` (bool) que determina si gestiona inventario físico.
- [ ] **INV-02**: Lentes (`product_type = 'lens'`) tienen `tracks_stock = false` — son fabricados bajo pedido. El catálogo de lentes importados es visible en el módulo de inventario como catálogo, no como stock físico. La importación masiva de lentes crea `Product` + `ProductLensAttributes`, no registros en la tabla separada `lenses`.
- [ ] **INV-03**: Productos con `tracks_stock = true` (monturas, líquidos, lentillas) tienen `InventoryItem` por bodega/ubicación. No se crean `InventoryItem` para productos con `tracks_stock = false`.
- [ ] **INV-04**: Tabla `stock_movements` (Kardex) registra cada transacción de inventario: `movement_type` (entry, exit, reserve, release, adjustment), `reference_type` (sale, purchase, transfer, adjustment), `reference_id`, `product_id`, `warehouse_id`, `warehouse_location_id`, `quantity_before`, `quantity_delta`, `quantity_after`, `unit_cost`, `performed_by`, `notes`, `created_at`. Toda operación sobre `inventory_items` genera automáticamente un `stock_movement`.
- [ ] **INV-05**: Ajustes manuales de inventario (`inventory_adjustments`) tienen flujo de aprobación: creados en estado `pending_approval`, revisados por admin (`approved` / `rejected`). Motivos predefinidos: `damage`, `expiry`, `theft`, `count_correction`, `return`, `warranty`, `supplier_defect`. Solo ajustes aprobados modifican el stock físico y generan un `stock_movement`.
- [ ] **INV-06**: El módulo de inventario separa claramente: (a) "Catálogo de Lentes" — productos tipo lens con sus atributos, sin stock (b) "Stock Físico" — inventory items de productos con tracks_stock=true, agrupados por producto/bodega.

### Multi-Branch / Clinic Support

- [ ] **BRANCH-01**: A `branches` table exists with `id`, `name`, `address`, `city`, `phone`, `email`, `is_active`, `created_at`, `updated_at`. Admin can create, edit, and deactivate branches.
- [ ] **BRANCH-02**: A `user_branches` junction table links users to one or more branches (`user_id`, `branch_id`, `is_primary`). Admins can assign/unassign branches to users.
- [ ] **BRANCH-03**: The login flow returns the list of branches the authenticated user can access. If the user has exactly one branch, the branch context is selected automatically. If they have more than one, the frontend shows a branch-selector screen before entering the app.
- [ ] **BRANCH-04**: After branch selection, every API request carries an `X-Branch-ID` header. A backend middleware validates that the `branch_id` exists and that the current user has access to it, then attaches the resolved `branch_id` to the Gin context for downstream handlers.
- [ ] **BRANCH-05**: `appointments` and `sales` tables gain a `branch_id NOT NULL` column with FK to `branches`. All existing rows are migrated (dev: wipe allowed). Queries for those entities always filter by the branch from context.
- [ ] **BRANCH-06**: Cash-register close records (`cash_closes`, `daily_activity_reports`) gain a `branch_id NOT NULL` column. All queries filter by branch from context.
- [ ] **BRANCH-07**: Inventory entities (`warehouses`, `warehouse_locations`, `inventory_items`, and the Phase-13 `stock_movements`/`inventory_adjustments`) already have `clinic_id`. That column is renamed to `branch_id` and a real FK to `branches` is added, replacing the phantom reference.
- [ ] **BRANCH-08**: Entities that remain global (users, patients, products, lenses, discounts, laboratories, suppliers, service-order types) do NOT get a `branch_id`; they are visible from any branch context.
- [ ] **BRANCH-09**: Frontend stores selected branch (`branch_id`, `branch_name`) in `localStorage` and React Context. Every axios request includes the `X-Branch-ID` header automatically via the shared interceptor. On logout the stored branch is cleared.
- [ ] **BRANCH-10**: Admin role bypasses the branch-selector (or is shown a global view); the middleware still accepts `X-Branch-ID` but also allows admin requests without it for admin-only endpoints.

## v2 Requirements

### Product Evolution

- **EVOL-01**: Introduce observability/error tracking for production incidents
- **EVOL-02**: Reduce dual-axios inconsistency and unify frontend API layer
- **EVOL-03**: Revisit queue/background architecture for heavy async flows

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app clients | Not required for current clinic operational scope |
| Multi-tenant architecture | Current deployment model is single-organization |
| Real-time collaboration/chat | Not a current operational priority |

## Traceability (Multi-Branch)

| Requirement | Phase | Status |
|-------------|-------|--------|
| BRANCH-01 | Phase 14 | Done |
| BRANCH-02 | Phase 14 | Done |
| BRANCH-03 | Phase 14 | Done |
| BRANCH-04 | Phase 14 | Done |
| BRANCH-05 | Phase 14 | Done |
| BRANCH-06 | Phase 14 | Done |
| BRANCH-07 | Phase 14 | Done |
| BRANCH-08 | Phase 14 | Done |
| BRANCH-09 | Phase 14 | Done |
| BRANCH-10 | Phase 14 | Done |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INV-01 | Phase 13 | Pending |
| INV-02 | Phase 13 | Pending |
| INV-03 | Phase 13 | Pending |
| INV-04 | Phase 13 | Pending |
| INV-05 | Phase 13 | Pending |
| INV-06 | Phase 13 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| CLIN-01 | Phase 2 | Pending |
| CLIN-02 | Phase 2 | Pending |
| CLIN-03 | Phase 2 | Pending |
| COMM-01 | Phase 3 | Pending |
| COMM-02 | Phase 3 | Pending |
| COMM-03 | Phase 3 | Pending |
| FIN-01 | Phase 4 | Pending |
| FIN-02 | Phase 4 | Pending |
| FIN-03 | Phase 4 | Pending |
| QUAL-01 | Phase 5 | Pending |
| QUAL-02 | Phase 5 | Pending |
| QUAL-03 | Phase 5 | Pending |
| CASH-01 | Phase 6 | Pending |
| CASH-02 | Phase 6 | Pending |
| CASH-03 | Phase 6 | Pending |
| CASH-04 | Phase 6 | Pending |
| CASH-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after brownfield bootstrap*
