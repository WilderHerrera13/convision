# 26 — Guest PDF Downloads (Sin Autenticación)

## Source files
- Controller: `app/Http/Controllers/Api/V1/GuestPDFController.php`

---

## Middleware: NONE (public endpoints, no `auth:api`)

---

## Token System

Tokens are generated server-side (by other endpoints) using `Crypt::encrypt()`:
```php
$payload = [
  'type'       => 'order_pdf',  // varies by resource
  'id'         => $id,
  'expires_at' => now()->addHours(24)->toIso8601String(),
];
$token = Crypt::encrypt($payload);
```

Tokens are returned in the respective resources as `pdf_token` and `guest_pdf_url`.

### Token validation (Golang must replicate)
1. Decrypt `token` query param using same encryption secret (`APP_KEY`).
2. Verify `expires_at` is in the future.
3. Verify `type` matches the expected type for the route.
4. Verify `id` matches the route `{id}`.
5. Fetch and render PDF. Return binary stream with `Content-Type: application/pdf`.

**Laravel encryption:** AES-256-CBC using `APP_KEY`. In Golang, use the same key with `github.com/go-crypt/crypt` or equivalent. The ciphertext is base64-encoded JSON `{"iv":"...","value":"...","mac":"..."}`.

---

## Endpoints

### GET /api/v1/guest/orders/{id}/pdf?token={token}
Download order PDF.
**Token type:** `order_pdf`
**Response 200:** `application/pdf` binary stream
**Response 403/404:** JSON error if token invalid, expired, or mismatched

### GET /api/v1/guest/orders/{id}/laboratory-pdf?token={token}
Download laboratory order PDF for an order.
**Token type:** `order_laboratory_pdf`
**Response 200:** `application/pdf` binary stream

### GET /api/v1/guest/laboratory-orders/{id}/pdf?token={token}
Download laboratory order PDF.
**Token type:** `laboratory_order_pdf`
**Response 200:** `application/pdf` binary stream

### GET /api/v1/guest/sales/{id}/pdf?token={token}
Download sale receipt PDF.
**Token type:** `sale_pdf`
**Response 200:** `application/pdf` binary stream

### GET /api/v1/guest/quotes/{id}/pdf?token={token}
Download quote PDF.
**Token type:** `quote_pdf`
**Response 200:** `application/pdf` binary stream

### GET /api/v1/guest/clinical-histories/{id}/pdf?token={token}
Download clinical history PDF.
**Token type:** `clinical_history_pdf`
**Response 200:** `application/pdf` binary stream

---

## Where pdf_token appears in resources

| Resource | Field | Token type |
|---|---|---|
| OrderResource | `pdf_token`, `lab_pdf_token`, `guest_pdf_url`, `lab_pdf_url` | `order_pdf`, `order_laboratory_pdf` |
| LaboratoryOrderResource | `pdf_token`, `guest_pdf_url` | `laboratory_order_pdf` |
| SaleResource | `pdf_token`, `guest_pdf_url` | `sale_pdf` |
| QuoteResource | `pdf_token`, `guest_pdf_url` | `quote_pdf` |
| ClinicalHistoryResource | `pdf_token`, `guest_pdf_url` | `clinical_history_pdf` |

---

## PDF error responses
```json
// 403 — invalid or expired token
{ "error": "El enlace ha expirado o no es válido." }

// 404 — resource not found
{ "error": "Recurso no encontrado." }
```
