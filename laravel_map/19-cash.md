# 19 — Cash Transfers & Cash Register Closes

## Source files
- Controllers: `CashTransferController.php`, `CashRegisterCloseController.php`
- Resources: `CashTransferResource`, `CashRegisterCloseResource`

---

## Part A: Cash Transfers

### Middleware: `auth:api`

### Cash Transfer Statuses
`pending`, `approved`, `cancelled`

### GET /api/v1/cash-transfers/stats
**Response 200:** `{ "pending": 3, "approved": 10, "cancelled": 2, "total_amount": 5000.00 }`

### GET /api/v1/cash-transfers
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated CashTransferResource collection

### GET /api/v1/cash-transfers/{id}
**Response 200:** CashTransferResource (with createdBy, approvedBy)

### POST /api/v1/cash-transfers
Validated inline in controller (no dedicated FormRequest class):
```json
{
  "origin_type": "string",           // required (e.g. "caja", "banco")
  "origin_description": "string",    // required
  "destination_type": "string",      // required
  "destination_description": "string",// required
  "amount": 1000.00,                 // required|numeric|min:0.01
  "reason": "string",                // required
  "notes": "string"                  // nullable
}
```
**Response 201:** CashTransferResource

### PUT /api/v1/cash-transfers/{id}
Same body as store, optional.
**Response 200:** CashTransferResource

### DELETE /api/v1/cash-transfers/{id}
**Response 204:** No content

### POST /api/v1/cash-transfers/{cashTransfer}/approve
```json
{ "notes": "string" }  // nullable
```
Sets `status = "approved"`, `approved_by = auth user`, `approved_at = now()`.
**Response 200:** CashTransferResource

### POST /api/v1/cash-transfers/{cashTransfer}/cancel
```json
{ "notes": "string" }  // nullable
```
Sets `status = "cancelled"`.
**Response 200:** CashTransferResource

### CashTransferResource shape
```json
{
  "id": 1,
  "transfer_number": "CT-001",
  "origin_type": "string",
  "origin_description": "string",
  "destination_type": "string",
  "destination_description": "string",
  "amount": 1000.00,
  "reason": "string",
  "status": "pending | approved | cancelled",
  "notes": "string",
  "requested_by": { ...UserResource },
  "approved_by": { ...UserResource },
  "approved_at": "ISO8601",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Part B: Cash Register Closes (Cierres de Caja)

### Middleware: `auth:api` (some sub-routes: `role:admin`)

### Cash Register Close Statuses
`draft`, `submitted`, `approved`, `returned`

### Allowed Payment Method Names
`efectivo`, `voucher`, `bancolombia`, `daviplata`, `nequi`, `addi`, `sistecredito`, `anticipo`, `bono`, `pago_sistecredito`

### Allowed Denomination Values (COP)
`100000`, `50000`, `20000`, `10000`, `5000`, `2000`, `1000`, `500`, `200`, `100`, `50`

---

### GET /api/v1/cash-register-closes
**Middleware:** `auth:api`
**Filterable:** Yes. **Paginated:** Yes.
**Note:** Admin sees all closes; non-admin advisors see only their own.
**Response 200:** Paginated CashRegisterCloseResource collection

### GET /api/v1/cash-register-closes/{id}
**Response 200:** CashRegisterCloseResource (admin gets full reconciliation; advisor gets own view)

### POST /api/v1/cash-register-closes
```json
{
  "close_date": "2024-05-31",          // required|date|date_format:Y-m-d|before_or_equal:today
  "payment_methods": [                 // required|array (all allowed methods)
    { "name": "efectivo", "counted_amount": 500.00 },
    { "name": "voucher", "counted_amount": 0.00 }
    // ...one entry per allowed method name
  ],
  "denominations": [                   // nullable|array
    { "denomination": 50000, "quantity": 5 },
    { "denomination": 10000, "quantity": 3 }
  ],
  "advisor_notes": "string"            // nullable|max:2000
}
```
**Response 201:** CashRegisterCloseResource

### PUT /api/v1/cash-register-closes/{id}
Same body as store. Only allowed when status = `draft`.
**Response 200:** CashRegisterCloseResource

### DELETE /api/v1/cash-register-closes/{id}
**Response 204:** No content

### POST /api/v1/cash-register-closes/{id}/submit
No request body. Sets `status = "submitted"`.
**Response 200:** CashRegisterCloseResource

### POST /api/v1/cash-register-closes/{id}/approve
**Middleware:** `role:admin`
**Precondition:** admin actuals must have been recorded (`admin_actuals_recorded_at != null`).
```json
{ "admin_notes": "string" }  // nullable|max:1000
```
Sets `status = "approved"`.
**Response 200:** CashRegisterCloseResource

### POST /api/v1/cash-register-closes/{id}/return
**Middleware:** `role:admin`
```json
{ "admin_notes": "string" }  // nullable|max:1000
```
Returns close to `draft` status.
**Response 200:** CashRegisterCloseResource

### PUT /api/v1/cash-register-closes/{id}/admin-actuals
**Middleware:** `role:admin`
```json
{
  "actual_payment_methods": [  // required|array|size:N (one entry per allowed method)
    { "name": "efectivo", "actual_amount": 480.00 },
    { "name": "voucher", "actual_amount": 0.00 }
    // one row per allowed payment method, no duplicates
  ]
}
```
Sets `admin_actuals_recorded_at = now()`.
**Response 200:** CashRegisterCloseResource

### GET /api/v1/cash-register-closes-advisors-pending
**Middleware:** `role:admin`
Returns all close records in `submitted` status (pending admin review).
**Response 200:** Paginated CashRegisterCloseResource collection

### GET /api/v1/cash-register-closes-advisors-pending
**Middleware:** `role:admin`
Returns all close records in `submitted` status (pending admin review).
**Response 200:** Paginated CashRegisterCloseResource collection

### GET /api/v1/cash-register-closes-calendar
**Middleware:** `role:admin`
⚠️ Despite the name `calendarForAdvisor`, this endpoint is admin-only (enforced by `middleware('role:admin')` in routes/api.php).
Admin can pass a `user_id` query param to view a specific advisor's calendar.
**Response 200:** Array of `{ "date": "Y-m-d", "status": "draft|submitted|approved|returned", "id": 1 }`

---

### CashRegisterCloseResource shape
```json
{
  "id": 1,
  "close_date": "2024-05-31",
  "status": "draft | submitted | approved | returned",
  "advisor_notes": "string",
  "admin_notes": "string",
  "payment_methods": [
    { "name": "efectivo", "counted_amount": 500.00 }
  ],
  "denominations": [
    { "denomination": 50000, "quantity": 5 }
  ],
  "created_by": { ...UserResource },
  "approved_by": { ...UserResource },
  "submitted_at": "ISO8601",
  "approved_at": "ISO8601",
  "admin_actuals_recorded_at": "ISO8601",

  // Admin-only fields (not visible for advisor role):
  "total_actual_amount": 480.00,
  "reconciliation": {
    "totals": {
      "counted": 500.00,
      "actual": 480.00,
      "difference": -20.00
    },
    "payment_methods": [
      {
        "name": "efectivo",
        "counted_amount": 500.00,
        "actual_amount": 480.00,
        "difference": -20.00
      }
    ]
  },

  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```
