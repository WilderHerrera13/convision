# CONCERNS
_Generated: 2026-04-13_

## Summary

Convision has several critical security gaps: a large set of sensitive API routes (orders, sales, quotes, clinical histories) are completely unauthenticated in `routes/api.php`, and CORS is fully open (`allowed_origins: ['*']`). The frontend has pervasive component size violations — 102 files exceed the 200-line CLAUDE.md rule, with the largest at 2,077 lines. Testing coverage is minimal: only 5 feature test files exist, none covering sales, purchases, financial operations, or inventory.

---

## Security

**Critical: Unauthenticated routes for sensitive financial and medical data**
- Issue: The entire orders, sales, quotes, partial-payments, sale-lens-price-adjustments, clinical-histories, and clinical-evolutions route groups are registered with NO auth middleware in `routes/api.php` (lines 163–270).
- Files: `convision-api/routes/api.php` lines 163–270
- Impact: Any unauthenticated HTTP request can read, create, update, or delete sales, orders, clinical histories, and patient medical records. This is a HIPAA-equivalent data breach risk.
- Fix: Wrap all unprotected route groups in `Route::middleware('auth:api')->group(...)`.

**Critical: CORS wildcard allows any origin**
- Issue: `allowed_origins => ['*']` with `supports_credentials => true` in `config/cors.php`. The combination of wildcard origin with credentials enabled is a security misconfiguration that browsers reject on modern versions, but may work in development tools and expose attack surface.
- Files: `convision-api/config/cors.php` line 22
- Fix: Set `allowed_origins` to the specific frontend domain(s) in production.

**JWT stored in localStorage (XSS risk)**
- Issue: `access_token`, `token_type`, and `auth_user` are stored in `localStorage`, making them accessible to any JavaScript running on the page — including injected scripts.
- Files: `convision-front/src/services/auth.ts` lines 25-27, `convision-front/src/lib/axios.ts` lines 20, 52-54
- Current mitigation: None beyond HTTPS
- Recommendation: Consider `httpOnly` cookies or at minimum document the XSS exposure risk.

**No role-based middleware on admin-only endpoints**
- Issue: Endpoints for payrolls, expenses, purchases, service orders, cash transfers, and user management are guarded only by `auth:api` (any authenticated role can access them). The `role:admin` middleware exists but is not applied to these sensitive financial endpoints.
- Files: `convision-api/routes/api.php` lines 296–334
- Impact: A receptionist or specialist account can read, create, or delete payroll and expense records.
- Fix: Add `role:admin` middleware to payroll, expense, purchase, service-order, and cash-transfer route groups.

**`/api/v1/auth/me` is outside auth middleware group**
- Issue: `/auth/me` at line 68 is listed inside the `prefix('auth')` group but outside any `middleware('jwt.auth')` wrapper. The `AuthController` constructor applies `jwt.auth` middleware except `['login', 'refresh']`, which does cover `me`. However, this is implicit and not visible from the route file — a future developer removing the controller middleware could expose it.
- Files: `convision-api/routes/api.php` lines 63-70, `convision-api/app/Http/Controllers/Api/V1/AuthController.php` line 26
- Fix: Move auth guard to the route definition level.

**`convision-front/.env` is committed to git**
- Issue: `convision-front/.env` is tracked in version control (confirmed via `git ls-files`). While current contents are only localhost URLs, this pattern means future secrets (API keys, tokens) could be accidentally committed.
- Files: `convision-front/.env`
- Fix: Add `.env` to `.gitignore` and remove it from git tracking.

---

## Performance

**Debug logging on every API filter request**
- Issue: `ApiFilterable` trait emits 4–6 `Log::debug()` calls per request, including full SQL with bound parameters on every paginated list endpoint. In production with `LOG_LEVEL=debug` this produces enormous log volume and I/O overhead.
- Files: `convision-api/app/Traits/ApiFilterable.php` lines 17-114
- Fix: Remove all `Log::debug()` calls from this trait or wrap them in `if (config('app.debug'))`.

