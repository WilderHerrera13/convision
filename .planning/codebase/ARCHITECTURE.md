# Architecture
_Generated: 2026-04-13_

## Summary

Convision is a monorepo for an optics clinic management system. The backend is a Laravel 8 REST API following a strict layered pattern (Routes → Controllers → Form Requests → Services → Resources → Models), and the frontend is a React 18 TypeScript SPA that communicates exclusively through a typed service layer backed by React Query. Authentication is JWT-based, with role-based access control enforced at both the API route level and the React Router level.

---

## Backend Architecture Pattern

**Pattern:** Layered (Service-Oriented MVC)

The backend enforces a clear separation of concerns across five layers:

1. **Routes** (`convision-api/routes/api.php`) — All endpoints live under `/api/v1/`. Standard Laravel `apiResource()` routes are used for CRUD entities. Custom actions (status transitions, PDF generation, stats) are declared as explicit named routes.

2. **Controllers** (`convision-api/app/Http/Controllers/Api/V1/`) — Thin coordinators. They receive a validated request, delegate to a Service, and return an API Resource. They never contain validation logic or business logic. Example from `SalesController.php`:
   ```php
   public function store(StoreSaleRequest $request)
   {
       $validatedData = $request->validated();
       $sale = $this->saleService->createSale($validatedData, Auth::user());
       return new SaleResource($sale);
   }
   ```

3. **Form Requests** (`convision-api/app/Http/Requests/Api/V1/{Entity}/`) — All input validation lives here. One class per action per entity (e.g., `StoreSaleRequest`, `UpdateSaleRequest`).

4. **Services** (`convision-api/app/Services/`) — All business logic. One service per domain entity (e.g., `SaleService`, `PurchaseService`). Controllers inject services via constructor dependency injection.

5. **Resources** (`convision-api/app/Http/Resources/V1/{Category}/`) — All API response shaping. Every response goes through a Resource class; raw `response()->json()` is never used for entity data.

6. **Models** (`convision-api/app/Models/`) — Eloquent models with `$fillable`, `$casts`, relationships, and the `ApiFilterable` trait.

---

## Frontend Architecture Pattern

**Pattern:** Feature-Pages SPA with a typed service layer

The frontend enforces separation between data access and UI:

- **Pages** (`convision-front/src/pages/`) — Role-namespaced page components: `admin/`, `specialist/`, `receptionist/`. Pages consume React Query hooks and call service functions.
- **Services** (`convision-front/src/services/`) — All Axios calls live here. One file per backend domain (e.g., `saleService.ts`, `patientService.ts`). Components never call Axios directly.
- **Components** (`convision-front/src/components/`) — Shared UI components organized by domain (`appointments/`, `clinical/`, `inventory/`, `patients/`, `sales/`) plus `ui/` for shadcn-ui primitives.
- **Contexts** (`convision-front/src/contexts/AuthContext.tsx`) — Authentication state management via React Context.

---

## API Design

**Style:** REST  
**Versioning:** URL prefix `/api/v1/` (all endpoints)  
**Pagination:** All list endpoints paginate with `per_page` param (default 15, max 100)

**Filtering:** The `ApiFilterable` trait (`convision-api/app/Traits/ApiFilterable.php`) adds a `scopeApiFilter()` to any model that uses it. The frontend sends:
- `s_f` — JSON-encoded array of field names to filter on
- `s_v` — JSON-encoded array of corresponding values
- `s_o` — operator, either `and` (default) or `or`
- `sort` — `column,direction` pair (e.g., `created_at,desc`)
- `status` — direct status filter shortcut

Dot notation in field names (`relation.field`) triggers a `whereHas` on the named relation.

**PDF generation:** Two strategies exist:
1. Authenticated: `GET /api/v1/{entity}/{id}/pdf` — requires JWT
2. Token-based guest: `GET /api/v1/guest/{entity}/{id}/pdf?token=...` — no authentication required, uses `GuestPDFController` with HMAC-derived tokens

---

## Authentication & Authorization

**Mechanism:** JWT (tymon/jwt-auth `^1.0`)

**Flow:**
1. Client POST to `POST /api/v1/auth/login` → receives `access_token`, `token_type`, `expires_in`, and `user` object
2. Token is stored in `localStorage` as `access_token`
3. `convision-front/src/lib/axios.ts` injects the token as `Authorization: Bearer {token}` on every request
4. On 401 response, the axios interceptor automatically attempts a token refresh via `POST /api/v1/auth/refresh`. If refresh fails, localStorage is cleared and the user is redirected to `/login`

**Role Enforcement:**

- **Backend:** `RoleMiddleware` (`convision-api/app/Http/Middleware/RoleMiddleware.php`) is applied per route group with `role:admin|specialist|receptionist` syntax. Example: `Route::middleware(['auth:api', 'role:admin|specialist|receptionist'])`.
- **Frontend:** `ProtectedRoute` component in `convision-front/src/App.tsx` checks `user.role` against `allowedRoles` prop. Unauthorized users are redirected to `/unauthorized`. Role-based redirects on login navigate to `/admin/dashboard`, `/specialist/dashboard`, or `/receptionist/dashboard`.

**Roles:**
| Role | Backend Guard | Frontend Route |
|---|---|---|
| `admin` | `auth:api` + role check | `/admin/*` |
| `specialist` | `auth:api` + role check | `/specialist/*` |
| `receptionist` | `auth:api` + role check | `/receptionist/*` |

