<!-- GSD Configuration — managed by get-shit-done installer -->
# Instructions for GSD

- Use the get-shit-done skill when the user asks for GSD or uses a `gsd-*` command.
- Treat `/gsd-...` or `gsd-...` as command invocations and load the matching file from `.github/skills/gsd-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply GSD workflows unless the user explicitly asks for them.
- After completing any `gsd-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
<!-- /GSD Configuration -->

# Convision — GitHub Copilot Instructions

## Project Overview

Monorepo para un sistema de gestión de clínica óptica:
- `convision-api/` — Laravel 8 REST API (backend, puerto 8000)
- `convision-front/` — React 18 + TypeScript SPA (frontend, puerto 4300)
- `convision-api-golang/` — Go 1.22 REST API (migración del backend Laravel, puerto 8001)

---

## General Guidelines

- Avoid code duplication. Always scan both sub-projects before creating new code.
- All frontend text must be in **Spanish**.
- Backend runs on port `8000`, frontend on port `4300` (Vite).
- Always apply changes in the project — partial or local-only changes are not accepted.
- All date pickers must use the `DatePicker` component.
- All tables must use `EntityTable` / `DataTable` — never build custom table UIs.

---

## Backend (Laravel)

- **Never** validate directly in controllers — always use **Laravel Form Request classes**.
- Form Requests path: `app/Http/Requests/Api/V1/{Entity}/{Action}{Entity}Request.php`
  - Examples: `StorePatientRequest.php`, `UpdateAppointmentRequest.php`
- **Never** use `response()->json()` in API controllers — always use **Laravel API Resources**.
- Resources path: `app/Http/Resources/V1/{Category}/{Model}Resource.php` and `{Model}Collection.php`
- Add the `ApiFilterable` trait to every model that needs filterable list endpoints.
- In controllers, use `Model::apiFilter($request)` instead of manual filtering.
- Frontend sends filter params as `s_f` (fields) and `s_v` (values) as JSON.
- All controller logic must be delegated to services or actions.
- Use Eloquent eager loading — never cause N+1 queries.
- Every new model needs its **migration**, **factory**, and **seeder**.
- Use Laravel policies or gates for authorization.

### Controller pattern

```php
// index
public function index(Request $request)
{
    $perPage = min(max(1, (int)$request->get('per_page', 15)), 100);
    return new ModelCollection(Model::apiFilter($request)->paginate($perPage));
}

// show
public function show($id)
{
    return new ModelResource(Model::findOrFail($id));
}

// store
public function store(StoreModelRequest $request)
{
    return new ModelResource(Model::create($request->validated()));
}

// update
public function update(UpdateModelRequest $request, $id)
{
    $item = Model::findOrFail($id);
    $item->update($request->validated());
    return new ModelResource($item->fresh());
}

// destroy
public function destroy($id)
{
    Model::findOrFail($id)->delete();
    return response()->json(null, 204);
}
```

### Resource structure

```php
// app/Http/Resources/V1/[Category]/[Model]Resource.php
namespace App\Http\Resources\V1\[Category];

class [Model]Resource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // fields...
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

---

## Frontend (React)

- Use **functional components** with React Hooks only — no class components.
- Max component size: **200 lines**. Extract logic into custom hooks or sub-components.
- Use **Tailwind CSS** for styling — no inline styles or separate CSS files.
- Use **shadcn/ui** components over raw Tailwind divs/buttons.
- All API calls go in `src/services/` — never call axios directly in components.
- Use axios with interceptors for auth tokens and global error handling.
- Forms use React Hook Form + Zod validation.
- Use `useCallback`, `useMemo` and proper dependency arrays to avoid unnecessary re-renders.
- Always show loading states and disable repeated actions while awaiting responses.

### Discount flow for lenses

```ts
// 1. Check
if (lens.has_discounts) {
  // 2. Get best discount
  const bestDiscount = await discountService.getBestDiscount(lensId, patientId?);
  // 3. Calculate
  const finalPrice = discountService.calculateDiscountedPrice(originalPrice, bestDiscount.discount_percentage);
}
```

### Role-based routing

| Role | Access |
|---|---|
| admin | Full system |
| specialist | Appointments, prescriptions, patient history |
| receptionist | Patients, sales, quotes, appointments |

---

## API Communication

- Never hardcode secrets or API endpoints — use environment variables.
- Use `axios` with interceptors to attach auth tokens and handle global errors.
- Add proper error handling and user feedback for all API calls.

---

## Testing

- Backend: PHPUnit (Feature or Unit). Use factories, not seeders.
- Frontend: React Testing Library for components.
- Use `.env.testing` for test environment overrides.

---

## Environment

- Never commit `.env`, `.env.local`, or private keys.
- Keep `.env.example` up-to-date.

---

## Dev Credentials (local seed only — password: `password`)

| Role | Email |
|---|---|
| admin | `admin@convision.com` |
| specialist | `specialist@convision.com` |
| receptionist | `receptionist@convision.com` |
| admin (demo) | `cvargas@convision.com` |
| specialist (demo) | `abermudez@convision.com` |
| receptionist (demo) | `vcastillo@convision.com` |
| laboratory | `hquintero@convision.com` |

```bash
# Get JWT token
curl --location 'http://localhost:8000/api/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{"email":"admin@convision.com","password":"password"}'
```

---

## QA — Explorer agent behavior

When asked to do **QA exploration**, **find bugs**, or **generate findings**:

- Use browser tools (navigate, snapshot, interactions). After every page change, take a fresh snapshot before the next action.
- Read-only on the repo — do not modify code unless explicitly asked.
- Environments: front `http://localhost:4300`, API `http://localhost:8000`.
- Per role: go to `/login` → fill credentials → confirm dashboard redirect → walk every sidebar item → walk routes from the map not in the sidebar.
- Check for: blank screens, visible errors, empty tables vs error, console warnings, network failures.
- Max 1 retry per screen with a fresh snapshot. After 4 failed attempts: document as **blocked**.
- Mark findings **confirmed** only with evidence; otherwise mark **hypothesis**.
- Output file: `.planning/qa/FINDINGS-YYYY-MM-DD.md`

