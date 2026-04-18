# 14 — Discount Requests

## Source files
- Controller: `app/Http/Controllers/Api/V1/DiscountRequestController.php`
- Resources: `DiscountRequestResource`, `DiscountRequestCollection`, `DiscountResource`

---

## Middleware: `auth:api`

---

## Discount Request Statuses
`pending`, `approved`, `rejected`, `expired`

---

## Endpoints

### GET /api/v1/discount-requests
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated DiscountRequestResource collection

### GET /api/v1/discount-requests/{id}
**Response 200:** DiscountRequestResource

### POST /api/v1/discount-requests
```json
{
  "product_id": 1,              // required|exists:products,id
  "patient_id": 1,              // nullable|exists:patients,id (null if is_global)
  "discount_percentage": 15.0,  // required|numeric|min:0.01|max:100
  "reason": "string",           // nullable|max:500
  "expiry_date": "2024-06-01",  // nullable|date|after_or_equal:today
  "is_global": false            // nullable|boolean (default: false)
}
```
If `is_global=true`, `patient_id` is set to null automatically.
**Response 201:** DiscountRequestResource

### PUT /api/v1/discount-requests/{id}
Same body as store, optional.
**Response 200:** DiscountRequestResource

### DELETE /api/v1/discount-requests/{id}
**Response 204:** No content

### POST /api/v1/discount-requests/{discount_request}/approve
**Auth:** admin only (implied by business logic, may not have explicit middleware)
**Request body:**
```json
{
  "approval_notes": "string",    // nullable
  "expiry_date": "2024-06-01"   // nullable|date
}
```
Sets `status = "approved"`, `approved_at = now()`, `approver_id = auth user`.
**Response 200:** DiscountRequestResource

### POST /api/v1/discount-requests/{discount_request}/reject
**Request body:**
```json
{ "rejection_reason": "string" } // nullable
```
Sets `status = "rejected"`.
**Response 200:** DiscountRequestResource

### GET /api/v1/active-discounts
Returns all approved, non-expired discounts.
**Query params:** `product_id` (optional), `patient_id` (optional)
**Response 200:** Array of DiscountRequestResource

---

## DiscountRequestResource shape
```json
{
  "id": 1,
  "status": "pending | approved | rejected | expired",
  "discount_percentage": 15.0,
  "original_price": 150.00,
  "discounted_price": 127.50,
  "reason": "string",
  "rejection_reason": "string",
  "approval_notes": "string",
  "is_global": false,
  "expiry_date": "2024-06-01",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "approved_at": "ISO8601",
  "product": { ...ProductResource },
  "patient": { ...PatientResource },
  "user": { ...UserResource },
  "approver": { ...UserResource }
}
```

---

## DB table: `discount_requests`
| Column | Type |
|---|---|
| id | bigint PK |
| product_id | bigint FK → products.id |
| patient_id | bigint FK nullable → patients.id |
| user_id | bigint FK → users.id (requester) |
| approver_id | bigint FK nullable → users.id |
| status | varchar |
| discount_percentage | decimal(5,2) |
| original_price | decimal(10,2) |
| discounted_price | decimal(10,2) |
| reason | text nullable |
| rejection_reason | text nullable |
| approval_notes | text nullable |
| is_global | boolean default false |
| expiry_date | date nullable |
| approved_at | timestamp nullable |
| created_at | timestamp |
| updated_at | timestamp |