**Missing database indexes on frequently-queried foreign keys**
- Issue: The sales, orders, appointments, and clinical-histories tables use `patient_id`, `created_by`, `appointment_id`, `order_id` for filtering and joining, but migration files define no explicit `->index()` calls on these columns (Laravel's `foreignId()->constrained()` creates FK constraints but not separate indexes on some engines).
- Files: `convision-api/database/migrations/2025_05_19_004814_create_sales_table.php`, `convision-api/database/migrations/2025_05_19_004808_create_orders_table.php`
- Impact: Table scans on joins as data grows.
- Fix: Add `$table->index('patient_id')`, `$table->index('created_by')` explicitly on high-traffic tables.

**545 `console.log`/`console.error` statements in production frontend code**
- Issue: 545 console output calls exist across the frontend codebase, including debug logs in the shared `DataTable` component which fires 3-4 logs per rendered cell.
- Files: `convision-front/src/components/ui/data-table/DataTable.tsx` lines 247-272 (cell-level debug logs), `convision-front/src/components/ui/SearchableSelect.tsx` lines 41, 46
- Impact: Significant console noise in production; `DataTable` logs can generate thousands of lines for a single page render.
- Fix: Remove debug `console.log` calls; keep `console.error` only for actual error paths.

**Large frontend pages cause expensive re-renders**
- Issue: `Patients.tsx` (admin, 2,077 lines), `NewSale.tsx` (2,057 lines), `SalesCatalog.tsx` (1,954 lines), and `Appointments.tsx` (1,926 lines) contain all state, effects, handlers, and render in single components. Re-renders triggered by any state change re-execute the entire component tree.
- Files: `convision-front/src/pages/admin/Patients.tsx`, `convision-front/src/pages/receptionist/NewSale.tsx`, `convision-front/src/pages/receptionist/SalesCatalog.tsx`, `convision-front/src/pages/receptionist/Appointments.tsx`
- Fix: Extract subsections into memoized sub-components and custom hooks.

---

## Technical Debt

**102 frontend files exceed the 200-line CLAUDE.md rule**
- Issue: The project rule states components must stay under 200 lines, but 102 files violate this. The top offenders are all in the pages and components directories.
- Worst violations (lines):
  - `convision-front/src/pages/admin/Patients.tsx` — 2,077
  - `convision-front/src/pages/receptionist/NewSale.tsx` — 2,057
  - `convision-front/src/pages/receptionist/SalesCatalog.tsx` — 1,954
  - `convision-front/src/pages/receptionist/Appointments.tsx` — 1,926
  - `convision-front/src/components/PrescriptionForm.tsx` — 1,165
  - `convision-front/src/components/LensRecommendation.tsx` — 1,147
  - `convision-front/src/pages/receptionist/Patients.tsx` — 1,096
  - `convision-front/src/pages/receptionist/AppointmentDetail.tsx` — 1,058
- Fix: Extract form sections, table panels, and modal content into dedicated sub-components and custom hooks.

**Stub pages with mock data wired into production routing**
- Issue: Three pages are in the router (`App.tsx`) and served to users, but contain hardcoded mock data and `// TODO` stubs instead of real API calls:
  - `convision-front/src/pages/admin/PayrollCalculate.tsx` — mock payroll data, line 28: `TODO: Implement payroll calculation API call`
  - `convision-front/src/pages/admin/LaboratoryStatus.tsx` — mock lab orders, line 44: `TODO: Implement API call to fetch laboratory orders`
  - `convision-front/src/pages/admin/NewCashTransfer.tsx` — line 31: `TODO: Implement cash transfer creation API call`
- Files: `convision-front/src/App.tsx` lines 73, 76, 77, 357, 369, 373
- Impact: Users accessing these pages see fake data silently.

**Dead/backup files committed to source control**
- Issue: Three obsolete files are present in the repository:
  - `convision-front/src/pages/receptionist/SalesCatalog2.tsx` (815 lines, not referenced anywhere)
  - `convision-front/src/pages/receptionist/SalesCatalog.tsx.backup` (818 lines)
  - `convision-front/src/pages/receptionist/SalesCatalog.tsx.bak` (1,304 lines)
  - `convision-front/src/pages/receptionist/QuotesExample.tsx` (not imported or routed)
- Fix: Delete these files and remove from git.

**Validation in controller instead of Form Request (PayrollController)**
- Issue: `PayrollController::calculatePayroll()` uses inline `$request->validate([...])` (line 71) instead of a dedicated Form Request class, violating the established pattern.
- Files: `convision-api/app/Http/Controllers/Api/V1/PayrollController.php` line 71
- Fix: Extract to `StorePayrollCalculationRequest`.

**`response()->json()` used instead of API Resources in multiple controllers**
- Issue: Several controllers return raw `response()->json()` for stats and error responses, bypassing the API Resource layer. This means responses have inconsistent shape.
- Files:
  - `convision-api/app/Http/Controllers/Api/V1/PayrollController.php` lines 66, 86
  - `convision-api/app/Http/Controllers/Api/V1/ServiceOrderController.php` line 82
  - `convision-api/app/Http/Controllers/Api/V1/CashTransferController.php` line 88
  - `convision-api/app/Http/Controllers/Api/V1/AppointmentController.php` lines 277, 301, 337, 343, 359, 370, 384
- Fix: Create dedicated stats Resource classes or consistent error response helpers.

**Duplicate middleware classes**
- Issue: `AdminMiddleware.php` and `AdminRoleMiddleware.php` are near-identical files (diff shows only the class name differs). Similarly, `AdminOrSpecialistMiddleware.php` and `AdminOrSpecialistRoleMiddleware.php` likely duplicate.
- Files: `convision-api/app/Http/Middleware/AdminMiddleware.php`, `convision-api/app/Http/Middleware/AdminRoleMiddleware.php`
- Fix: Remove duplicates and standardize on one class per role check.

**Disabled role middleware on LensTypeController**
- Issue: `LensTypeController` constructor has a commented-out role middleware: `// $this->middleware('admin.or.specialist.role')->except(['index', 'show']); // TODO: uncomment and implement role middleware`
- Files: `convision-api/app/Http/Controllers/Api/V1/LensTypeController.php` line 27
- Impact: All authenticated users (including receptionists) can create/update/delete lens types.

**Legacy migration service still in codebase**
- Issue: `LensToProductMigrationService` (264 lines) and the `MigrateLensesToProducts` Artisan command are one-time data migration tools that remain in the codebase after the migration is complete.
- Files: `convision-api/app/Services/LensToProductMigrationService.php`, `convision-api/app/Console/Commands/MigrateLensesToProducts.php`
- Fix: Remove both files once the migration is confirmed complete.

**Admin and Receptionist duplicate `SaleDetail` and `Patients` pages**
- Issue: `admin/SaleDetail.tsx` (600 lines) and `receptionist/SaleDetail.tsx` (582 lines) share the same core logic with only minor differences (568 lines differ, mostly imports). The same pattern exists for Patients pages (2,077 vs 1,096 lines).
- Files: `convision-front/src/pages/admin/SaleDetail.tsx`, `convision-front/src/pages/receptionist/SaleDetail.tsx`, `convision-front/src/pages/admin/Patients.tsx`, `convision-front/src/pages/receptionist/Patients.tsx`
- Fix: Extract shared logic into a base component or hook, with role-specific UI differences passed as props.

**Widespread `any` type usage in frontend**
- Issue: 50+ uses of TypeScript `any` type across page components undermine type safety. Examples visible in `PayrollCalculate.tsx` (`calculations.employees.map((employee: any) => ...)`) and `LaboratoryStatus.tsx`.
- Files: `convision-front/src/pages/admin/PayrollCalculate.tsx` line 250, `convision-front/src/pages/admin/LaboratoryStatus.tsx` line 173

---

## Dependency Risks

**Laravel 8 is end-of-life**
- Issue: The project uses Laravel v8.83.29 (confirmed in `composer.lock`). Laravel 8's security support ended January 2023.
- Files: `convision-api/composer.json` (`laravel/framework: ^8.75`), `convision-api/composer.lock`
- Impact: No security patches for core framework vulnerabilities.
- Migration path: Upgrade to Laravel 10 or 11. Laravel 8→10 requires PHP 8.1+ and addresses breaking changes in middleware, routing, and Eloquent.

**`tymon/jwt-auth ^1.0` — inactive package**
- Issue: `tymon/jwt-auth` v1.x has not had a major release since 2019 and the package has limited maintenance activity. JWT implementation for Laravel 8+ is unofficially maintained.
- Files: `convision-api/composer.json`
- Risk: Potential unpatched JWT security vulnerabilities.
- Alternative: `lcobucci/jwt` directly, or migrate to Laravel Sanctum for SPA authentication.

**Both Passport and Sanctum installed alongside JWT**
- Issue: `laravel/passport ^10.0` and `laravel/sanctum ^2.11` are both in `composer.json` alongside `tymon/jwt-auth`. Only JWT is actively used (`config/auth.php` sets `driver: jwt`). Passport and Sanctum add unused surface area.
- Files: `convision-api/composer.json`
- Fix: Remove unused `laravel/passport` and `laravel/sanctum` unless planned for future use.

**`fruitcake/laravel-cors ^2.0` — deprecated**
- Issue: `fruitcake/laravel-cors` was merged into Laravel core in Laravel 7+. The package is a no-op wrapper and is no longer needed.
- Files: `convision-api/composer.json`
- Fix: Remove the package dependency.

**`maatwebsite/excel` pinned to exact version `3.1.48`**
- Issue: The Excel package is pinned to an exact version rather than a constraint, meaning security updates require manual intervention.
- Files: `convision-api/composer.json`

---

## Scalability

**No HTTP rate limiting on any endpoint**
- Issue: The `routes/api.php` file has no `throttle` middleware applied anywhere. The login endpoint, file uploads, and all data-write endpoints are fully rate-unlimited.
- Files: `convision-api/routes/api.php`
- Impact: Brute-force attacks on `/auth/login`, denial-of-service via bulk writes, and excessive PDF generation are all possible.
- Fix: Apply `throttle:60,1` (or `throttle:5,1` for login) as a minimum.

**`ApiFilterable` accepts arbitrary field names without a whitelist**
- Issue: The `scopeApiFilter` method in `ApiFilterable` applies `LIKE` queries against any field name passed in `s_f`. There is no field whitelist, so a caller can pass any column name (including sensitive ones) and get data back.
- Files: `convision-api/app/Traits/ApiFilterable.php` lines 33-95
- Impact: Potential field enumeration and data extraction on models that implement this trait.
- Fix: Add a `$filterable = ['field1', 'field2']` array on models and check against it in `scopeApiFilter`.

**`apiPaginate` method does not cap `per_page`**
- Issue: The `ApiFilterable::apiPaginate()` method (line 119-123) accepts `per_page` directly without any cap. This method could allow unbounded result sets if called.
- Files: `convision-api/app/Traits/ApiFilterable.php` lines 119-123

**Single-server architecture, no caching layer**
- Issue: The API runs on a single PHP process (artisan serve / Laravel development server) with `CACHE_DRIVER=file` and `QUEUE_CONNECTION=sync`. All background jobs run synchronously. PDF generation blocks the request. No Redis or cache layer is configured for production.
- Files: `convision-api/.env.example` lines 8-10
- Impact: PDF generation (DomPDF), bulk product imports, and payroll calculations block HTTP threads.
- Fix: Configure queue driver (Redis/database), move PDF generation to queued jobs.

---

## Gaps / Unknowns

- **No frontend tests at all**: Zero `.test.tsx` or `.spec.tsx` files exist in `convision-front/`. There is no Vitest or Jest configuration. The entire React codebase is untested.
- **Backend test coverage is sparse**: Only 5 feature test files exist covering `Auth`, `User`, `Patient`, `Appointment`, `ClinicalHistory`, and `ClinicalEvolution`. There are no tests for `Sales`, `Orders`, `Purchases`, `Payroll`, `Inventory`, `Discounts`, or `ServiceOrders` — the highest-risk financial flows.
- **No error monitoring service**: No Sentry, Bugsnag, or equivalent is configured. Errors are only logged to file.
- **Email configuration not validated**: `MAIL_*` settings in `.env.example` are blank. It is unknown whether transactional emails (password reset, notifications) actually work in production.
- **Image upload storage scope**: `AppointmentController` saves lens annotation images to local `Storage::disk('local')`. It is unknown whether production storage uses shared persistent volumes or local-only disk (which would fail on multi-instance deployments).
- **`SalesCatalog2.tsx` purpose**: The file (`convision-front/src/pages/receptionist/SalesCatalog2.tsx`, 815 lines) exists but is not imported in `App.tsx` or anywhere else. It is unclear whether this is a work-in-progress replacement for `SalesCatalog.tsx` or abandoned code.
- **`LaboratoryStatus.tsx` vs `LaboratoryOrders.tsx` overlap**: Both pages appear to track laboratory order status. Their intended separation is unclear from static analysis.

---

*Concerns audit: 2026-04-13*
