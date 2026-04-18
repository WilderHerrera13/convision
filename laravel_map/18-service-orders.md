# 18 — Service Orders (Órdenes de Arreglo)

## Source files
- Controller: `app/Http/Controllers/Api/V1/ServiceOrderController.php`
- Resources: `ServiceOrderResource`, `ServiceOrderCollection`

---

## Middleware: `auth:api`

---

## Service Order Statuses
`pending`, `in_progress`, `completed`, `delivered`, `cancelled`

---

## Endpoints

### GET /api/v1/service-orders/stats
**Response 200:**
```json
{
  "pending": 5,
  "in_progress": 3,
  "completed": 10,
  "delivered": 8,
  "cancelled": 1
}
```

### GET /api/v1/service-orders
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated ServiceOrderResource collection

### GET /api/v1/service-orders/{id}
**Response 200:** ServiceOrderResource (with supplier)

### POST /api/v1/service-orders
```json
{
  "supplier_id": 1,             // required|exists:suppliers,id
  "customer_name": "string",    // required|max:255
  "customer_phone": "string",   // required|max:100
  "customer_email": "string",   // nullable|email|max:255
  "service_type": "string",     // required|max:150
  "problem_description": "string",// required
  "estimated_cost": 50.00,      // nullable|numeric|min:0
  "deadline": "2024-05-15",     // nullable|date
  "priority": "high",           // required|in:low,medium,high
  "notes": "string"             // nullable
}
```
**Response 201:** ServiceOrderResource

### PUT /api/v1/service-orders/{id}
Same body as store, optional.
**Response 200:** ServiceOrderResource

### DELETE /api/v1/service-orders/{id}
**Response 204:** No content

### POST /api/v1/service-orders/{serviceOrder}/status
Update service order status.
**Request body:**
```json
{
  "status": "in_progress",      // required|in:pending,in_progress,completed,delivered,cancelled
  "actual_cost": 45.00,         // nullable|numeric|min:0
  "notes": "string"             // nullable
}
```
**Response 200:** ServiceOrderResource

---

## ServiceOrderResource shape
```json
{
  "id": 1,
  "order_number": "SRV-001",
  "customer_name": "string",
  "customer_phone": "string",
  "customer_email": "string",
  "service_type": "string",
  "problem_description": "string",
  "estimated_cost": 50.00,
  "actual_cost": 45.00,
  "deadline": "2024-05-15",
  "priority": "low | medium | high",
  "status": "pending | in_progress | completed | delivered | cancelled",
  "notes": "string",
  "supplier": { ...SupplierResource },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Note:** Resource maps `description` → `problem_description` and `final_cost` → `actual_cost` and `estimated_delivery_date` → `deadline`.

---

## DB table: `service_orders`
| Column | Type |
|---|---|
| id | bigint PK |
| order_number | varchar unique |
| supplier_id | bigint FK → suppliers.id |
| customer_name | varchar(255) |
| customer_phone | varchar(100) |
| customer_email | varchar(255) nullable |
| service_type | varchar(150) |
| description | text (mapped as problem_description in resource) |
| estimated_cost | decimal(10,2) nullable |
| final_cost | decimal(10,2) nullable (mapped as actual_cost) |
| estimated_delivery_date | date nullable (mapped as deadline) |
| priority | varchar |
| status | varchar default 'pending' |
| notes | text nullable |
| created_at | timestamp |
| updated_at | timestamp |
