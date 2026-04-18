# 27 — Database Schema Index

Complete list of all DB tables in Convision. Use this as a reference map when implementing Golang models and migrations.

---

## Core Tables

| Table | Module MD | Notes |
|---|---|---|
| `users` | 02-users | Roles: admin, specialist, receptionist, laboratory |
| `patients` | 03-patients | Has soft deletes |
| `appointments` | 04-appointments | Status flow |
| `prescriptions` | 05-prescriptions | Ophthalmic data |
| `clinical_histories` | 06-clinical | Patient's medical background |
| `clinical_evolutions` | 06-clinical | SOAP notes per appointment |

---

## Catalog Tables

| Table | Module MD |
|---|---|
| `brands` | 07-catalog |
| `lens_types` | 07-catalog |
| `materials` | 07-catalog |
| `lens_classes` | 07-catalog |
| `treatments` | 07-catalog |
| `photochromics` | 07-catalog |
| `payment_methods` | 07-catalog |
| `product_categories` | 08-products |

---

## Product Tables

| Table | Module MD | Notes |
|---|---|---|
| `products` | 08-products | Main products table (lenses, frames, contacts) |
| `product_lens_attributes` | 08-products | Lens-specific fields |
| `product_frame_attributes` | 08-products | Frame-specific fields |
| `product_contact_lens_attributes` | 08-products | Contact lens fields |

---

## Sales / Commercial Tables

| Table | Module MD | Notes |
|---|---|---|
| `sales` | 09-sales | |
| `sale_items` | 09-sales | |
| `sale_payments` | 09-sales | |
| `sale_lens_price_adjustments` | 09-sales | |
| `partial_payments` | 09-sales | Advance payments |
| `quotes` | 10-quotes | |
| `quote_items` | 10-quotes | |
| `orders` | 11-orders | Prescription lens orders |
| `order_items` | 11-orders | |
| `discount_requests` | 14-discounts | |

---

## Laboratory Tables

| Table | Module MD |
|---|---|
| `laboratories` | 12-laboratory |
| `laboratory_orders` | 12-laboratory |
| `laboratory_order_statuses` | 12-laboratory |

---

## Inventory Tables

| Table | Module MD |
|---|---|
| `warehouses` | 13-inventory |
| `warehouse_locations` | 13-inventory |
| `inventory_items` | 13-inventory |
| `inventory_transfers` | 13-inventory |

---

## Finance Tables

| Table | Module MD | Notes |
|---|---|---|
| `purchases` | 15-purchases | From suppliers |
| `purchase_items` | 15-purchases | |
| `purchase_payments` | 15-purchases | |
| `expenses` | 16-expenses | Gasto/factura de proveedor |
| `payrolls` | 17-payroll | Employee salary records |
| `service_orders` | 18-service-orders | Repair orders |
| `cash_transfers` | 19-cash | Internal money transfers |
| `cash_register_closes` | 19-cash | Advisor daily closes |
| `cash_register_close_payments` | 19-cash | Counted amounts per payment method |
| `cash_count_denominations` | 19-cash | Bill/coin denomination counts |
| `cash_register_close_actual_payments` | 19-cash | Admin-recorded actual amounts |

---

## Provider / Geographic Tables

| Table | Module MD |
|---|---|
| `suppliers` | 20-suppliers |
| `countries` | 25-locations |
| `departments` | 25-locations |
| `cities` | 25-locations |
| `districts` | 25-locations |

---

## Patient Lookup Tables

| Table | Module MD |
|---|---|
| `identification_types` | 03-patients |
| `health_insurance_providers` | 03-patients |
| `affiliation_types` | 03-patients |
| `coverage_types` | 03-patients |
| `education_levels` | 03-patients |

---

## Support Tables

| Table | Module MD | Notes |
|---|---|---|
| `notes` | 24-notes | Polymorphic (lenses, appointments) |
| `admin_user_notifications` | 22-notifications | |
| `daily_activity_reports` | 23-daily-activity | |

---

## Laravel System Tables (replicate if needed)

