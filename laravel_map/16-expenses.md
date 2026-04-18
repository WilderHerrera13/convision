# 16 — Expenses (Gastos)

## Source files
- Controller: `app/Http/Controllers/Api/V1/ExpenseController.php`
- Supplier Payables Controller: `app/Http/Controllers/Api/V1/SupplierPayableController.php`
- Resources: `ExpenseResource`, `ExpenseCollection`

---

## Middleware: `auth:api`

---

## Expense Statuses
`pending`, `partial`, `paid`

---

## Endpoints

### GET /api/v1/expenses/stats
Returns expense statistics.
**Response 200:**
```json
{
  "total_expenses": 5000.00,
  "paid": 3000.00,
  "pending": 2000.00,
  "count": 15
}
```

### GET /api/v1/expenses
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated ExpenseResource collection

### GET /api/v1/expenses/{id}
**Response 200:** ExpenseResource (with supplier, paymentMethod, createdBy)

### POST /api/v1/expenses
```json
{
  "supplier_id": 1,             // required|exists:suppliers,id
  "invoice_number": "FAC-001",  // required|max:255
  "concept": "string",          // required|max:255
  "description": "string",      // nullable
  "expense_date": "2024-05-01", // required|date
  "amount": 500.00,             // required|numeric|min:0.01
  "payment_amount": 500.00,     // nullable|numeric|min:0
  "tax_excluded": false,        // boolean
  "payment_method_id": 1,       // nullable|exists:payment_methods,id
  "reference": "string",        // nullable|max:255
  "notes": "string"             // nullable
}
```
**Response 201:** ExpenseResource

### PUT /api/v1/expenses/{id}
Same body as store, optional.
**Response 200:** ExpenseResource

### DELETE /api/v1/expenses/{id}
**Response 204:** No content

### POST /api/v1/expenses/{expense}/payments
Add a payment to an expense.
```json
{
  "payment_method_id": 1,       // required
  "amount": 500.00,             // required|numeric|min:0.01
  "payment_date": "2024-05-01", // required|date
  "reference": "string",        // nullable
  "notes": "string"             // nullable
}
```
**Response 200:** ExpenseResource

---

## ExpenseResource shape
```json
{
  "id": 1,
  "supplier_id": 1,
  "supplier": { "id": 1, "name": "string", "nit": "string" },
  "invoice_number": "FAC-001",
  "concept": "string",
  "description": "string",
  "expense_date": "2024-05-01",
  "amount": 500.00,
  "payment_amount": 500.00,
  "balance": 0.00,
  "status": "pending | partial | paid",
  "tax_excluded": false,
  "payment_method_id": 1,
  "payment_method": { "id": 1, "name": "Efectivo" },
  "reference": "string",
  "notes": "string",
  "created_by_user_id": 1,
  "created_by": { "id": 1, "name": "string" },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Supplier Payables — GET /api/v1/supplier-payables

Returns a unified view of payables from both purchases and expenses.
**Middleware:** `auth:api`
**Query params:** `supplier_id` (optional), `status` (optional), `per_page`, `page`

**Response 200:** Paginated array of:
```json
{
  "id": 1,
  "type": "purchase | expense",
  "origin_id": 1,
  "supplier": { "id": 1, "name": "string" },
  "invoice_number": "string",
  "concept": "string",
  "total_amount": 500.00,
  "payment_amount": 0.00,
  "balance": 500.00,
  "payment_status": "pending",
  "due_date": "2024-06-01",
  "created_at": "ISO8601"
}
```

---

## DB table: `expenses`
| Column | Type |
|---|---|
| id | bigint PK |
| supplier_id | bigint FK → suppliers.id |
| invoice_number | varchar(255) |
| concept | varchar(255) |
| description | text nullable |
| expense_date | date |
| amount | decimal(10,2) |
| payment_amount | decimal(10,2) default 0 |
| balance | decimal(10,2) |
| status | varchar |
| tax_excluded | boolean default false |
| payment_method_id | bigint FK nullable → payment_methods.id |
| reference | varchar(255) nullable |
| notes | text nullable |
| created_by_user_id | bigint FK → users.id |
| created_at | timestamp |
| updated_at | timestamp |
