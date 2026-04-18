# 10 — Quotes (Cotizaciones)

## Source files
- Controller: `app/Http/Controllers/Api/V1/QuotesController.php`
- Resources: `app/Http/Resources/V1/Quote/QuoteResource.php`, `QuoteItemResource.php`

---

## Middleware: `auth:api`
**Nota:** Las rutas en `routes/api.php` no declaran middleware explícitamente, pero el `QuotesController` aplica `$this->middleware('auth:api')` en su constructor. En Golang, TODOS los endpoints de quotes requieren JWT válido.

---

## Quote Statuses
`draft`, `sent`, `accepted`, `rejected`, `expired`, `converted`

---

## Endpoints

### GET /api/v1/quotes
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated QuoteResource collection

---

### GET /api/v1/quotes/{id}
**Response 200:** QuoteResource (with patient, items, createdBy)

---

### POST /api/v1/quotes
**Request body:**
```json
{
  "patient_id": 1,             // required|exists:patients,id
  "expiration_date": "2024-06-01", // nullable|date
  "notes": "string",           // nullable
  "tax_percentage": 0.0,       // nullable|numeric|min:0|max:100
  "discount_amount": 0.00,     // nullable|numeric|min:0

  "items": [                   // required|array|min:1
    {
      "product_id": 1,         // nullable|exists:products,id
      "name": "string",        // required|string
      "description": "string", // nullable
      "quantity": 1,           // required|integer|min:1
      "price": 150.00,         // required|numeric|min:0
      "discount_amount": 0.00, // nullable|numeric|min:0
      "discount_percentage": 0.0,// nullable|numeric|min:0|max:100
      "original_price": 150.00,// nullable|numeric
      "notes": "string"        // nullable
    }
  ]
}
```
**Response 201:** QuoteResource

---

### PUT /api/v1/quotes/{id}
**Request body:** Same as store, optional.
**Response 200:** QuoteResource

---

### DELETE /api/v1/quotes/{id}
**Response 204:** No content

---

### POST /api/v1/quotes/{id}/status
Update quote status.
**Request body:**
```json
{ "status": "sent" }          // required|in:draft,sent,accepted,rejected,expired,converted
```
**Response 200:** QuoteResource

---

### POST /api/v1/quotes/{id}/convert
Convert quote to sale. Creates a Sale record from this quote.
**Request body:** (optional payment info)
```json
{
  "payments": [
    {
      "payment_method_id": 1,
      "amount": 150.00,
      "payment_date": "2024-05-01"
    }
  ]
}
```
**Response 201:** SaleResource (the newly created sale)

---

### GET /api/v1/quotes/{id}/pdf
Generate and return PDF token/URL for quote.
**Response 200:**
```json
{
  "pdf_token": "string",
  "guest_pdf_url": "https://..."
}
```

---

## QuoteResource shape
```json
{
  "id": 1,
  "quote_number": "COT-001",
  "patient_id": 1,
  "subtotal": 150.00,
  "tax_amount": 0.00,
  "tax_percentage": 0.0,
  "discount_amount": 0.00,
  "total": 150.00,
  "status": "draft | sent | accepted | rejected | expired | converted",
  "expiration_date": "2024-06-01",
  "notes": "string",
  "created_by": 1,
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "patient": { ...PatientResource },
  "items": [ ...QuoteItemResource ],
  "createdBy": { ...UserResource },
  "pdf_token": "string",
  "guest_pdf_url": "https://..."
}
```

## QuoteItemResource shape
```json
{
  "id": 1,
  "quote_id": 1,
  "product_id": 1,
  "quantity": 1,
  "price": 150.00,
  "discount_amount": 0.00,
  "discount_percentage": 0.0,
  "original_price": 150.00,
  "name": "string",
  "description": "string",
  "total": 150.00,
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "product": { ...ProductResource }
}
```

---

## DB tables

### `quotes`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| quote_number | varchar unique | auto-generated |
| patient_id | bigint FK | → patients.id |
| subtotal | decimal(10,2) | |
| tax_amount | decimal(10,2) | |
| tax_percentage | decimal(5,2) | |
| discount_amount | decimal(10,2) | |
| total | decimal(10,2) | |
| status | varchar | draft/sent/accepted/rejected/expired/converted |
| expiration_date | date nullable | |
| notes | text nullable | |
| created_by | bigint FK | → users.id |
| created_at | timestamp | |
| updated_at | timestamp | |

### `quote_items`
| Column | Type |
|---|---|
| id | bigint PK |
| quote_id | bigint FK → quotes.id |
| product_id | bigint FK nullable → products.id |
| name | varchar |
| description | text nullable |
| quantity | int |
| price | decimal(10,2) |
| discount_amount | decimal(10,2) |
| discount_percentage | decimal(5,2) |
| original_price | decimal(10,2) |
| total | decimal(10,2) |
| notes | text nullable |