### FINDINGS format per item

```
### QA-001
- Rol: receptionist
- URL: http://localhost:4300/...
- Severidad: bloqueante | mayor | menor | sugerencia
- Pasos: 1. … 2. …
- Esperado: …
- Observado: …
- Evidencia: (UI message / HTTP status / console output)
- Estado: confirmado | hipótesis
```

---

## QA — Fixer agent behavior

When asked to **fix QA findings**, **process FINDINGS**, or **close QA-###**:

- Require a findings file or list with: ID, Rol, URL, Esperado, Observado, Evidencia, Severidad, Estado.
- Do not implement without reproducible evidence — ask for it if missing.
- Work one finding (or one narrow group) per iteration.
- Trace the full data flow: screen → `src/services/*` → endpoint → controller → service/model → response → React state.
- Choose the smallest fix that satisfies the expected behavior without breaking other roles.
- After each fix: run `npm run lint` (if TS touched) and `php artisan test` for affected files.
- Update the FINDINGS file marking the ID as **resuelto** | **no reproducible** | **parcial**.
- Commit atomically (one ID per commit when possible).

### Fix level hierarchy

| Symptom | Fix layer |
|---|---|
| API accepts invalid data | Form Request + service business rules |
| Generic error / no feedback | Front toast + service error handling + API message |
| Blank screen on load | Loading/error state, query keys, data guards |
| Buttons inaccessible (overflow) | Layout/scroll, `aria`, sticky footer |
| Admin vs receptionist inconsistency | API policies + React `allowedRoles` |

### Anti-patterns (forbidden)

- Fixing only the UI symptom when the API is wrong (or vice versa) without explicit decision.
- Unrequested mass refactors.
- Ignoring other roles that share the same screen or endpoint.
- Mixing English in user-visible copy.

---

## Backend (Go — `convision-api-golang/`)

> Apply these rules to **every file** inside `convision-api-golang/`. Read `DEVELOPMENT_GUIDE.md` and `DATABASE_GUIDE.md` before writing any Go code.

### Stack

| Component | Library |
|---|---|
| Router | `github.com/gin-gonic/gin` v1.10 |
| ORM | `gorm.io/gorm` + `gorm.io/driver/postgres` |
| JWT | `github.com/golang-jwt/jwt/v5` |
| Logging | `go.uber.org/zap` |
| Validation | `github.com/go-playground/validator/v10` (bundled with Gin) |
| Module | `github.com/convision/api` |

Port: **8001**. Add dependencies only with `go get <pkg>` + `make tidy` — never edit `go.mod` manually.

---

### Architecture — Three-Layer Rule (STRICT)

```
Transport (Gin handlers)  →  Service (use cases)  →  Domain (entities + interfaces)
                                                            ↑
                                                    Platform (PostgreSQL, JWT) implements
```

- **Domain** (`internal/domain/`) — entities + repository interfaces only. Zero external imports.
- **Service** (`internal/<feature>/service.go`) — business logic + DTOs. Imports only `domain` and stdlib.
- **Transport** (`internal/transport/http/v1/`) — parse → call service → respond. Max ~20 lines per handler.
- **Platform** (`internal/platform/`) — GORM repositories, JWT. Implements `domain` interfaces.

**NEVER:**
- Import `platform` or `gorm` from `domain`
- Import `gorm` from `transport` handlers
- Put business logic in handlers or repositories
- Call `platform` directly from `transport`

