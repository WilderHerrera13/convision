# 20 — Suppliers (Proveedores)

## Source files
- Controller: `app/Http/Controllers/Api/V1/SupplierController.php`
- Resources: `SupplierResource`, `SupplierCollection`

---

## Middleware: `auth:api`

---

## Endpoints

### GET /api/v1/suppliers
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated SupplierResource collection

### GET /api/v1/suppliers/{id}
**Response 200:** SupplierResource

### POST /api/v1/suppliers
```json
{
  "name": "string",               // required|max:255
  "legal_name": "string",         // nullable|max:255
  "nit": "string",                // nullable|max:50
  "legal_representative": "string",// nullable|max:255
  "person_type": "natural | legal",// nullable
  "address": "string",            // nullable
  "phone": "string",              // nullable|max:50
  "email": "string",              // nullable|email
  "city": "string",               // nullable|max:100
  "state": "string",              // nullable|max:100
  "country": "string",            // nullable|max:100
  "postal_code": "string",        // nullable|max:20
  "website": "string",            // nullable|max:255
  "notes": "string"               // nullable
}
```
**Response 201:** SupplierResource

### PUT /api/v1/suppliers/{id}
Same body as store, optional.
**Response 200:** SupplierResource

### DELETE /api/v1/suppliers/{id}
**Response 204:** No content

---

## SupplierResource shape
```json
{
  "id": 1,
  "name": "string",
  "legal_name": "string",
  "nit": "string",
  "legal_representative": "string",
  "person_type": "natural | legal",
  "address": "string",
  "phone": "string",
  "email": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "postal_code": "string",
  "website": "string",
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## DB table: `suppliers`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar(255) |
| legal_name | varchar(255) nullable |
| nit | varchar(50) nullable |
| legal_representative | varchar(255) nullable |
| person_type | varchar nullable |
| address | text nullable |
| phone | varchar(50) nullable |
| email | varchar(255) nullable |
| city | varchar(100) nullable |
| state | varchar(100) nullable |
| country | varchar(100) nullable |
| postal_code | varchar(20) nullable |
| website | varchar(255) nullable |
| notes | text nullable |
| created_at | timestamp |
| updated_at | timestamp |
