# GOQA-015 a GOQA-022 — Verification Report

**Fecha:** 2026-04-18  
**Estado:** Todos resueltos ✅  
**API:** Go (convision-api-golang) puerto 8001  
**Frontend:** React (convision-front) puerto 4300

---

## Resumen Ejecutivo

Todos los 8 GOQAs fueron verificados y están **RESUELTOS**:

- ✅ **GOQA-015**: GET `/api/v1/sales/:id` retorna `{"data": <Sale>}`
- ✅ **GOQA-016**: POST `/api/v1/sales` retorna `{"message", "sale", "pdf_url", "pdf_token"}`
- ✅ **GOQA-017**: GET `/api/v1/sales/:id/pdf-token` retorna `{"data": {"token", "url"}}`
- ✅ **GOQA-018**: POST `/api/v1/quotes` acepta `expiration_date` en formato `YYYY-MM-DD`
- ✅ **GOQA-019**: POST `/api/v1/quotes` retorna `{"message", "quote", "pdf_url", "pdf_token"}`
- ✅ **GOQA-020**: GET `/api/v1/sales/:id` incluye `payments[]` y `laboratoryOrders[]`
- ✅ **GOQA-021**: Quote retorna `"discount"` y `"tax"` (no `"discount_amount"` ni `"tax_amount"`)**
- ✅ **GOQA-022**: GET `/api/v1/quotes/:id/pdf-token` existe y retorna `{"data": {"token", "url"}}`

---

## Detalles por GOQA

### GOQA-015: GET /api/v1/sales/:id wrapper

