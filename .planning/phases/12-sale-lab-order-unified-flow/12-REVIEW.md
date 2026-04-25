---
status: findings
phase: 12
files_reviewed: 14
findings:
  critical: 3
  warning: 6
  info: 3
  total: 12
---

# Code Review: Phase 12 — sale-lab-order-unified-flow

## Summary

Phase 12 introduced the sale-linked laboratory order unified flow, adding `sale_id` to `LaboratoryOrder`, automatic sale completion on lab order delivery, generic product columns to `sale_items`, and a PDF guest endpoint for lab orders. The implementation is mostly sound in structure but has a critical duplicate migration number conflict, a non-functional PDF download button (pdf_token is never returned by the API), and a security weakness in the guest PDF token scheme that allows tokens to be crafted by anyone knowing an order ID.

---

## Findings

### CR-001 — Duplicate migration version number 000005 (critical)
**File:** `convision-api-golang/db/migrations/platform/000005_sale_item_generic_products.up.sql`
**Issue:** There are already two files named `000005_add_started_completed_at_to_appointments.{up,down}.sql` in the same directory. The `golang-migrate` tool uses the numeric prefix as the version identifier; having two distinct filenames with the same prefix `000005` will cause the migration tool to error on startup in all non-local environments (where AutoMigrate is disabled and SQL migrations run). In production this will block deployments entirely.
**Fix:** Rename both new migration files to the next available version, e.g. `000012_sale_item_generic_products.{up,down}.sql` (currently 000011 is the highest used number).

---

### CR-002 — pdf_token is never populated for LaboratoryOrder — PDF button always hidden (critical)
**File:** `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx:91` and `convision-front/src/services/laboratoryOrderService.ts:78`
**Issue:** The frontend conditionally shows the PDF download button only when `order?.pdf_token` is truthy (line 91 of `LaboratoryOrderDetail.tsx`). However, the backend `LaboratoryOrder` domain struct has no `pdf_token` field and no API endpoint exists to generate a token (unlike sales which have `GET /sales/:id/pdf-token`). The `GET /laboratory-orders/:id` handler returns the raw domain struct via `c.JSON(http.StatusOK, o)`, which will never include a `pdf_token`. The button is therefore permanently hidden and the PDF guest endpoint (`GET /guest/laboratory-orders/:id/pdf`) is unreachable through the UI.
**Fix:** Either (a) add a `pdf_token` column to `laboratory_orders`, generate it on creation (like orders do with uuid), return it in the GET response, and add a `/laboratory-orders/:id/pdf-token` endpoint — or (b) generate the token on-the-fly in the handler and include it in the GET response body the same way `handler_sale.go` does it.

---

### CR-003 — Guest PDF token provides no real authorization — any token with correct hex prefix is accepted (critical)
**File:** `convision-api-golang/internal/transport/http/v1/handler_guest_pdf.go:16–30`
**Issue:** `validateGuestToken` only checks that the token starts with `fmt.Sprintf("%x-", id)` (the hex of the resource ID) and that the suffix is a valid integer. Since the resource ID is public (visible in the URL path), any caller can forge a valid token by computing `hex(id) + "-" + anyInteger`. The token provides zero authentication — anyone who knows the order ID can craft a "valid" token and download any PDF document without ever receiving a shared link.
**Fix:** Replace the predictable token format with a cryptographically random token (e.g., UUID v4) stored in the database on the resource record, as the `Order` entity already does with `uuid.New().String()`. Validate by checking the token against the stored value in the DB, not by reconstructing the expected prefix.

---

### CR-004 — GET /laboratory-orders, /stats, /:id have no role restriction — any authenticated user can list all orders (warning)
**File:** `convision-api-golang/internal/transport/http/v1/routes.go:504–506`
**Issue:** The three GET endpoints for laboratory orders are under the `protected` group (require a valid JWT) but have no `RequireRole` middleware. Any authenticated user with any role, including `receptionist`, can read all laboratory orders. Per the project architecture, write operations correctly restrict to admin+specialist, but the read operations are open to all authenticated roles with no documented intent.
**Fix:** Add explicit `RequireRole` middleware to the GET endpoints. If intentional, document it with a comment. The current state is inconsistent with how other sensitive resources (e.g., suppliers, expenses) handle reads.

---

### CR-005 — Delete cascade in LaboratoryRepository.Delete silently ignores errors (warning)
**File:** `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go:67–71`
**Issue:** The three pre-delete cleanup calls (`Pluck`, `Delete` on status entries, `Delete` on lab orders) have their errors completely ignored. If any of these fail (e.g., DB timeout, FK violation), the parent `Delete` proceeds regardless, potentially leaving orphaned records or returning a false success when partial cleanup occurred.
**Fix:** Capture and return errors from each step. Similarly for `LaboratoryOrderRepository.Delete` at line 164.

---

