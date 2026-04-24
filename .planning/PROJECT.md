# Convision

## What This Is

Convision is a brownfield monorepo for optical clinic operations, split between a Laravel API (`convision-api`) and a React SPA (`convision-front`).
It supports end-to-end daily workflows for admin, specialist, and receptionist roles: patients, appointments, prescriptions, quotes, sales, purchases, and finance-related operations.

## Core Value

Clinic staff can complete core operational and sales workflows reliably in one integrated system, without breaking role-based boundaries.

## Requirements

### Validated

- ✓ Role-based authentication and access (admin/specialist/receptionist)
- ✓ Patient and appointment core flows
- ✓ Quote and sale generation with PDF outputs
- ✓ Laravel API + React SPA integration over `/api/v1`

### Active

- [ ] Stabilize and complete new finance/operations modules (expenses, payroll, service/lab orders, supplier payments)
- [ ] Improve frontend consistency and maintainability (table/date/form patterns)
- [x] Strengthen API correctness and cross-module consistency in brownfield changes — Validated in Phase 08: Go inventory backend audit & hardening (state machine, atomic stock, LensID→ProductID, guards)
- [x] Improve verification quality (tests + phase verification artifacts) — Completed in Phase 09: Go backend test suite with 18 test packages (service unit tests + handler integration tests, 0 FAIL)

### Out of Scope

- Native mobile apps — current scope is web-only clinic operation
- Real-time chat/collaboration — not part of current operational requirements
- Multi-tenant SaaS packaging — system is currently single clinic deployment focused

## Context

- Backend: Laravel 8 + JWT auth + API resources + service layer
- Frontend: React 18 + TypeScript + React Query + Tailwind + mixed UI libs
- Data: MySQL 8 (Docker for local), synchronous job processing (`QUEUE_CONNECTION=sync`)
- Existing brownfield code has active in-flight changes across API and frontend modules
- `.planning/codebase/*` already contains architecture, stack, integrations, conventions, testing and concerns analysis

## Constraints

- **Architecture**: Maintain Laravel service/resource/request patterns — controllers stay thin
- **Frontend rules**: Spanish UI text, standardized table/date/form components
- **Compatibility**: Must preserve existing role behavior and current API contracts unless explicitly migrated
- **Operational safety**: Prioritize non-breaking incremental changes in brownfield modules

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD in brownfield mode with codebase map first | Existing repo already has significant functionality and active changes | ✓ Good |
| Keep monorepo planning at root `.planning` | Enables shared roadmap while allowing API/front coordination | ✓ Good |
| Start with stabilization-oriented phases before new feature expansion | Current risk is consistency/regression in active modules | — Pending |

---
*Last updated: 2026-04-24 — Phase 09 complete (Go backend test suite: 18 packages, 0 FAIL)*
