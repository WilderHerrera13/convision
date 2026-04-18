# 09 — Sales

## Source files
- Controller: `app/Http/Controllers/Api/V1/SalesController.php`
- Partial Payment Controller: `app/Http/Controllers/Api/V1/PartialPaymentController.php`
- Lens Adj. Controller: `app/Http/Controllers/Api/V1/SaleLensPriceAdjustmentController.php`
- Resources: `SaleResource`, `SaleItemResource`, `SaleStatsResource`, `PartialPaymentResource`, `SaleLensPriceAdjustmentResource`

---

## Middleware: `auth:api`
**Nota:** Las rutas en `routes/api.php` no declaran middleware explícitamente para estos endpoints, pero el `SalesController` aplica `$this->middleware('auth:api')` en su constructor. En Golang, TODOS los endpoints de sales requieren JWT válido.

---

## Sale Statuses
`pending`, `completed`, `cancelled`, `refunded`

## Sale Payment Statuses
`pending`, `partial`, `paid`

---

## Sale Endpoints

### GET /api/v1/sales/stats
Returns aggregated statistics.
**Response 200:**
```json
{ "data": { "total_sales": 100, "total_revenue": 50000.00, ... } }
```

### GET /api/v1/sales/stats/today
Returns today's stats.
**Response 200:** Same shape as above

---

### GET /api/v1/sales
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated SaleResource collection

---

### GET /api/v1/sales/{id}
**Response 200:** SaleResource (with patient, items, createdBy, appointment, laboratory, laboratoryOrders, quote)

---

### POST /api/v1/sales
**Request body:**
```json
{
  "patient_id": 1,            // required|exists:patients,id
  "order_id": 1,              // nullable|exists:orders,id
  "appointment_id": 1,        // nullable|exists:appointments,id
  "subtotal": 130.00,         // required|numeric|min:0
  "tax": 0.00,                // required|numeric|min:0
  "discount": 0.00,           // required|numeric|min:0
  "total": 130.00,            // required|numeric|min:0
  "notes": "string",          // nullable
  "laboratory_id": 1,         // nullable|exists:laboratories,id
  "laboratory_notes": "string",// nullable
  "is_partial_payment": false, // sometimes|boolean
  "contains_lenses": false,    // sometimes|boolean
  "payments": [               // sometimes|array
    {
      "payment_method_id": 1,  // required|exists:payment_methods,id
      "amount": 130.00,        // required|numeric|min:0.01
      "reference_number": "string", // nullable
      "payment_date": "2024-05-01", // required|date
      "notes": "string"        // nullable
    }
  ],
  "lens_items": [             // sometimes|array — lens items (duplicate array, legacy)
    {
      "lens_id": 1,           // required_with:lens_items|exists:products,id
      "quantity": 1,          // required_with:lens_items|integer|min:1
      "price": 130.00         // required_with:lens_items|numeric|min:0
    }
  ],
  "items": [                  // sometimes|array — direct sale items (also accepted)
    {
      "lens_id": 1,           // nullable|exists:products,id
      "quantity": 1,          // sometimes|integer|min:1
      "price": 130.00,        // sometimes|numeric|min:0
      "discount": 0.00,       // sometimes|numeric|min:0
      "total": 130.00         // sometimes|numeric|min:0
    }
  ]
}
// NOTE: `lens_items` and `items` are two parallel arrays accepted by the FormRequest.
// Both refer to products (products.id). `lens_id` is legacy naming for product_id.
```
**Response 201:** SaleResource

---

### PUT /api/v1/sales/{id}
**Request body:** Same as store, optional.
**Response 200:** SaleResource

---

### DELETE /api/v1/sales/{id}
**Response 204:** No content

---

### POST /api/v1/sales/{id}/payments
Add payment to an existing sale.
**Request body:**
```json
{
  "payment_method_id": 1,     // required
  "amount": 50.00,            // required|numeric|min:0.01
  "reference_number": "string",// nullable
  "payment_date": "2024-05-01",// required|date
  "notes": "string"           // nullable
}
```
**Response 200:** SaleResource

---

### DELETE /api/v1/sales/{id}/payments/{paymentId}
Remove a payment from a sale.
**Response 200:** SaleResource

---

### POST /api/v1/sales/{id}/cancel
Cancel a sale.
**Response 200:** SaleResource (with status = "cancelled")

---

### GET /api/v1/sales/{id}/pdf
Returns a redirect or signed URL for PDF download.
**Response 200:** `{ "url": "https://..." }`

---

### GET /api/v1/sales/{id}/pdf-token
Generates a PDF token for guest access.
**Response 200:** `{ "token": "...", "url": "..." }`

---

## SaleResource shape
```json
{
  "id": 1,
  "sale_number": "VTA-001",
  "patient_id": 1,
  "appointment_id": 1,
  "laboratory_id": 1,
  "quote_id": null,
  "subtotal": 130.00,
  "tax": 0.00,
  "discount": 0.00,
  "total": 130.00,
  "status": "pending | completed | cancelled | refunded",
  "payment_status": "pending | partial | paid",
  "notes": "string",
  "created_by": 1,
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "patient": { ...PatientResource },
  "items": [ ...SaleItemResource ],
  "createdBy": { ...UserResource },
  "appointment": { ...AppointmentResource },
  "laboratory": { ...LaboratoryResource },
  "quote": { ...QuoteResource },
  "laboratoryOrders": [ ...LaboratoryOrderResource ],
  "pdf_token": "string",
  "guest_pdf_url": "https://..."
}
```

## SaleItemResource shape
```json
{
  "id": 1,
  "sale_id": 1,
  "lens_id": 1,
  "description": "Lente monofocal CR-39",
  "quantity": 1,
  "unit_price": 130.00,
  "price": 130.00,
  "discount": 0.00,
  "total": 130.00,
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "lens": { ...ProductResource }
}
```

