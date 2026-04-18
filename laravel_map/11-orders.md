# 11 — Orders (Órdenes de Venta)

## Source files
- Controller: `app/Http/Controllers/Api/V1/OrderController.php`
- PDF Controllers: `app/Http/Controllers/Api/V1/OrderPDFController.php`, `LaboratoryOrderPDFController.php`
- Resources: `OrderResource`, `OrderItemResource`, `OrderCollection`

---

## Middleware: `auth:api`
**Nota:** Las rutas en `routes/api.php` no declaran middleware explícitamente, pero el `OrderController` aplica `$this->middleware('auth:api')` en su constructor. En Golang, TODOS los endpoints de orders requieren JWT válido.

---

## Order Statuses
`pending`, `in_progress`, `completed`, `cancelled`

## Order Payment Statuses
`pending`, `partial`, `paid`

---

## Endpoints

### GET /api/v1/orders
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated OrderResource collection

---

### GET /api/v1/orders/{id}
**Response 200:** OrderResource (with patient, items, createdBy, appointment, laboratory)

---

### POST /api/v1/orders
**Request body:**
```json
{
  "patient_id": 1,            // required|exists:patients,id
  "appointment_id": 1,        // nullable|exists:appointments,id
  "laboratory_id": 1,         // nullable|exists:laboratories,id
  "tax_percentage": 0.0,      // nullable|numeric|min:0|max:100
  "tax_amount": 0.00,         // nullable|numeric|min:0
  "status": "pending",        // nullable|in: all Order statuses
  "payment_status": "pending",// nullable|in: all payment statuses
  "notes": "string",          // nullable|max:1000

  "items": [                  // required|array|min:1
    {
      "product_id": 1,        // required|exists:products,id
      "quantity": 1,          // required|integer|min:1
      "notes": "string"       // nullable|max:500
    }
  ]
}
```
Price is calculated server-side from product.price (with discount logic if applicable).

**Response 201:** OrderResource

---

### PUT /api/v1/orders/{id}
**Request body:** Same as store, optional.
**Response 200:** OrderResource

---

### DELETE /api/v1/orders/{id}
**Response 204:** No content

---

### POST /api/v1/orders/{order}/status
Update order status.
**Request body:**
```json
{ "status": "in_progress" }   // required|in: Order statuses
```
**Response 200:** OrderResource

---

### POST /api/v1/orders/{order}/payment-status
Update payment status.
**Request body:**
```json
{ "payment_status": "paid" }  // required|in: payment statuses
```
**Response 200:** OrderResource

---

### GET /api/v1/orders/{id}/pdf
Generates PDF token and redirects or returns download URL.
**Response 200:** `{ "url": "https://..." }` or redirect

---

### GET /api/v1/orders/{id}/pdf-download
Download order PDF via token (used by PDF viewer, no auth needed).
**Query params:** `token` (required)
**Response 200:** PDF file (Content-Type: application/pdf)

---

### GET /api/v1/orders/{id}/laboratory-pdf
Generate laboratory order PDF (if laboratory_id set).
**Response 200:** PDF file or URL

---

### GET /api/v1/orders/{id}/laboratory-pdf-download
Download laboratory PDF via token.
**Query params:** `token` (required)
**Response 200:** PDF file

---

## OrderResource shape
```json
{
  "id": 1,
  "order_number": "ORD-001",
  "patient_id": 1,
  "appointment_id": 1,
  "laboratory_id": 1,
  "subtotal": 150.00,
  "tax": 0.00,
  "total": 150.00,
  "status": "pending | in_progress | completed | cancelled",
  "payment_status": "pending | partial | paid",
  "notes": "string",
  "created_by": 1,
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "patient": { ...PatientResource },
  "items": [ ...OrderItemResource ],
  "createdBy": { ...UserResource },
  "appointment": { ...AppointmentResource },
  "laboratory": { ...LaboratoryResource },
  "pdf_token": "string",
  "lab_pdf_token": "string",
  "guest_pdf_url": "https://...",
  "guest_lab_pdf_url": "https://..."
}
```

## OrderItemResource shape
```json
{
  "id": 1,
  "order_id": 1,
  "product_id": 1,
  "product_type": "string",
  "name": "string",
  "description": "string",
  "quantity": 1,
  "price": 150.00,
  "original_price": 150.00,
  "discount_percentage": 0.0,
  "discount_id": null,
  "total": 150.00,
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "product": { ...ProductResource }
}
```

---

## DB tables

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| order_number | varchar unique | auto-generated |
| patient_id | bigint FK | → patients.id |
| appointment_id | bigint FK nullable | → appointments.id |
| laboratory_id | bigint FK nullable | → laboratories.id |
| subtotal | decimal(10,2) | |
| tax | decimal(10,2) | |
| total | decimal(10,2) | |
| status | varchar | |
| payment_status | varchar | |
| notes | text nullable | |
| created_by | bigint FK | → users.id |
| created_at | timestamp | |
| updated_at | timestamp | |

### `order_items`
| Column | Type |
|---|---|
| id | bigint PK |
| order_id | bigint FK → orders.id |
| product_id | bigint FK → products.id |
| product_type | varchar nullable |
| name | varchar |
| description | text nullable |
| quantity | int |
| price | decimal(10,2) |
| original_price | decimal(10,2) |
| discount_percentage | decimal(5,2) |
| discount_id | bigint FK nullable |
| total | decimal(10,2) |
| notes | text nullable |