---

### Domain Layer

One file per entity in `internal/domain/<entity>.go`. Each file declares the GORM struct + Repository interface.

```go
// internal/domain/appointment.go
package domain

import "time"

type Appointment struct {
    ID           uint       `json:"id"            gorm:"primaryKey;autoIncrement"`
    ClinicID     uint       `json:"clinic_id"     gorm:"not null;index"`
    PatientID    uint       `json:"patient_id"    gorm:"not null;index"`
    SpecialistID uint       `json:"specialist_id" gorm:"not null;index"`
    ScheduledAt  time.Time  `json:"scheduled_at"  gorm:"not null"`
    Status       string     `json:"status"        gorm:"type:varchar(30);default:'scheduled'"`
    Notes        string     `json:"notes"         gorm:"type:text"`
    CreatedAt    time.Time  `json:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at"`
    DeletedAt    *time.Time `json:"deleted_at,omitempty" gorm:"index"`

    Patient    *Patient `json:"patient,omitempty"    gorm:"foreignKey:PatientID"`
    Specialist *User    `json:"specialist,omitempty" gorm:"foreignKey:SpecialistID"`
}

type AppointmentRepository interface {
    GetByID(id uint) (*Appointment, error)
    Create(a *Appointment) error
    Update(a *Appointment) error
    Delete(id uint) error
    List(filters map[string]any, page, perPage int) ([]*Appointment, int64, error)
}
```

**Domain error types** (use existing ones — do not create new types unless necessary):

| Type | When |
|---|---|
| `*ErrNotFound` | Record does not exist |
| `*ErrConflict` | Unique constraint violation |
| `*ErrUnauthorized` | Insufficient role (business level) |
| `*ErrValidation` | Business rule violated |

---

### Service Layer

```go
// internal/appointment/service.go
package appointment

type Service struct {
    repo   domain.AppointmentRepository
    logger *zap.Logger
}

type CreateInput struct {
    PatientID    uint      `json:"patient_id"    binding:"required"`
    SpecialistID uint      `json:"specialist_id" binding:"required"`
    ScheduledAt  time.Time `json:"scheduled_at"  binding:"required"`
    Notes        string    `json:"notes"`
}

type ListOutput struct {
    Data    []*domain.Appointment `json:"data"`
    Total   int64                 `json:"total"`
    Page    int                   `json:"page"`
    PerPage int                   `json:"per_page"`
}

func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
    if page < 1 { page = 1 }
    if perPage < 1 || perPage > 100 { perPage = 15 }
    data, total, err := s.repo.List(filters, page, perPage)
    if err != nil { return nil, err }
    return &ListOutput{Data: data, Total: total, Page: page, PerPage: perPage}, nil
}
```

- Define `CreateInput`, `UpdateInput`, `ListOutput` DTOs **in the service package** — never expose domain structs directly as HTTP DTOs.
- All **business rule** validation lives here (not in handlers, not in repositories).
- Return domain errors (`*domain.ErrNotFound`, etc.) — never raw GORM errors.
- Log significant events with `zap` structured fields (never `fmt.Sprintf` in log messages).

---

### Transport Layer (Handlers)

```go
// Thin handler — parse → service → respond
func (h *Handler) CreateAppointment(c *gin.Context) {
    var input appointment.CreateInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
        return
    }
    a, err := h.appointment.Create(input)
    if err != nil {
        respondError(c, err)
        return
    }
    c.JSON(http.StatusCreated, a)
}
```

`respondError` maps domain errors to HTTP codes:
- `*ErrNotFound` → 404, `*ErrConflict` → 409, `*ErrUnauthorized` → 403, `*ErrValidation` → 422, default → 500.

Use `errors.As(err, &target)` — **not** type switch — when errors may be wrapped with `%w`.

All routes under `/api/v1/`. RBAC set in `routes.go` with `jwtauth.RequireRole(...)` middleware — **never** inside handlers.

---

### Repository Layer (Platform)

```go
func (r *AppointmentRepository) Update(a *domain.Appointment) error {
    // Updates() only touches specified fields — never use db.Save()
    return r.db.Model(a).Updates(map[string]any{
        "scheduled_at": a.ScheduledAt,
        "status":       a.Status,
        "notes":        a.Notes,
    }).Error
}