---

## Lens Price Adjustments Endpoints

**Middleware:** `auth:api` + `role:admin,receptionist` (admin and receptionist only — enforced in `SaleLensPriceAdjustmentController` constructor)

### Business rules (enforced by `LensPricingService`)
1. **Price can only go UP** — `adjusted_price` must be strictly greater than the lens base price. Decreasing prices is not allowed via this flow; use the discounts system (`/discounts`) instead. Violation throws `InvalidArgumentException` with message: *"No se permite disminuir el precio..."*.
2. **One adjustment per lens per sale** — only one `SaleLensPriceAdjustment` can exist per `(sale_id, lens_id)` pair. Attempting to create a second one throws `InvalidArgumentException`: *"Ya existe un ajuste de precio para este lente en esta venta."*
3. **Effective price** — `LensPricingService::getEffectivePrice(sale, lens)` returns `adjusted_price` if an adjustment exists, otherwise `lens.price`. This is the value used when building sale item totals.

### GET /api/v1/sales/{sale}/lens-price-adjustments
**Response 200:** Array of SaleLensPriceAdjustmentResource

### POST /api/v1/sales/{sale}/lens-price-adjustments
```json
{
  "lens_id": 1,            // required|exists:products,id
  "adjusted_price": 120.00,// required|numeric|min:0 — MUST be > lens.price
  "reason": "string"       // nullable
}
```
**Response 201:** SaleLensPriceAdjustmentResource
**Response 422:** If `adjusted_price <= lens.price` or adjustment already exists.

### GET /api/v1/sales/{sale}/lens-price-adjustments/{adjustment}
**Response 200:** SaleLensPriceAdjustmentResource

### DELETE /api/v1/sales/{sale}/lens-price-adjustments/{adjustment}
**Response 204:** No content

### GET /api/v1/sales/{sale}/lenses/{lens}/adjusted-price
Returns the adjusted price for a specific lens in a sale.
**Response 200:**
```json
{ "original_price": 150.00, "adjusted_price": 120.00, "adjustment_amount": -30.00 }
```

## SaleLensPriceAdjustmentResource shape
```json
{
  "id": 1,
  "sale_id": 1,
  "lens_id": 1,
  "base_price": 150.00,
  "adjusted_price": 120.00,
  "adjustment_amount": -30.00,
  "reason": "string",
  "adjusted_by": 1,
  "lens": { ...ProductResource },
  "adjustedBy": { ...UserResource },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Partial Payments (Abonos) Endpoints

### GET /api/v1/sales/{saleId}/partial-payments
**Response 200:** Array of PartialPaymentResource

### POST /api/v1/sales/{saleId}/partial-payments
```json
{
  "payment_method_id": 1,       // required|exists:payment_methods,id
  "amount": 50.00,              // required|numeric|min:0.01
  "reference_number": "string", // nullable
  "payment_date": "2024-05-01", // required|date
  "notes": "string"             // nullable
}
```
**Response 201:** PartialPaymentResource

### GET /api/v1/partial-payments/{id}
**Response 200:** PartialPaymentResource

### DELETE /api/v1/sales/{saleId}/partial-payments/{paymentId}
**Response 204:** No content

## PartialPaymentResource shape
```json
{
  "id": 1,
  "sale_id": 1,
  "payment_method_id": 1,
  "amount": 50.00,
  "reference_number": "string",
  "payment_date": "2024-05-01",
  "notes": "string",
  "created_by": 1,
  "payment_method": { ...PaymentMethodResource },
  "created_by_user": { ...UserResource },
  "sale": { ...SaleResource },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## DB tables

### `sales`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| sale_number | varchar unique | auto-generated |
| patient_id | bigint FK | → patients.id |
| appointment_id | bigint FK nullable | → appointments.id |
| laboratory_id | bigint FK nullable | → laboratories.id |
| quote_id | bigint FK nullable | → quotes.id |
| subtotal | decimal(10,2) | |
| tax | decimal(10,2) | |
| discount | decimal(10,2) | |
| total | decimal(10,2) | |
| balance | decimal(10,2) | remaining amount |
| status | varchar | pending/completed/cancelled/refunded |
| payment_status | varchar | pending/partial/paid |
| notes | text nullable | |
| created_by | bigint FK | → users.id |
| created_at | timestamp | |
| updated_at | timestamp | |

### `sale_items`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| sale_id | bigint FK | → sales.id |
| lens_id | bigint FK nullable | → products.id |
| quantity | int | |
| price | decimal(10,2) | |
| discount | decimal(10,2) | |
| total | decimal(10,2) | |
| notes | text nullable | |

### `sale_payments`
| Column | Type |
|---|---|
| id | bigint PK |
| sale_id | bigint FK → sales.id |
| payment_method_id | bigint FK |
| amount | decimal(10,2) |
| reference_number | varchar nullable |
| payment_date | date |
| notes | text nullable |

### `partial_payments`
| Column | Type |
|---|---|
| id | bigint PK |
| sale_id | bigint FK → sales.id |
| payment_method_id | bigint FK |
| amount | decimal(10,2) |
| reference_number | varchar nullable |
| payment_date | date |
| notes | text nullable |
| created_by | bigint FK → users.id |

### `sale_lens_price_adjustments`
| Column | Type |
|---|---|
| id | bigint PK |
| sale_id | bigint FK → sales.id |
| lens_id | bigint FK → products.id |
| base_price | decimal(10,2) |
| adjusted_price | decimal(10,2) |
| adjustment_amount | decimal(10,2) |
| reason | text nullable |
| adjusted_by | bigint FK → users.id |
