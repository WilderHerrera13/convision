# Codebase Structure
_Generated: 2026-04-13_

## Summary

Convision is a monorepo with two independent sub-projects under the root directory. The backend organizes code by technical layer (controllers, services, models, resources). The frontend organizes pages by role and groups components by domain feature. Both sub-projects are self-contained with their own dependency manifests.

---

## Top-Level Directory Layout

```
convision/                          # Monorepo root
├── convision-api/                  # Laravel 8 REST API (backend)
├── convision-front/                # React 18 + TypeScript SPA (frontend)
├── docker/                         # Docker support files
├── CLAUDE.md                       # Project guidance for Claude Code
└── .planning/                      # GSD planning documents
    └── codebase/                   # Codebase analysis documents
```

---

## Backend Directory Layout (`convision-api/`)

```
convision-api/
├── app/
│   ├── Console/Commands/           # Artisan commands
│   ├── Exceptions/                 # Exception handlers
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   ├── V1/             # All active API controllers (44 files)
│   │   │   │   └── Documentation/  # OpenAPI/Swagger schema files
│   │   │   └── Concerns/           # Controller traits
│   │   ├── Middleware/             # Auth, role, CORS middleware
│   │   └── Requests/Api/V1/        # Form Request validation classes (one dir per entity)
│   ├── Http/Resources/V1/          # API response shaping (one dir per entity)
│   ├── Models/                     # Eloquent models (55 files)
│   ├── Services/                   # Business logic (38 files)
│   └── Traits/                     # Shared traits (ApiFilterable, DocumentManagement)
├── database/
│   ├── factories/                  # Model factories for testing/seeding
│   ├── migrations/                 # Database schema migrations
│   └── seeders/                    # Database seeders (DatabaseSeeder.php)
├── routes/
│   └── api.php                     # All API route definitions
├── storage/
│   └── app/public/                 # User-uploaded files (profile images, annotations)
├── tests/
│   ├── Feature/                    # Feature tests
│   └── Unit/                       # Unit tests
├── docker-compose.yml              # MySQL + PHPMyAdmin
└── composer.json                   # PHP dependencies
```

---

## Frontend Directory Layout (`convision-front/`)

```
convision-front/
├── src/
│   ├── App.tsx                     # Router definition, ProtectedRoute, role-based navigation
│   ├── main.tsx                    # React app entry point
│   ├── config.ts                   # App-level constants
│   ├── pages/
│   │   ├── admin/                  # Admin-only pages (40 files)
│   │   ├── specialist/             # Specialist-role pages (3 files)
│   │   ├── receptionist/           # Receptionist-role pages (14 files)
│   │   ├── Login.tsx               # Public login page
│   │   ├── Catalog.tsx             # Shared product catalog
│   │   ├── Profile.tsx             # Shared user profile
│   │   ├── Settings.tsx            # Shared settings
│   │   ├── Unauthorized.tsx        # 403 page
│   │   └── ErrorPage.tsx           # 404 page
│   ├── components/
│   │   ├── ui/                     # shadcn-ui primitives (30+ components)
│   │   │   ├── data-table/         # EntityTable and DataTable components
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── EntityTable.tsx
│   │   │   │   ├── column-helper.tsx
│   │   │   │   ├── cell-renderers.tsx
│   │   │   │   └── column-types.ts
│   │   │   ├── date-picker.tsx     # Canonical DatePicker component
│   │   │   └── ...                 # button, card, dialog, form, etc.
│   │   ├── appointments/           # Appointment-specific components
│   │   ├── clinical/               # Clinical history/evolution components
│   │   ├── discounts/              # Discount request components
│   │   ├── inventory/              # Inventory stock components
│   │   ├── patients/               # Patient card/form components
│   │   ├── sales/                  # Sales-specific components
│   │   ├── LensRecommendation.tsx  # Shared lens recommendation component
│   │   └── PrescriptionForm.tsx    # Shared prescription form
│   ├── services/                   # All API calls (one file per domain, 31 files)
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication state (user, login, logout, role checks)
│   ├── hooks/
│   │   ├── use-mobile.tsx          # Responsive breakpoint hook
│   │   ├── use-toast.ts            # Toast notification hook
│   │   └── useDebounce.ts          # Input debounce hook
│   ├── layouts/
│   │   └── AdminLayout.tsx         # Shared sidebar + content layout (used by all roles)
│   ├── lib/
│   │   ├── axios.ts                # Primary axios instance (with token refresh logic)
│   │   └── utils.ts                # cn() helper and shared utilities
│   └── types/
│       └── user.ts                 # TypeScript User type
├── vite.config.ts                  # Vite config; `/api` proxied to port 8000 in dev
├── tsconfig.json                   # TypeScript config; `@/` alias maps to `src/`
├── tailwind.config.ts              # Tailwind CSS config
└── package.json                    # Node dependencies
```

---

## Key Module Responsibilities

### Backend

| Directory | Responsibility |
|---|---|
| `app/Http/Controllers/Api/V1/` | HTTP layer — receive request, delegate, return resource |
| `app/Http/Requests/Api/V1/` | Input validation — one class per action per entity |
| `app/Services/` | Business logic — create/update/delete with side effects |
| `app/Http/Resources/V1/` | Response shaping — transform models to JSON structure |
| `app/Models/` | Data access — Eloquent models, relationships, traits |
| `app/Traits/` | Cross-cutting concerns — `ApiFilterable`, `DocumentManagement` |
| `routes/api.php` | Route registry — all endpoints declared here |

### Frontend