---

## Data Flow

**Authenticated Request (typical CRUD):**

1. User action triggers React component → calls a service function in `src/services/`
2. Service calls `api.get/post/put/delete(...)` on the axios instance from `src/lib/axios.ts`
3. Axios interceptor attaches `Authorization: Bearer {token}` header
4. Vite dev proxy forwards `/api` to `http://127.0.0.1:8000`
5. Laravel routes match to a Controller in `app/Http/Controllers/Api/V1/`
6. Controller delegates input to a Form Request for validation
7. Validated data passed to a Service method for business logic
8. Service returns an Eloquent model; Controller wraps it in an API Resource
9. JSON response returned; React Query caches it; component re-renders

**Filter Flow:**
1. Frontend calls `filterService.ts` to build `s_f` and `s_v` query params as JSON
2. API receives params; Controller calls `Model::apiFilter($request)->paginate($perPage)`
3. `ApiFilterable` trait parses JSON params and builds WHERE clauses (LIKE for text, exact for `_id` fields, `whereHas` for relations)

---

## Database Design Overview

**ORM:** Laravel Eloquent  
**Database:** MySQL (via Docker, `docker-compose.yml` in `convision-api/`)

**Core Domain Groups:**

| Group | Models |
|---|---|
| Clinic operations | `Patient`, `Appointment`, `Prescription`, `ClinicalHistory`, `ClinicalEvolution` |
| Sales & billing | `Sale`, `SaleItem`, `SalePayment`, `PartialPayment`, `SaleLensPriceAdjustment`, `Quote`, `QuoteItem`, `Order`, `OrderItem` |
| Inventory & products | `Product`, `ProductCategory`, `ProductLensAttributes`, `ProductFrameAttributes`, `ProductContactLensAttributes`, `InventoryItem`, `InventoryTransfer`, `Warehouse`, `WarehouseLocation` |
| Lens catalog | `Brand`, `LensType`, `LensClass`, `Material`, `Treatment`, `Photochromic`, `LensNote` |
| Purchasing | `Purchase`, `PurchaseItem`, `PurchasePayment`, `Supplier`, `Expense` |
| Laboratory | `Laboratory`, `LaboratoryOrder`, `LaboratoryOrderStatus` |
| Finance | `Payroll`, `CashTransfer`, `PaymentMethod` |
| Discounts | `DiscountRequest` |
| Location lookups | `Country`, `Department`, `City`, `District` |
| Patient lookups | `IdentificationType`, `HealthInsuranceProvider`, `AffiliationType`, `CoverageType`, `EducationLevel` |
| Users | `User` (with `role` field: admin / specialist / receptionist) |

**Key Relationships:**
- `Patient` → hasMany `Appointment`, `Sale`, `Order`, `ClinicalHistory`
- `Appointment` → hasOne `Prescription`; belongsTo `Patient`
- `Sale` → hasMany `SaleItem`, `SalePayment`, `PartialPayment`, `LaboratoryOrder`; belongsTo `Patient`, `Order`
- `Order` → hasMany `OrderItem`, `LaboratoryOrder`; hasOne `Sale`; belongsTo `Patient`, `Laboratory`
- `Purchase` → hasMany `PurchaseItem`, `PurchasePayment`; belongsTo `Supplier`
- `Product` → hasOne polymorphic attributes (`ProductLensAttributes`, etc.); related to `InventoryItem`

**Soft Deletes:** `Patient` uses `SoftDeletes` trait. Other models do not appear to use soft deletes uniformly.

**Document Numbers:** Auto-generated prefixed sequential numbers used for `Sale` (`SALE-`), `Order` (`ORD-YYYYMMDD-NNNN`), and similar entities via the `DocumentManagement` trait.

---

## Key Design Patterns

- **ApiFilterable Trait** — Generic server-side filtering for list endpoints. Apply to any model needing filterable GET index.
- **DocumentManagement Trait** — Used on `Sale` and likely `Order` for auto-generating document numbers.
- **API Resource Collections** — Every list response uses a `{Entity}Collection` class; every single-item response uses a `{Entity}Resource`.
- **PDF Token Pattern** — `GuestPDFController` generates HMAC tokens for unauthenticated PDF access, allowing share links without exposing JWTs.
- **Status Transition Endpoints** — State changes (cancel, approve, updateStatus) are explicit POST endpoints rather than PATCH on the status field.

---

## Error Handling

**Backend:**
- Validation errors: Form Requests return 422 with field-level messages automatically
- Authentication errors: 401 from `jwt.auth` middleware
- Authorization errors: 403 from `RoleMiddleware`
- Not found: `Model::findOrFail($id)` throws 404

**Frontend:**
- 401: axios interceptor attempts token refresh; on failure, redirects to `/login`
- 404: logged as warning, error passed through to component
- User-facing errors shown via `toast()` from shadcn-ui Toaster

---

## Gaps / Unknowns

- Laravel Passport (`laravel/passport`) is listed in `composer.json` alongside `tymon/jwt-auth` — it is unclear if Passport is actively used or is an unused dependency.
- Role-based access control is not enforced uniformly across all route groups (some route groups lack `role:` middleware, relying only on `auth:api`).
- Frontend has two axios instance files: `src/services/api.ts` and `src/lib/axios.ts`. Services inconsistently import from one or the other — the canonical axios instance is not well-established.
- No centralized React Query hook layer (e.g., `useQuery` wrappers per entity) — query logic is scattered across page components.
