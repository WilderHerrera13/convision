# 12 — Laboratory & Laboratory Orders

## Source files
- Controllers: `LaboratoryController.php`, `LaboratoryOrderController.php`, `LaboratoryOrderPDFController.php`
- Resources: `LaboratoryResource`, `LaboratoryOrderResource`, `LaboratoryOrderStatsResource`

---

## Middleware: `auth:api` (all routes)

---

## Laboratory Endpoints — `/api/v1/laboratories`

### GET /api/v1/laboratories
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated LaboratoryResource collection

### GET /api/v1/laboratories/{id}
**Response 200:** LaboratoryResource

### POST /api/v1/laboratories
```json
{
  "name": "string",             // required|max:255
  "contact_person": "string",   // nullable
  "email": "string",            // nullable|email
  "phone": "string",            // nullable|max:20
  "address": "string",          // nullable
  "status": "active",           // nullable|in:active,inactive
  "notes": "string"             // nullable
}
```
**Response 201:** LaboratoryResource

### PUT /api/v1/laboratories/{id}
Same body as store.
**Response 200:** LaboratoryResource

### DELETE /api/v1/laboratories/{id}
**Response 204:** No content

---

## LaboratoryResource shape
```json
{
  "id": 1,
  "name": "string",
  "contact_person": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "status": "active | inactive",
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Laboratory Order Endpoints — `/api/v1/laboratory-orders`

### GET /api/v1/laboratory-orders/stats
Returns order statistics by status.
**Response 200:** `{ "pending": 5, "in_process": 3, "ready_for_delivery": 2, ... }`

### GET /api/v1/laboratory-orders
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated LaboratoryOrderResource collection

### GET /api/v1/laboratory-orders/{id}
**Response 200:** LaboratoryOrderResource (with laboratory, patient, createdBy, order, sale, statusHistory)

### POST /api/v1/laboratory-orders
```json
{
  "order_id": 1,                // nullable|exists:orders,id
  "sale_id": 1,                 // nullable|exists:sales,id
  "laboratory_id": 1,           // required|exists:laboratories,id
  "patient_id": 1,              // required|exists:patients,id
  "status": "pending",          // nullable|in:pending,in_process,sent_to_lab,ready_for_delivery,delivered,cancelled
  "priority": "normal",         // nullable|in:low,normal,high,urgent
  "estimated_completion_date": "2024-05-15", // nullable|date
  "notes": "string"             // nullable
}
```
**Response 201:** LaboratoryOrderResource

### PUT /api/v1/laboratory-orders/{id}
Same body as store.
**Response 200:** LaboratoryOrderResource

### DELETE /api/v1/laboratory-orders/{id}
**Response 204:** No content

### POST /api/v1/laboratory-orders/{id}/status
Update status of a laboratory order.
**Request body:**
```json
{
  "status": "in_process",       // required|in:pending,in_process,sent_to_lab,ready_for_delivery,delivered,cancelled
  "notes": "string"             // nullable — added to status history
}
```
**Response 200:** LaboratoryOrderResource

---

## LaboratoryOrderResource shape
```json
{
  "id": 1,
  "order_number": "LAB-001",
  "order_id": 1,
  "sale_id": 1,
  "laboratory_id": 1,
  "patient_id": 1,
  "status": "pending | in_process | sent_to_lab | ready_for_delivery | delivered | cancelled",
  "priority": "low | normal | high | urgent",
  "estimated_completion_date": "2024-05-15",
  "notes": "string",
  "created_by": 1,
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "laboratory": { ...LaboratoryResource },
  "patient": { ...PatientResource },
  "created_by_user": { ...UserResource },
  "order": { ...OrderResource },
  "sale": { ...SaleResource },
  "status_history": [
    { "status": "pending", "notes": "string", "created_at": "ISO8601" }
  ]
}
```

---

## DB tables

### `laboratories`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar(255) |
| contact_person | varchar nullable |
| email | varchar nullable |
| phone | varchar(20) nullable |
| address | text nullable |
| status | varchar default 'active' |
| notes | text nullable |
| created_at | timestamp |
| updated_at | timestamp |

### `laboratory_orders`
| Column | Type |
|---|---|
| id | bigint PK |
| order_number | varchar unique |
| order_id | bigint FK nullable → orders.id |
| sale_id | bigint FK nullable → sales.id |
| laboratory_id | bigint FK → laboratories.id |
| patient_id | bigint FK → patients.id |
| status | varchar |
| priority | varchar default 'normal' |
| estimated_completion_date | date nullable |
| notes | text nullable |
| created_by | bigint FK → users.id |
| created_at | timestamp |
| updated_at | timestamp |

### `laboratory_order_statuses`
| Column | Type |
|---|---|
| id | bigint PK |
| laboratory_order_id | bigint FK |
| status | varchar |
| notes | text nullable |
| created_by | bigint FK → users.id |
| created_at | timestamp |
| updated_at | timestamp |