| Directory | Responsibility |
|---|---|
| `src/pages/admin/` | Admin-only views and forms |
| `src/pages/specialist/` | Specialist-only views (appointments, prescriptions) |
| `src/pages/receptionist/` | Receptionist-only views (patients, sales, quotes) |
| `src/services/` | API communication — all Axios calls, TypeScript interfaces for API shapes |
| `src/components/ui/` | shadcn-ui component library + custom data-table system |
| `src/components/ui/data-table/` | `EntityTable` / `DataTable` — canonical table component for all listings |
| `src/contexts/AuthContext.tsx` | Auth state, login/logout, role helper methods |
| `src/lib/axios.ts` | Axios instance with JWT injection and 401 refresh handling |

---

## Feature Organization

**Backend:** Organized by technical layer, not by feature. All controllers for every domain sit flat in `app/Http/Controllers/Api/V1/`. All services sit flat in `app/Services/`. Grouping by entity is achieved through naming conventions.

**Frontend:** Pages are organized by role (`admin/`, `specialist/`, `receptionist/`), not by feature. Components are organized by domain (`appointments/`, `sales/`, etc.). Services are flat per domain entity.

---

## Entry Points

**Backend:**
- `convision-api/public/index.php` — PHP/Laravel application entry point
- `convision-api/routes/api.php` — All route definitions

**Frontend:**
- `convision-front/src/main.tsx` — React application bootstrap
- `convision-front/src/App.tsx` — Router config, `ProtectedRoute`, role-based redirects

---

## Naming Conventions

**Backend files:**
- Controllers: `{Entity}Controller.php` (e.g., `SalesController.php`, `PatientController.php`)
- Services: `{Entity}Service.php` (e.g., `SaleService.php`, `PatientService.php`)
- Form Requests: `{Action}{Entity}Request.php` (e.g., `StoreSaleRequest.php`, `UpdatePatientRequest.php`)
- Resources: `{Entity}Resource.php` and `{Entity}Collection.php`
- Models: PascalCase singular (e.g., `LaboratoryOrder.php`, `SaleItem.php`)

**Frontend files:**
- Pages: PascalCase by noun (e.g., `ServiceOrders.tsx`, `NewPurchase.tsx`, `SaleDetail.tsx`)
- Services: camelCase with `Service` suffix (e.g., `saleService.ts`, `laboratoryOrderService.ts`)
- Components: PascalCase (e.g., `DataTable.tsx`, `EntityTable.tsx`)
- Path alias: `@/` maps to `src/` (e.g., `import { api } from '@/services/api'`)

---

## Where to Add New Code

**New backend entity (full CRUD):**
1. Migration: `convision-api/database/migrations/`
2. Model: `convision-api/app/Models/{Entity}.php` — add `ApiFilterable` trait if filterable
3. Service: `convision-api/app/Services/{Entity}Service.php`
4. Form Requests: `convision-api/app/Http/Requests/Api/V1/{Entity}/Store{Entity}Request.php` and `Update{Entity}Request.php`
5. Resource: `convision-api/app/Http/Resources/V1/{Entity}/{Entity}Resource.php` and `{Entity}Collection.php`
6. Controller: `convision-api/app/Http/Controllers/Api/V1/{Entity}Controller.php`
7. Routes: add to `convision-api/routes/api.php` under a `Route::middleware('auth:api')->group()`

**New frontend page:**
1. Add page component to `convision-front/src/pages/{role}/{PageName}.tsx`
2. Add service methods to `convision-front/src/services/{entity}Service.ts` (create if needed)
3. Register route in `convision-front/src/App.tsx` under the appropriate role's `children` array

**New shared UI component:**
- Domain-specific: `convision-front/src/components/{domain}/{ComponentName}.tsx`
- Generic/primitive: `convision-front/src/components/ui/{ComponentName}.tsx`

**New table listing:**
- Use `EntityTable` from `convision-front/src/components/ui/data-table/EntityTable.tsx` — do not build custom table UIs

**New API service file:**
- Create `convision-front/src/services/{entity}Service.ts`
- Import axios from `@/lib/axios` (not `@/services/api`)
- Export typed TypeScript interfaces for all request/response shapes

---

## Special Directories

**`convision-api/storage/app/public/`:**
- Purpose: User-uploaded files (patient profile images, prescription/appointment annotations)
- Generated: Yes (at runtime)
- Committed: No

**`convision-api/vendor/`:**
- Purpose: PHP Composer dependencies
- Generated: Yes (`composer install`)
- Committed: No

**`convision-front/node_modules/`:**
- Purpose: Node.js dependencies
- Generated: Yes (`npm install`)
- Committed: No

**`convision-api/app/Http/Controllers/Api/Documentation/`:**
- Purpose: OpenAPI/Swagger schema definitions (`LensSchemas.php`, `SwaggerDefinitions.php`)
- Contains Swagger annotations used by `darkaonline/l5-swagger`

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents for Claude Code planning
- Generated: Yes (by GSD mapper agents)
- Committed: Yes (project knowledge)

---

## Gaps / Unknowns

- `convision-front/src/pages/receptionist/SalesCatalog.tsx` has backup variants (`.backup`, `.bak`, `SalesCatalog2.tsx`) suggesting work-in-progress or abandoned refactors.
- There is no dedicated `hooks/` directory for React Query wrappers — query logic lives inline in page components, making the boundary between data fetching and presentation unclear.
- `convision-front/src/services/ApiService.ts` and `convision-front/src/services/api.ts` both exist alongside `convision-front/src/lib/axios.ts` — the authoritative axios instance is ambiguous.
- The `convision-front/src/pages/specialist/` directory contains only 3 files despite the specialist role having its own dashboard and appointment management.
