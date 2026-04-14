---
phase: "06"
plan: "01"
subsystem: backend
tags: [cash-register, cierre-de-caja, laravel, api, migrations, models, service, controller, policy]
dependency_graph:
  requires: []
  provides: [cash-register-close-api]
  affects: [routes/api.php, AuthServiceProvider]
tech_stack:
  added: []
  patterns: [ApiFilterable, ApiResources, FormRequests, PolicyAuthorization, ServiceLayer, DBTransactions]
key_files:
  created:
    - convision-api/database/migrations/2026_04_14_000001_create_cash_register_closes_table.php
    - convision-api/database/migrations/2026_04_14_000002_create_cash_register_close_payments_table.php
    - convision-api/database/migrations/2026_04_14_000003_create_cash_count_denominations_table.php
    - convision-api/app/Models/CashRegisterClose.php
    - convision-api/app/Models/CashRegisterClosePayment.php
    - convision-api/app/Models/CashCountDenomination.php
    - convision-api/app/Services/CashRegisterCloseService.php
    - convision-api/app/Http/Requests/Api/V1/CashRegisterClose/StoreCashRegisterCloseRequest.php
    - convision-api/app/Http/Requests/Api/V1/CashRegisterClose/UpdateCashRegisterCloseRequest.php
    - convision-api/app/Http/Requests/Api/V1/CashRegisterClose/ApproveCashRegisterCloseRequest.php
    - convision-api/app/Http/Resources/V1/CashRegisterClose/CashRegisterCloseResource.php
    - convision-api/app/Http/Resources/V1/CashRegisterClose/CashRegisterCloseCollection.php
    - convision-api/app/Http/Resources/V1/CashRegisterClose/CashRegisterClosePaymentResource.php
    - convision-api/app/Http/Resources/V1/CashRegisterClose/CashCountDenominationResource.php
    - convision-api/app/Http/Controllers/Api/V1/CashRegisterCloseController.php
    - convision-api/app/Policies/CashRegisterClosePolicy.php
  modified:
    - convision-api/routes/api.php
    - convision-api/app/Providers/AuthServiceProvider.php
decisions:
  - "Used $user->role string comparison (not hasRole()) since User model has no HasRoles trait — project uses simple role column"
  - "toArray($request) without type hint on parameter — Laravel 8 parent signature compatibility"
  - "CashRegisterCloseResource uses whenLoaded() for relations to avoid N+1 in list vs detail contexts"
metrics:
  duration: ~20min
  completed_date: "2026-04-14"
---

# Phase 06 Plan 01: Backend — Cierre de Caja (DB + Models + API) Summary

**One-liner:** Full Laravel backend for daily cash register close — 3-table schema, service with transactional create/update/submit/approve, policy-gated REST API with role-scoped index.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create database migrations | ac6eee1 | 3 migration files |
| 2 | Create Eloquent models | 295791e | CashRegisterClose, CashRegisterClosePayment, CashCountDenomination |
| 3 | Create CashRegisterCloseService | 1f3e2f0 | CashRegisterCloseService.php |
| 4 | Create Form Requests | 3683637 | Store, Update, Approve request classes |
| 5 | Create API Resources | 7177e5e | 4 resource classes |
| 6 | Create Controller, Policy, routes | 49426d2 | Controller, Policy, api.php, AuthServiceProvider |

## What Was Built

### Database Schema

Three tables created and migrated:

- **cash_register_closes**: Main record per asesor per day (`user_id`, `close_date` with unique constraint, `status` enum draft/submitted/approved, totals, approval metadata)
- **cash_register_close_payments**: One row per payment method (`payment_method_name`, registered/counted/difference amounts, cascade delete)
- **cash_count_denominations**: Physical cash denomination counts (denomination value, quantity, subtotal, cascade delete)

### Models

- **CashRegisterClose**: `ApiFilterable` trait, `STATUS_*` and `PAYMENT_METHODS` and `DENOMINATIONS` constants, full relationships (user, approvedBy, payments, denominations)
- **CashRegisterClosePayment** and **CashCountDenomination**: Simple models with proper casts and inverse relationships

### CashRegisterCloseService

