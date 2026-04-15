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

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
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