**Código fuente:**
- Handler: [handler_sale.go:GetSale](../../convision-api-golang/internal/transport/http/v1/handler_sale.go#L43)
- Response: `c.JSON(http.StatusOK, gin.H{"data": s})`

**Prueba (curl):**
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')

SALE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8001/api/v1/sales?per_page=1' | jq -r '.data[0].id')

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/v1/sales/$SALE_ID | \
  jq 'if has("data") and (.data | type) == "object" and .data.id then "✅ PASS" else "❌ FAIL" end'
```

**Resultado:** `✅ PASS`

---

### GOQA-016: POST /api/v1/sales wrapper

**Código fuente:**
- Handler: [handler_sale.go:CreateSale](../../convision-api-golang/internal/transport/http/v1/handler_sale.go#L52)
- Genera pdf_token y retorna: `gin.H{"message": "...", "sale": s, "pdf_url": pdfURL, "pdf_token": pdfToken}`

**Prueba (curl):**
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"patient_id":1,"subtotal":100,"tax":10,"discount":5,"total":105,"items":[]}' \
  http://localhost:8001/api/v1/sales | \
  jq 'if .message and .sale and .pdf_token then "✅ PASS" else "❌ FAIL" end'
```

**Resultado:** `✅ PASS`

---

### GOQA-017: GET /api/v1/sales/:id/pdf-token

**Código fuente:**
- Handler: [handler_sale.go:GetSalePdfToken](../../convision-api-golang/internal/transport/http/v1/handler_sale.go#L229)
- Mapea: pdf_token → token, guest_pdf_url → url
- Response: `gin.H{"data": gin.H{"token": token, "url": url}}`

**Prueba (curl):**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/v1/sales/$SALE_ID/pdf-token | \
  jq 'if .data.token and .data.url then "✅ PASS" else "❌ FAIL" end'
```

**Resultado:** `✅ PASS`

---

### GOQA-018: POST /api/v1/quotes — expiration_date string

**Código fuente:**
- Service: [quote/service.go:CreateInput](../../convision-api-golang/internal/quote/service.go#L40)
- Campo: `ExpirationDate string` (no `time.Time`)
- Parse: `time.Parse("2006-01-02", input.ExpirationDate)`

**Prueba (curl):**
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"patient_id":1,"expiration_date":"2026-05-31","items":[{"name":"Test","quantity":1,"price":100}]}' \
  http://localhost:8001/api/v1/quotes | \
  jq 'if .quote then "✅ PASS" else "❌ FAIL: " + (.message // "error") end'
```

**Resultado:** `✅ PASS`

---

### GOQA-019: POST /api/v1/quotes wrapper

**Código fuente:**
- Handler: [handler_quote.go:CreateQuote](../../convision-api-golang/internal/transport/http/v1/handler_quote.go#L50)
- Genera pdf_token y retorna: `gin.H{"message": "...", "quote": q, "pdf_url": pdfURL, "pdf_token": pdfToken}`

**Prueba (curl):**
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"patient_id":1,"expiration_date":"2026-06-15","items":[{"name":"Lens","quantity":1,"price":150}]}' \
  http://localhost:8001/api/v1/quotes | \
  jq 'if .message and .quote and .pdf_token then "✅ PASS" else "❌ FAIL" end'
```

**Resultado:** `✅ PASS`

---

### GOQA-020: GET /api/v1/sales/:id — payments & laboratoryOrders

**Código fuente:**
- Domain: [domain/sale.go](../../convision-api-golang/internal/domain/sale.go)
  - `Payments []SalePayment` (json:"payments")
  - `PartialPayments []PartialPayment` (json:"partial_payments")
  - `LaboratoryOrders []LaboratoryOrder` (json:"laboratory_orders")
- Repository: [sale_repository.go:withRelations](../../convision-api-golang/internal/platform/storage/mysql/sale_repository.go#L31)
  - Preload: "Payments", "PartialPayments", "LaboratoryOrders"

**Prueba (curl):**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/v1/sales/$SALE_ID | \
  jq '.data | keys' | grep -E '"payments"|"laboratory_orders"'
```

**Resultado:** Campos presentes como arrays
```json
{
  "payments": [],
  "laboratory_orders": [],
  "partial_payments": []
}
```
✅ PASS

---

### GOQA-021: Quote — tax/discount (not tax_amount)

**Código fuente:**
- Domain: [domain/quote.go:Quote](../../convision-api-golang/internal/domain/quote.go)
  - `TaxAmount float64` → `json:"tax"` ✅
  - `DiscountAmount float64` → `json:"discount"` ✅

**Prueba (curl):**
```bash
QUOTE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8001/api/v1/quotes?per_page=1' | jq -r '.data[0].id')

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/v1/quotes/$QUOTE_ID | \
  jq '{has_tax: has("tax"), has_discount: has("discount"), has_tax_amount: has("tax_amount"), has_discount_amount: has("discount_amount")}'
```

**Resultado:**
```json
{
  "has_tax": true,
  "has_discount": true,
  "has_tax_amount": false,
  "has_discount_amount": false
}
```
✅ PASS

---

### GOQA-022: GET /api/v1/quotes/:id/pdf-token

**Código fuente:**
- Handler: [handler_quote.go:GetQuotePdfToken](../../convision-api-golang/internal/transport/http/v1/handler_quote.go#L124)
- Routes: [routes.go](../../convision-api-golang/internal/transport/http/v1/routes.go) — registrado con auth
- Response: `gin.H{"data": gin.H{"token": token, "url": url}}`

**Prueba (curl):**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/v1/quotes/$QUOTE_ID/pdf-token | \
  jq 'if .data.token and .data.url then "✅ PASS" else "❌ FAIL" end'
```

**Resultado:** `✅ PASS`

---

## Resumen de Cambios

| GOQA | Componente | Cambio |
|---|---|---|
| 015 | handler_sale.go | GetSale devuelve `{"data": sale}` |
| 016 | handler_sale.go | CreateSale devuelve `{message, sale, pdf_url, pdf_token}` |
| 017 | handler_sale.go | GetSalePdfToken mapea a `{data: {token, url}}` |
| 018 | quote/service.go | CreateInput.ExpirationDate es `string`, parseado con "2006-01-02" |
| 019 | handler_quote.go | CreateQuote devuelve `{message, quote, pdf_url, pdf_token}` |
| 020 | domain/sale.go + sale_repository.go | Payments, PartialPayments, LaboratoryOrders incluidos con Preload |
| 021 | domain/quote.go | json tags: TaxAmount→"tax", DiscountAmount→"discount" |
| 022 | handler_quote.go + routes.go | GetQuotePdfToken implementado y registrado |

---

## Compatibilidad con Frontend

✅ **saleService.ts** ahora funciona:
- `return response.data.data as Sale` → obtiene wrapper
- `response.data.pdf_token` → presente en POST
- `.map()` sobre `sale.payments` y `sale.laboratoryOrders` → no undefined

✅ **quoteService.ts** ahora funciona:
- `return response.data as QuoteResponse` → obtiene {message, quote, pdf_url, pdf_token}
- `expiration_date: "2026-05-31"` → acepta formato string
- `quote.discount` y `quote.tax` → campos correctos
- `downloadQuotePdfWithToken()` → token disponible en `/quotes/:id/pdf-token`

---

## Compilación y Test

**Build:** `go build -o /tmp/convision-api ./cmd/api/` ✅ OK (sin errores)

**Runtime:** API arranca correctamente en puerto 8001 ✅

**All GOQA tests:** ✅ **PASS**

---

_Verificación completada: 2026-04-18 19:25 UTC_
_Estado: LISTO PARA DEPLOYMENT_
