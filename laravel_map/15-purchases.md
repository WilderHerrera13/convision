# 15 — Purchases (Compras a Proveedores)

## Source files
- Controller: `app/Http/Controllers/Api/V1/PurchaseController.php`
- Resources: `PurchaseResource`, `PurchaseItemResource`, `PurchasePaymentResource`, `PurchaseCollection`

---

## Middleware: `auth:api`

---

## Purchase Payment Statuses
`pending`, `partial`, `paid`

## Purchase Statuses
`pending`, `received`, `cancelled`

---

## Endpoints

### GET /api/v1/purchases
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated PurchaseResource collection

### GET /api/v1/purchases/{id}
**Response 200:** PurchaseResource (with supplier, items, payments, createdBy)

### POST /api/v1/purchases/calculate-totals
Calculate totals before creating purchase.
**Request body:** partial purchase data (same fields as store)
**Response 200:** `{ "subtotal": 100.00, "tax_amount": 19.00, "total_amount": 119.00 }`

### POST /api/v1/purchases
```json
{
  "supplier_id": 1,             // required|exists:suppliers,id
  "purchase_date": "2024-05-01",// required|date
  "invoice_number": "FAC-001",  // required|max:255
  "concept": "string",          // required|max:255
  "subtotal": 100.00,           // required|numeric|min:0
  "tax_amount": 19.00,          // nullable|numeric|min:0
  "retention_amount": 0.00,     // nullable|numeric|min:0
  "total_amount": 119.00,       // required|numeric|min:0
  "tax_excluded": false,        // boolean
  "invoice_file": "string",     // nullable (path)
  "notes": "string",            // nullable
  "payment_due_date": "2024-06-01",// nullable|date

  "items": [                    // required|array|min:1
    {
      "product_id": 1,          // nullable|exists:products,id
      "product_code": "string", // nullable
      "product_description": "string", // required
      "quantity": 10,           // required|numeric|min:0.01
      "unit_price": 10.00,      // required|numeric|min:0
      "subtotal": 100.00,       // required|numeric|min:0
      "tax_rate": 19.0,         // nullable|numeric|min:0|max:100
      "tax_amount": 19.00,      // nullable|numeric|min:0
      "total": 119.00,          // required|numeric|min:0
      "notes": "string"         // nullable
    }
  ],

  "payments": [                 // nullable|array
    {
      "payment_method_id": 1,   // required|exists:payment_methods,id
      "amount": 119.00,         // required|numeric|min:0.01
      "payment_date": "2024-05-01", // required|date
      "reference": "string",    // nullable|max:255
      "notes": "string"         // nullable
    }
  ]
}
```
**Response 201:** PurchaseResource

### PUT /api/v1/purchases/{id}
Same body as store, optional.
**Response 200:** PurchaseResource

### DELETE /api/v1/purchases/{id}
**Response 204:** No content

### POST /api/v1/purchases/{purchase}/payments
Add a payment to a purchase.
```json
{
  "payment_method_id": 1,
  "amount": 119.00,
  "payment_date": "2024-05-01",
  "reference": "string",
  "notes": "string"
}
```
**Response 200:** PurchaseResource

---

## PurchaseResource shape
```json
{
  "id": 1,
  "supplier_id": 1,
  "supplier": { "id": 1, "name": "string", "nit": "string" },
  "purchase_date": "2024-05-01",
  "invoice_number": "FAC-001",
  "concept": "string",
  "subtotal": 100.00,
  "tax_amount": 19.00,
  "retention_amount": 0.00,
  "total_amount": 119.00,
  "payment_amount": 119.00,
  "balance": 0.00,
  "payment_status": "pending | partial | paid",
  "status": "pending | received | cancelled",
  "tax_excluded": false,
  "invoice_file": "string",
  "notes": "string",
  "payment_due_date": "2024-06-01",
  "created_by_user_id": 1,
  "created_by": { "id": 1, "name": "string" },
  "items": [ ...PurchaseItemResource ],
  "payments": [ ...PurchasePaymentResource ],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## DB tables

### `purchases`
| Column | Type |
|---|---|
| id | bigint PK |
| supplier_id | bigint FK → suppliers.id |
| purchase_date | date |
| invoice_number | varchar(255) |
| concept | varchar(255) |
| subtotal | decimal(10,2) |
| tax_amount | decimal(10,2) |
| retention_amount | decimal(10,2) |
| total_amount | decimal(10,2) |
| payment_amount | decimal(10,2) default 0 |
| balance | decimal(10,2) |
| payment_status | varchar |
| status | varchar |
| tax_excluded | boolean default false |
| invoice_file | varchar nullable |
| notes | text nullable |
| payment_due_date | date nullable |
| created_by_user_id | bigint FK → users.id |
| created_at | timestamp |
| updated_at | timestamp |

### `purchase_items`
| Column | Type |
|---|---|
| id | bigint PK |
| purchase_id | bigint FK → purchases.id |
| product_id | bigint FK nullable → products.id |
| product_code | varchar nullable |
| product_description | varchar |
| quantity | decimal(10,2) |
| unit_price | decimal(10,2) |
| subtotal | decimal(10,2) |
| tax_rate | decimal(5,2) nullable |
| tax_amount | decimal(10,2) nullable |
| total | decimal(10,2) |
| notes | text nullable |

### `purchase_payments`
| Column | Type |
|---|---|
| id | bigint PK |
| purchase_id | bigint FK → purchases.id |
| payment_method_id | bigint FK |
| amount | decimal(10,2) |
| payment_date | date |
| reference | varchar(255) nullable |
| notes | text nullable |
| created_by_user_id | bigint FK → users.id |