Five methods all wrapped in DB transactions where needed:
- `createWithDetails`: Creates close + payments + denominations, then recalculates totals
- `recalculateTotals`: Sums registered/counted from payments, updates difference
- `updateWithDetails`: Delete-recreate sync for payments and denominations (draft only)
- `submit`: draft → submitted transition
- `approve`: submitted → approved with admin metadata (approved_by, approved_at, admin_notes)

### Form Requests

- **StoreCashRegisterCloseRequest**: Validates close_date, payment_methods array with 10 valid method names, optional denominations with 11 valid denomination values
- **UpdateCashRegisterCloseRequest**: Same rules with `sometimes` for optional partial updates
- **ApproveCashRegisterCloseRequest**: Optional admin_notes max 1000 chars

### API Resources

- **CashRegisterCloseResource**: Full response with conditional `whenLoaded()` relations for payments and denominations
- **CashRegisterClosePaymentResource** and **CashCountDenominationResource**: Flat simple resources
- **CashRegisterCloseCollection**: Standard ResourceCollection extending

### Controller + Policy + Routes

**CashRegisterClosePolicy:**
- `view`: admin role OR record owner
- `update`: draft status AND record owner

**CashRegisterCloseController** (7 endpoints):
- `index`: Admin sees all, receptionist/specialist sees only their own (role-scoped query)
- `show`: policy `view` check
- `store`: creates via service
- `update`: policy `update` check + service updateWithDetails
- `destroy`: policy `update` check (only owner can delete draft)
- `submit`: policy `update` check + service submit
- `approve`: admin-only (route middleware `role:admin`)

**Routes added** (`routes/api.php`):
```
GET|HEAD  /api/v1/cash-register-closes
POST      /api/v1/cash-register-closes
GET|HEAD  /api/v1/cash-register-closes/{id}
PUT|PATCH /api/v1/cash-register-closes/{id}
DELETE    /api/v1/cash-register-closes/{id}
POST      /api/v1/cash-register-closes/{id}/submit
POST      /api/v1/cash-register-closes/{id}/approve  [role:admin]
```

## Verification Results

```bash
# Migration pretend — all 3 tables appeared without SQL errors ✓
php artisan migrate --pretend | grep -E 'cash_register|cash_count'

# Migration run — all 3 migrations completed ✓
php artisan migrate

# Routes verified — all 7 endpoints listed ✓
php artisan route:list | grep cash-register

# Full API test — POST created close with total_difference: 2000.00 ✓
curl POST /api/v1/cash-register-closes → {"data": {"id":1,"status":"draft","total_difference":"2000.00",...}}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed toArray() signature incompatibility with Laravel 8**
- **Found during:** Task 5 (API Resources verification)
- **Issue:** Used `public function toArray(Request $request): array` which is incompatible with the parent class `JsonResource::toArray($request)` in Laravel 8 (PHP 8.x stricter covariance rules)
- **Fix:** Changed all resource `toArray` methods to `public function toArray($request): array` (no type hint on parameter), matching every other resource in the codebase
- **Files modified:** All 4 resource files in `app/Http/Resources/V1/CashRegisterClose/`
- **Commit:** 7177e5e

**2. [Rule 1 - Bug] Fixed policy using non-existent hasRole() method**
- **Found during:** Task 6 (Policy creation)
- **Issue:** Plan specified `$user->hasRole('admin')` but the User model has no `HasRoles` trait — it uses a simple `role` string column
- **Fix:** Changed to `$user->role === 'admin'` consistent with RoleMiddleware and all other role checks in the codebase
- **Files modified:** `app/Policies/CashRegisterClosePolicy.php`
- **Commit:** 49426d2

## Known Stubs

None — all data is wired from the database. No placeholder values.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: broken-access-control | CashRegisterCloseController@approve | The approve endpoint relies on route middleware `role:admin` only. If the role middleware is bypassed or misconfigured, any authenticated user could approve a close. The policy does not add a secondary check on approve. |

## Self-Check: PASSED

All 16 files created:
- ✓ 3 migration files exist
- ✓ 3 model files exist
- ✓ 1 service file exists
- ✓ 3 form request files exist
- ✓ 4 resource files exist
- ✓ 1 controller file exists
- ✓ 1 policy file exists

All 6 commits exist:
- ✓ ac6eee1 — migrations
- ✓ 295791e — models
- ✓ 1f3e2f0 — service
- ✓ 3683637 — form requests
- ✓ 7177e5e — API resources
- ✓ 49426d2 — controller, policy, routes
