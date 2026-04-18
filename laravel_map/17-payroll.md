# 17 — Payroll (Nómina)

## Source files
- Controller: `app/Http/Controllers/Api/V1/PayrollController.php`
- Resources: `PayrollResource`, `PayrollCollection`

---

## Middleware: `auth:api`

---

## Payroll Statuses
`pending`, `paid`, `cancelled`

---

## Endpoints

### GET /api/v1/payrolls/stats
**Response 200:**
```json
{
  "total_payrolls": 10,
  "total_net_salary": 50000.00,
  "paid_count": 8,
  "pending_count": 2
}
```

### POST /api/v1/payrolls/calculate
Calculate payroll totals before saving.
**Request body:** Same as store.
**Response 200:** PayrollResource-like object with calculated values

### GET /api/v1/payrolls
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated PayrollResource collection

### GET /api/v1/payrolls/{id}
**Response 200:** PayrollResource

### POST /api/v1/payrolls
```json
{
  "employee_name": "string",        // required|max:255
  "employee_identification": "string",// required|max:255
  "employee_position": "string",    // required|max:255
  "pay_period_start": "2024-05-01", // required|date
  "pay_period_end": "2024-05-31",   // required|date|after_or_equal:start
  "base_salary": 3000.00,           // required|numeric|min:0
  "overtime_hours": 10,             // nullable|numeric|min:0
  "overtime_rate": 25.00,           // nullable|numeric|min:0
  "bonuses": 200.00,                // nullable|numeric|min:0
  "commissions": 150.00,            // nullable|numeric|min:0
  "other_income": 0.00,             // nullable|numeric|min:0
  "health_deduction": 120.00,       // nullable|numeric|min:0
  "pension_deduction": 120.00,      // nullable|numeric|min:0
  "tax_deduction": 50.00,           // nullable|numeric|min:0
  "other_deductions": 0.00,         // nullable|numeric|min:0
  "payment_date": "2024-06-01",     // nullable|date
  "payment_method_id": 1,           // nullable|exists:payment_methods,id
  "reference": "string",            // nullable|max:255
  "notes": "string",                // nullable
  "status": "pending"               // nullable|in:pending,paid,cancelled
}
```
Calculated server-side:
- `overtime_amount = overtime_hours * overtime_rate`
- `gross_salary = base_salary + overtime_amount + bonuses + commissions + other_income`
- `total_deductions = health + pension + tax + other_deductions`
- `net_salary = gross_salary - total_deductions`

**Response 201:** PayrollResource

### PUT /api/v1/payrolls/{id}
**Response 200:** PayrollResource

### DELETE /api/v1/payrolls/{id}
**Response 204:** No content

---

## PayrollResource shape
```json
{
  "id": 1,
  "employee_name": "string",
  "employee_identification": "string",
  "employee_position": "string",
  "pay_period_start": "2024-05-01",
  "pay_period_end": "2024-05-31",
  "base_salary": 3000.00,
  "overtime_hours": 10,
  "overtime_rate": 25.00,
  "overtime_amount": 250.00,
  "bonuses": 200.00,
  "commissions": 150.00,
  "other_income": 0.00,
  "gross_salary": 3600.00,
  "health_deduction": 120.00,
  "pension_deduction": 120.00,
  "tax_deduction": 50.00,
  "other_deductions": 0.00,
  "total_deductions": 290.00,
  "net_salary": 3310.00,
  "payment_date": "2024-06-01",
  "payment_method_id": 1,
  "payment_method": { ...PaymentMethodResource },
  "reference": "string",
  "notes": "string",
  "status": "pending | paid | cancelled",
  "created_by_user_id": 1,
  "created_by": { ...UserResource },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```