func (r *AppointmentRepository) GetByID(id uint) (*domain.Appointment, error) {
    var a domain.Appointment
    err := r.db.Preload("Patient").First(&a, id).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, &domain.ErrNotFound{Resource: "appointment"}
    }
    return &a, err
}
```

**Repository rules:**
- Convert `gorm.ErrRecordNotFound` → `*domain.ErrNotFound` before returning.
- Always use `Select("col1, col2, ...")` in list queries — never `SELECT *`.
- Never use `db.Save()` — use `db.Model(&e).Updates(map[string]any{...})`.
- Use `Preload` for eager loading; never trigger N+1 in loops.
- Filter fields must be validated against an `allowedFilters` allowlist to prevent SQL injection on column names.
- Always `Count` before `Find` to get correct pagination totals.
- Register the new model in `AutoMigrate` in `internal/platform/storage/postgres/db.go`.

---

### PostgreSQL / Database Rules

- **`clinic_id` is mandatory** on every clinical/administrative table. Always filter `WHERE clinic_id = $n` as the first condition.
- **Data types:**
  - PKs: `INTEGER GENERATED ALWAYS AS IDENTITY` (BIGINT only if > 2B rows expected)
  - Money: `NUMERIC(12,2)` — never `FLOAT`
  - Timestamps: `TIMESTAMPTZ` — never `TIMESTAMP`
  - Enums: `VARCHAR(30)` + `CHECK` constraint — never PostgreSQL `ENUM` type
  - Booleans: `BOOLEAN` — never `INTEGER` 0/1
  - JSON: `JSONB` — never `JSON`
- **Soft delete** with `deleted_at TIMESTAMPTZ NULL` for all clinical/transactional data.
- **Always** use parameterized queries — never interpolate user input into SQL strings.
- **Pagination:** keyset for deep pages (`(col, id) < ($2, $3)`); `OFFSET` only for first 10 pages.
- **AutoMigrate** only runs when `APP_ENV=local`. Use versioned SQL migrations for production.
- **Connection pool** — configure after opening GORM:
  ```go
  sqlDB.SetMaxOpenConns(25)
  sqlDB.SetMaxIdleConns(10)
  sqlDB.SetConnMaxLifetime(5 * time.Minute)
  ```
- Use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for production indexes.
- Prefix indexes: `idx_{table}_{cols}`, unique: `uq_{table}_{col}`, FK: `fk_{table}_{ref}`.

---

### RBAC — Role Constants

Use constants from `domain` — never string literals in `RequireRole`:

```go
domain.RoleAdmin        // "admin"
domain.RoleSpecialist   // "specialist"
domain.RoleReceptionist // "receptionist"
domain.RoleLaboratory   // "laboratory"
```

| Resource | admin | specialist | receptionist | laboratory |
|---|:---:|:---:|:---:|:---:|
| Patients (read) | ✓ | ✓ | ✓ | — |
| Patients (write) | ✓ | — | ✓ | — |
| Appointments | ✓ | ✓ | ✓ | — |
| Clinical records | ✓ | ✓ | — | — |
| Sales / Quotes | ✓ | — | ✓ | — |
| Laboratory | ✓ | ✓ | — | ✓ |
| Inventory / Catalogs | ✓ | — | — | — |
| Users | ✓ | — | — | — |

---

### Checklist for a New Feature

1. **Domain** — `internal/domain/<entity>.go`: struct + Repository interface
2. **Repository** — `internal/platform/storage/postgres/<entity>_repository.go`: implements interface
3. **Register** — add model to `AutoMigrate` in `db.go`
4. **Service** — `internal/<feature>/service.go`: DTOs + business logic
5. **Handler** — add methods to `internal/transport/http/v1/handler.go`
6. **Routes** — add routes + RBAC in `internal/transport/http/v1/routes.go`
7. **DI** — wire repo → service → handler in `cmd/api/main.go`
8. **Tests** — `internal/<feature>/service_test.go` with mock repositories

---

### Go Anti-patterns (Forbidden)

| ❌ Anti-pattern | ✅ Correct |
|---|---|
| `db.Save(&entity)` | `db.Model(&e).Updates(map[string]any{...})` |
| `SELECT *` in list queries | `Select("id, col1, col2")` always |
| Business logic in handlers | Move to service layer |
| Importing `gorm` in domain | Domain has zero external imports |
| String literal roles `"admin"` in RequireRole | `domain.RoleAdmin` constant |
| `fmt.Errorf("msg: %w", err)` breaking type switch | Use `errors.As(err, &target)` |
| Raw string interpolation in WHERE clauses | Parameterized queries `Where("col = ?", val)` |
| `FLOAT`/`REAL` for money columns | `NUMERIC(12,2)` |
| `TIMESTAMP` without timezone | `TIMESTAMPTZ` |
| PostgreSQL `ENUM` type | `VARCHAR(30)` + `CHECK` constraint |
| `OFFSET` > 200 for pagination | Keyset pagination |
| Queries missing `clinic_id` filter | Always filter by `clinic_id` first |
| New dependency added directly to `go.mod` | `go get <pkg>` then `make tidy` |
| `fmt.Sprintf` in log messages | `zap` structured fields: `zap.Uint("id", v)` |
