# Convision — GitHub Copilot Instructions

## Project Overview

Monorepo para un sistema de gestión de clínica óptica:
- `convision-api/` — Laravel 8 REST API (backend, puerto 8000)
- `convision-front/` — React 18 + TypeScript SPA (frontend, puerto 4300)

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
