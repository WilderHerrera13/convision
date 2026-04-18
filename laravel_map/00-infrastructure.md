# 00 — Infrastructure & Cross-Cutting Concerns

## Purpose
This file describes all infrastructure that underpins every module.
The Golang agent implementing any module MUST reproduce this behavior exactly.

---

## Base URL
All API endpoints are prefixed with `/api/v1/`.
Laravel runs on port `8000`. Golang must also listen on `8000` (or behind the same proxy).

---

## Authentication — JWT (tymon/jwt-auth)

### How it works (Laravel)
- Library: `tymon/jwt-auth` v1.x
- Guard: `auth:api` (configured in `config/auth.php`)
- Token type: Bearer
- Header: `Authorization: Bearer <token>`
- TTL: configurable (default 60 min × 60 = 3600 s returned in `expires_in`)
- JWT custom claims include `{ "role": "admin" | "specialist" | "receptionist" | "laboratory" }`

### Golang equivalent
- Use `golang-jwt/jwt` or `github.com/lestrrat-go/jwx`
- Validate `Authorization: Bearer <token>` header on every protected route
- Extract `role` from JWT claims for middleware checks
- Return `401` with `{"error":"Unauthorized"}` on invalid/missing token
- Return `401` with `{"message":"Unauthenticated"}` on missing token from role middleware

---

## Middleware Stack

### `auth:api` (JWT guard)
- Returns `401 {"message":"Unauthenticated"}` if no valid token
- Populates `request.user` with authenticated user data (id, name, last_name, email, identification, phone, role)

### `role:<roles>` (RoleMiddleware)
- Pipe-separated roles: `role:admin|specialist|receptionist`
- Checks `user.role` against allowed list
- Returns `401 {"message":"Unauthenticated"}` if not authenticated
- Returns `403 {"message":"Unauthorized"}` if role not allowed

### `jwt.auth` (alias for JWT guard, used in AuthController constructor)
- Same as `auth:api` in effect

### Middleware applied per route group (see routes/api.php):
| Route group | Middleware |
|---|---|
| `auth/login`, `auth/refresh` | none |
| `auth/logout` | `jwt.auth` |
| `auth/me` | `jwt.auth` |
| `dashboard/summary` | `auth:api` |
| `admin/notifications/*` | `auth:api`, `role:admin` |
| `users` (CRUD) | `auth:api` |
| `brands`, `lens-types`, `materials`, `lens-classes`, `treatments`, `photochromics` | `auth:api` |
| `suppliers`, `laboratories` | `auth:api` |
| `laboratory-orders` | `auth:api` |
| `patients` | `auth:api`, `role:admin\|specialist\|receptionist` |
| `appointments` (most) | `auth:api`, `role:admin\|specialist\|receptionist` |
| `appointments take/lens-annotation` | `auth:api`, `role:specialist` |
| `prescriptions`, `notes` | `auth:api` |
| `orders` (all) | `auth:api` (middleware en constructor del controlador, no en routes) |
| `sales` (all) | `auth:api` (middleware en constructor del controlador, no en routes) |
| `quotes` | `auth:api` (middleware en constructor del controlador, no en routes) |
| `payment-methods` | `auth:api` (middleware en constructor del controlador, no en routes) |
| `warehouses`, `warehouse-locations`, `inventory-items`, `inventory-transfers` | `auth:api` |
| `discount-requests`, `active-discounts` | `auth:api` |
| `lookup/*` | `auth:api` |
| `clinical-histories`, `clinical-evolutions` | **no auth** |
| `guest/*` | **no auth** (token-based security via query param) |
| `products`, `product-categories` | `auth:api` |
| `purchases` | `auth:api` |
| `expenses` | `auth:api` |
| `supplier-payables` | `auth:api` |
| `payrolls` | `auth:api` |
| `service-orders` | `auth:api` |
| `cash-transfers` | `auth:api` |
| `cash-register-closes` | `auth:api` |
| `daily-activity-reports` | `auth:api` |

---

## Pagination

All list endpoints support pagination via Laravel's `paginate()`.

### Query parameters
| Param | Default | Max | Description |
|---|---|---|---|
| `per_page` | 15 | 100 | Items per page |
| `page` | 1 | — | Page number |

### Response envelope (Laravel ResourceCollection)
```json
{
  "data": [...],
  "links": {
    "first": "http://...",
    "last": "http://...",
    "prev": null,
    "next": "http://..."
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "path": "http://...",
    "per_page": 15,
    "to": 15,
    "total": 73
  }
}
```

Golang **must** reproduce this exact envelope structure for all paginated endpoints.

---

## Filtering — ApiFilterable Trait

All models with the `ApiFilterable` trait support dynamic filtering via query params.

### Query parameters
| Param | Type | Description |
|---|---|---|
| `s_f` | JSON array | Field names to filter on |
| `s_v` | JSON array | Values corresponding to fields |
| `s_o` | `"and"` \| `"or"` | Operator (default: `"and"`) |
| `status` | string | Direct status filter (separate from s_f/s_v) |
| `sort` | `"field,asc"` \| `"field,desc"` | Sort column and direction |
| `brand_id`, `material_id`, `lens_class_id`, `treatment_id`, `photochromic_id`, `supplier_id`, `type_id` | integer | Direct ID filters |

### Filter logic
- `_id` suffix fields → exact match (`=`)
- Other fields → LIKE match (`%value%`)
- Dot-notation `relation.field` → `whereHas` with LIKE on related table

### Example request
```
GET /api/v1/patients?s_f=["first_name","status"]&s_v=["John","active"]&sort=created_at,desc&per_page=20
```

---

## Error Response Format

### Validation errors (422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["Error message here."]
  }
}
```

### Auth errors
- `401`: `{"error":"Unauthorized"}` (bad credentials) or `{"message":"Unauthenticated"}`
- `403`: `{"message":"Unauthorized"}`

### Not found (404)
Laravel returns `{"message":"No query results for model [Model] 123"}` via `findOrFail()`.
Golang should return: `{"message":"Not found"}` with HTTP 404.

### Server error (500)
`{"message":"Server Error"}`

---

## CORS
Configured in `config/cors.php`. Allows all origins in development.
Golang must set these headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

---

## Guest PDF Token System

Several endpoints generate PDF tokens for unauthenticated access.
Token is generated by `GuestPDFController::generateToken($type, $id)` using Laravel's `Crypt::encrypt()`.

### Golang equivalent
- Use AES-256-GCM or similar symmetric encryption
- Token encodes: `{ type: string, id: int, expires_at: timestamp }`
- Token is passed as query param: `?token=<encrypted_token>`
- Validate token on guest PDF routes, return `403 {"error":"Invalid or expired token"}` on failure

### Response fields added to resources with PDF support
```json
{
  "pdf_token": "<token>",
  "guest_pdf_url": "http://localhost:8000/api/v1/guest/<type>/<id>/pdf?token=<token>"
}
```

---

## Database
- MySQL (same DB shared between Laravel and Golang during migration)
- Table names: plural snake_case (Laravel conventions)
- All tables have `id` (bigint, auto-increment, PK), `created_at`, `updated_at` timestamps
- Soft deletes use `deleted_at` timestamp (patients uses soft deletes)

---

## Key Roles
| Role constant | Value |
|---|---|
| `ROLE_ADMIN` | `"admin"` |
| `ROLE_RECEPTIONIST` | `"receptionist"` |
| `ROLE_SPECIALIST` | `"specialist"` |
| `ROLE_LABORATORY` | `"laboratory"` |