### CR-006 — Stats() in LaboratoryOrderRepository silently ignores per-status count errors (warning)
**File:** `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go:210–213`
**Issue:** Inside `Stats()`, the loop calls `r.db.Model(...).Count(&count)` for each status but discards all errors. A transient DB error would silently return 0 for the affected status while the function returns `nil` for the error, yielding a misleading stats response.
**Fix:** Check `r.db.Model(...).Where(...).Count(&count).Error` and return the error on failure, or at minimum log it.

---

### CR-007 — UpdateOrder allows arbitrary status changes without validation (warning)
**File:** `convision-api-golang/internal/laboratory/service.go:264–301`
**Issue:** `UpdateOrder` (used via `PUT /laboratory-orders/:id`) accepts a free-form `Status` string with no `binding:"oneof=..."` validation and no history entry is recorded. In contrast, `UpdateOrderStatus` (via `POST /laboratory-orders/:id/status`) correctly validates with `binding:"required,oneof=..."` and records history. A caller can bypass the controlled status flow and set any arbitrary string status via the `PUT` endpoint.
**Fix:** Add `binding:"omitempty,oneof=pending in_process sent_to_lab ready_for_delivery delivered cancelled"` to `UpdateOrderInput.Status`, and record a status history entry in `UpdateOrder` when the status actually changes.

---

### CR-008 — Frontend route ordering causes /laboratory-orders/new to never match (warning)
**File:** `convision-front/src/App.tsx:384–392`
**Issue:** In the React Router v6 route definitions, `laboratory-orders/:id` is declared before `laboratory-orders/new`. React Router v6 uses score-based matching (not declaration order), so static segments like `new` take priority over dynamic `:id`. However, this is only safe because React Router v6 correctly handles it — but the code communicates the wrong intent to future maintainers and may break if routes are ever reorganized or a framework without score-based matching is used. Verify this is working as intended; if so, add a comment.
**Fix:** Reorder to place `laboratory-orders/new` before `laboratory-orders/:id` to make intent explicit and match the ordering used for all other resource routes in the same file.

---

### CR-009 — sale.Update() errors silently discarded in AddPayment and RemovePayment (warning)
**File:** `convision-api-golang/internal/sale/service.go:331` and `convision-api-golang/internal/sale/service.go:372`
**Issue:** Both `AddPayment` and `RemovePayment` recalculate `AmountPaid`, `Balance`, and `PaymentStatus` and then call `s.saleRepo.Update(sale)` with the result discarded via `_ =`. If the update fails, the payment record is created/removed successfully but the sale's balance and payment status remain stale in the DB, creating a data inconsistency silently.
**Fix:** Return the error from `s.saleRepo.Update(sale)` and propagate it to the caller, or wrap the payment insertion and sale update in a DB transaction.

---

### CR-010 — AddStatusEntry errors silently discarded in laboratory service (warning)
**File:** `convision-api-golang/internal/laboratory/service.go:253` and `convision-api-golang/internal/laboratory/service.go:316`
**Issue:** Both `CreateOrder` and `UpdateOrderStatus` call `s.orderRepo.AddStatusEntry(...)` with `_ =` discarding the error. A failed status history write goes unnoticed. While the history is auditing/informational, silent failure is still a quality issue.
**Fix:** At minimum log the error via `s.logger.Error(...)`. Ideally use a DB transaction wrapping both the order update and the history insert.

---

### CR-011 — Debug console.log statements left in production service (info)
**File:** `convision-front/src/services/laboratoryOrderService.ts:166–195`
**Issue:** Seven `console.log` / `console.error` calls with "Debug -" prefixes are left in `getLaboratoryOrders`. These will appear in browser consoles in production, potentially leaking API response shapes and internal filter logic.
**Fix:** Remove all `console.log` and `console.error` debug calls. Use proper error boundaries or toast notifications for user-facing errors.

---

### CR-012 — LaboratoryOrderDetail.tsx hardcodes the admin back-navigation URL (info)
**File:** `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx:85`
**Issue:** The "Volver" button navigates to `/admin/laboratory-orders` unconditionally. If this component is ever reused in a specialist or receptionist context (the `specialistNav` in `AdminLayout.tsx` already has an `Órdenes de Lab.` link pointing to `/specialist/laboratory-orders`), the back button will route the user to an unauthorized admin path.
**Fix:** Use `navigate(-1)` to go back in history, or derive the base path from the current `location.pathname`.

---

### CR-013 — SaleItem domain struct missing the new generic product columns from migration 000005 (info)
**File:** `convision-api-golang/internal/domain/sale.go:46–60`
**Issue:** Migration `000005_sale_item_generic_products.up.sql` adds `product_id`, `product_type`, `name`, and `description` columns to `sale_items`, but the `SaleItem` struct in `domain/sale.go` has none of these fields. AutoMigrate in local environments won't add them (it only adds missing struct fields, not removes unstructured columns), and any code trying to read/write these new columns via GORM will fail silently or be ignored.
**Fix:** Add the corresponding fields to `SaleItem`: `ProductID *uint`, `ProductType string`, `Name string`, and `Description string` with appropriate GORM tags.
