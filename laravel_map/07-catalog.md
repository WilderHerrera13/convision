# 07 — Lens Catalog (Brands, Lens Types, Materials, Classes, Treatments, Photochromics)

## Purpose
These are simple CRUD catalog tables used as foreign keys in Products/Lenses.
All follow the same pattern: apiResource + apiFilter + pagination.

## Middleware: `auth:api` (all routes)

---

## Brands — `/api/v1/brands`

### Resource shape
```json
{ "id": 1, "name": "string", "description": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }
```

### Store/Update body
```json
{
  "name": "string",        // required|max:100|unique:brands,name (on create)
  "description": "string" // nullable|max:1000
}
```

---

## Lens Types — `/api/v1/lens-types`

### Resource shape (LensTypeResource)
```json
{ "id": 1, "name": "string", "description": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }
```

### Store/Update body
```json
{
  "name": "string",        // required|max:255|unique:lens_types
  "description": "string"  // nullable
}
```

---

## Materials — `/api/v1/materials`

### Resource shape (MaterialResource)
```json
{ "id": 1, "name": "string", "description": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }
```

### Store/Update body
```json
{
  "name": "string",        // required|max:255|unique:materials
  "description": "string"  // nullable
}
```

---

## Lens Classes — `/api/v1/lens-classes`

### Resource shape (LensClassResource)
```json
{ "id": 1, "name": "string", "description": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }
```

### Store/Update body
```json
{
  "name": "string",        // required|max:255|unique:lens_classes
  "description": "string"  // nullable
}
```

---

## Treatments — `/api/v1/treatments`

### Resource shape (TreatmentResource)
```json
{ "id": 1, "name": "string", "description": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }
```

### Store/Update body
```json
{
  "name": "string",        // required|max:255|unique:treatments
  "description": "string"  // nullable
}
```

---

## Photochromics — `/api/v1/photochromics`

### Resource shape
```json
{ "id": 1, "name": "string", "description": "string", "created_at": "ISO8601", "updated_at": "ISO8601" }
```

### Store/Update body
```json
{
  "name": "string",        // required|max:255|unique:photochromics
  "description": "string"  // nullable
}
```

---

## Common endpoint pattern for all 6 resources:
| Method | URL | Response |
|---|---|---|
| GET | /api/v1/{resource} | 200 Paginated collection |
| GET | /api/v1/{resource}/{id} | 200 Resource |
| POST | /api/v1/{resource} | 201 Resource |
| PUT | /api/v1/{resource}/{id} | 200 Resource |
| DELETE | /api/v1/{resource}/{id} | 204 No content |

---

## Payment Methods — `/api/v1/payment-methods`

### Source files
- Controller: `PaymentMethodController.php`
- Service: `PaymentMethodService.php`
- Model: `PaymentMethod.php` (has `ApiFilterable` trait)
- Requests: `StorePaymentMethodRequest.php`, `UpdatePaymentMethodRequest.php`
- Resource: `PaymentMethodResource.php` / `PaymentMethodCollection.php`

### Middleware: `auth:api`
**Role restriction on write operations:** Only `admin` can create/update/delete (enforced in `StorePaymentMethodRequest::authorize()`).

### Behavior note on GET /api/v1/payment-methods
Unlike the other 6 catalog resources, this endpoint does **not** return a paginated collection.
`PaymentMethodService::getActivePaymentMethods()` always returns ALL active payment methods ordered by `name` (no pagination).

### GET /api/v1/payment-methods
**Response 200:** Non-paginated array of PaymentMethodResource (only `is_active = true` records).

### GET /api/v1/payment-methods/{id}
**Response 200:** PaymentMethodResource

### POST /api/v1/payment-methods
**Roles allowed:** `admin` only
```json
{
  "name": "string",              // required|max:255
  "code": "string",              // required|max:50|unique:payment_methods
  "description": "string",      // nullable
  "icon": "string",              // nullable|max:100 (e.g. icon class name)
  "is_active": true,             // sometimes|boolean, default: true
  "requires_reference": false    // sometimes|boolean, default: false
}
```
**Response 201:** PaymentMethodResource

### PUT /api/v1/payment-methods/{id}
**Roles allowed:** `admin` only
Same body as store (all fields optional on update).
**Response 200:** PaymentMethodResource

### DELETE /api/v1/payment-methods/{id}
**Roles allowed:** `admin` only
**Response 204:** No content

### PaymentMethodResource shape
```json
{
  "id": 1,
  "name": "Efectivo",
  "code": "efectivo",
  "description": "string | null",
  "is_active": true,
  "requires_reference": false,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Key fields
- `code` — machine-readable identifier; used in `CashRegisterClose.payment_methods[].name` and `DailyActivityReport.recepciones_dinero` keys. Must be unique. Examples: `efectivo`, `voucher`, `bancolombia`, `daviplata`, `nequi`, `addi`, `sistecredito`.
- `requires_reference` — if `true`, the frontend should prompt for a reference number when this method is used in a sale/quote payment.
- `is_active` — only active methods are returned by the list endpoint; inactive methods are hidden from all UIs.

All list endpoints support `s_f`, `s_v`, `s_o`, `sort`, `per_page` query params.

---

## DB tables

| Table | Key columns |
|---|---|
| `brands` | id, name, description |
| `lens_types` | id, name, description |
| `materials` | id, name, description |
| `lens_classes` | id, name, description |
| `treatments` | id, name, description |
| `photochromics` | id, name, description |

All have `created_at`, `updated_at`.