| Table | Notes |
|---|---|
| `migrations` | Laravel migration tracking |
| `failed_jobs` | Queue failed jobs |
| `personal_access_tokens` | Sanctum tokens (not used, JWT instead) |

---

## Deprecated / Legacy Tables (DO NOT migrate to Golang)

These tables and their corresponding models exist in the Laravel codebase but are **no longer in active use**. They predate the Lens → Product migration. Do not create Golang equivalents.

| Table | Laravel Model | Status | Notes |
|---|---|---|---|
| `lenses` | `App\Models\Lens` | **Deprecated** | Replaced by `products` + `product_lens_attributes`. Some old FK references may still exist in the DB. |
| `lens_notes` | `App\Models\LensNote` | **Dead code** | `LensNoteController` is imported in `routes/api.php` but **no routes are registered** for it. The controller and service exist but are unreachable. |

### Migration service
`App\Services\LensToProductMigrationService` — one-time batch service that migrated records from `lenses` to `products`+`product_lens_attributes`. This service explains why both tables may coexist in the DB during partial migrations. **Do not expose as a Golang endpoint.**

---

## Key Relationships Summary

```
users
  └── appointments (taken_by_id, patient_id)
  └── prescriptions (specialist_id)
  └── sales (created_by_user_id)
  └── orders (created_by_user_id)
  └── laboratory_orders (created_by_user_id, specialist_id)
  └── notes (user_id)
  └── daily_activity_reports (user_id)
  └── cash_register_closes (created_by_user_id, approved_by_user_id)
  └── cash_transfers (created_by_user_id, approved_by_user_id)
  └── discount_requests (user_id, approver_id)
  └── payrolls (created_by_user_id)
  └── purchases (created_by_user_id)
  └── expenses (created_by_user_id)

patients
  └── appointments (patient_id)
  └── clinical_histories (patient_id)
  └── sales (patient_id)
  └── orders (patient_id)
  └── quotes (patient_id)
  └── laboratory_orders (patient_id)
  └── discount_requests (patient_id)
  └── partial_payments (patient_id)

products (lenses)
  └── orders.items (product_id)
  └── sale_items (product_id)
  └── quote_items (product_id)
  └── inventory_items (product_id)
  └── discount_requests (product_id)
  └── notes [polymorphic as lenses]
  └── product_lens_attributes (product_id)
  └── product_frame_attributes (product_id)
  └── product_contact_lens_attributes (product_id)

suppliers
  └── purchases (supplier_id)
  └── expenses (supplier_id)
  └── service_orders (supplier_id)

warehouses
  └── warehouse_locations (warehouse_id)
  └── inventory_items → via warehouse_location

appointments
  └── prescriptions (appointment_id)
  └── clinical_evolutions (appointment_id)
  └── notes [polymorphic as appointments]
  └── sales (appointment_id)
```

---

## Notes on Auth

- **JWT** via `tymon/jwt-auth`, guard `auth:api`
- Token issued on `POST /api/v1/auth/login`
- Custom claim: `{ "role": "admin|specialist|receptionist|laboratory" }`
- No token expiry refresh by default (configurable in `config/jwt.php`)
- Role middleware reads from token claim, not DB lookup

## Golang Implementation Notes

1. All `decimal` DB columns → use `decimal.Decimal` (shopspring) or `float64` (precision risk)
2. All `nullable` FK columns → use pointer types (`*int64`)
3. `created_at`/`updated_at` → auto-managed (set `autoCreateTime`/`autoUpdateTime` in GORM or equivalent)
4. Soft deletes (`deleted_at`) → only `patients` table confirmed to use them
5. `ApiFilterable` params → implement as a reusable middleware/util:
   - `s_f` = JSON array of field names
   - `s_v` = JSON array of values (same length as s_f)
   - `s_o` = `and` | `or` (default: `and`)
   - `sort` = `field,asc` or `field,desc`
   - `status` = direct filter
   - `{field}_id` = direct FK filter (e.g. `brand_id=1`)
