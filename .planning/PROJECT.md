# Convision

## What This Is

Convision is a brownfield monorepo for optical clinic operations, split between a Go API (`convision-api-golang`), a Laravel API (`convision-api` — legacy), and a React SPA (`convision-front`).
It supports end-to-end daily workflows for admin, specialist, and receptionist roles: patients, appointments, prescriptions, quotes, sales, purchases, and finance-related operations.

## Core Value

Clinic staff can complete core operational and sales workflows reliably in one integrated system, without breaking role-based boundaries.

## Requirements

### Validated

- ✓ Role-based authentication and access (admin/specialist/receptionist)
- ✓ Patient and appointment core flows
- ✓ Quote and sale generation with PDF outputs
- ✓ Go API + React SPA integration over `/api/v1`
- ✓ Cash register close module (cierre de caja) — payments, denominations, daily activity reports (Phase 6)
- ✓ Multi-branch / clinic support — branch-scoped operations, X-Branch-ID middleware, branch selector UI (Phase 14)

### Active

- [ ] Stabilize and complete new finance/operations modules (expenses, payroll, service/lab orders, supplier payments)
- [ ] Improve frontend consistency and maintainability (table/date/form patterns)
- [ ] Strengthen API correctness and cross-module consistency in brownfield changes
- [ ] Improve verification quality (tests + phase verification artifacts)

### Out of Scope

- Native mobile apps — current scope is web-only clinic operation
- Real-time chat/collaboration — not part of current operational requirements
- Multi-tenant SaaS packaging — system is currently single clinic deployment focused

## Context

- Backend (active): Go 1.22 + Gin + GORM + PostgreSQL 15+ (port 8001)
- Backend (legacy): Laravel 8 + JWT auth + MySQL 8 (port 8000)
- Frontend: React 18 + TypeScript + React Query + Tailwind + shadcn/ui (port 4300)
- Data: PostgreSQL 15+ (active), MySQL 8 (legacy)
- Existing brownfield code has active in-flight changes across API and frontend modules
- `.planning/codebase/*` already contains architecture, stack, integrations, conventions, testing and concerns analysis

## Constraints

- **Architecture**: Maintain Go 3-layer pattern (domain/service/transport) and Laravel service/resource/request patterns
- **Frontend rules**: Spanish UI text, standardized EntityTable/DatePicker/SearchableCombobox components
- **Compatibility**: Must preserve existing role behavior and current API contracts unless explicitly migrated
- **Operational safety**: Prioritize non-breaking incremental changes in brownfield modules

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD in brownfield mode with codebase map first | Existing repo already has significant functionality and active changes | ✓ Good |
| Keep monorepo planning at root `.planning` | Enables shared roadmap while allowing API/front coordination | ✓ Good |
| Start with stabilization-oriented phases before new feature expansion | Current risk is consistency/regression in active modules | ✓ Validated |
| Migrate backend from Laravel to Go incrementally | Go backend is the active target; Laravel is legacy | — In progress |
| Branch-scoped operations with X-Branch-ID header | All local data filtered by branch_id from context; admin bypass | ✓ Implemented (Phase 14) |

---

*Last updated: 2026-04-28 after Phase 14 completion*
