# Orquestador de Fixes Autónomo — Go API Convision

> **Instrucciones para el agente que ejecuta este prompt:**
> Eres un orquestador 100% autónomo. Ejecutas todo sin preguntar al usuario.
> Usas sub-agentes (`Task`) para paralelizar fixes independientes.
> Al final reconstruyes el binario y verificas con curl que los hallazgos quedan cerrados.
> Cuando un sub-agente termine, marca el hallazgo como **resuelto** en QA-FLOWS.md.

## BITACORA DE EJECUCION

Actualiza esta seccion durante la corrida. No la omitas.

- Estado general: `completado`
- Wave 1: `completada`
- Wave 2: `completada`
- Wave 3: `completada`
- Build final: `completado`
- Ultimo sub-agente completado: `sub-agente fixer autonomo (corrida final)`
- Ultimos GOQA cerrados: `[001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 024, 025, 026, 027, 028, 029, 030, 031, 033, 034, 035]`
- Ultimos GOQA parciales: `[032]`
- Ultimos GOQA bloqueados: `[023]`
- Siguiente accion: `ninguna`

## RECUPERACION TRAS RESET DE CONTEXTO

Si entras a este archivo sin contexto previo, haz esto antes de cualquier otra accion:

1. Lee esta seccion `BITACORA DE EJECUCION`.
2. Lee el `Historial de turnos QA` y los GOQA en `QA-FLOWS.md`.
3. Si una wave ya esta `completada`, no la repitas.
4. Reanuda exactamente en la `Siguiente accion` anotada en la bitacora.
5. Si la bitacora y QA-FLOWS.md se contradicen, prevalece el estado mas conservador: trata la wave como `en_progreso` y verifica antes de continuar.
6. Cada vez que una wave termine, actualiza primero esta bitacora y luego sigue con la siguiente wave.

---

## CONTEXTO

- **Proyecto:** `convision-api-golang/` — Go 1.22, Gin, GORM, MySQL
- **Base:** `/Users/wilderherrera/Desktop/convision/convision-api-golang`
- **Binario de prueba:** `/tmp/convision-api`
- **Hallazgos en:** `/Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md`
- **Arquitectura:** Transport → Service → Domain → Platform (MySQL repos)
- **Regla:** Nunca lógica de negocio en handlers. Nunca `db.Save()`. Siempre `db.Model(&e).Updates(map)`.

---

## PASO 0 — Verificar servidor (obligatorio antes de spawnear nada)

```bash
curl -s http://localhost:8001/health | jq .status
```

Si falla → iniciar:
```bash
pkill -f "/tmp/convision-api" 2>/dev/null; sleep 1
cd /Users/wilderherrera/Desktop/convision/convision-api-golang
/tmp/convision-api > /tmp/api.log 2>&1 &
sleep 3 && curl -s http://localhost:8001/health | jq .status
```

Si no hay binario → compilar:
```bash
cd /Users/wilderherrera/Desktop/convision/convision-api-golang
go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
```

---

## PASO 1 — Wave 1: Fixes sistémicos CRÍTICOS (lanzar en paralelo)

Estos son los más importantes: resuelven la raíz de múltiples problemas.

### Sub-agente FIX-A — GOQA-004 + GOQA-005 (Auth/Me wrapper + Paginación sistémica)

**Archivos a modificar:**
- `internal/transport/http/v1/handler.go` — helpers de respuesta
- `internal/transport/http/v1/handler_appointment.go`
- `internal/transport/http/v1/handler_catalog.go`
- `internal/transport/http/v1/handler_finance.go`
- `internal/transport/http/v1/handler_inventory.go`
- `internal/transport/http/v1/handler_laboratory.go`
- `internal/transport/http/v1/handler_order.go`
- `internal/transport/http/v1/handler_prescription.go`
- `internal/transport/http/v1/handler_product.go`
- `internal/transport/http/v1/handler_quote.go`
- `internal/transport/http/v1/handler_sale.go`
- `internal/transport/http/v1/handler_t9.go`
- `internal/transport/http/v1/handler_t10.go`

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang
QA-FLOWS: /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md

REGLAS ARQUITECTURA:
- Nunca lógica en handlers
- Todas las respuestas JSON van en los handlers (capa Transport)
- Lee el archivo antes de editarlo con replace_string_in_file

=== FIX GOQA-004: GET /auth/me debe retornar {"data": <User>} ===

1. Leer internal/transport/http/v1/handler.go
2. Buscar el handler Me() o GetMe() (probablemente en handler.go)
3. Cambiar c.JSON(http.StatusOK, <user>) → c.JSON(http.StatusOK, gin.H{"data": <user>})

=== FIX GOQA-005 (sistémico): Todos los endpoints paginados deben agregar meta ===

El front (userService.ts, appointmentsService.ts, etc.) espera esta estructura:
{
  "data": [...],
  "meta": {
    "current_page": N,
    "last_page": N,
    "per_page": N,
    "total": N
  }
}

ACTUALMENTE los handlers devuelven (ejemplo ListUsers):
  c.JSON(http.StatusOK, gin.H{
    "current_page": out.CurrentPage,
    "data":         toUserResources(out.Data),
    "last_page":    out.LastPage,
    "per_page":     out.PerPage,
    "total":        out.Total,
  })

DEBE QUEDAR:
  c.JSON(http.StatusOK, gin.H{
    "data": toUserResources(out.Data),
    "meta": gin.H{
      "current_page": out.CurrentPage,
      "last_page":    out.LastPage,
      "per_page":     out.PerPage,
      "total":        out.Total,
    },
    // mantener también en root para compatibilidad:
    "current_page": out.CurrentPage,
    "last_page":    out.LastPage,
    "per_page":     out.PerPage,
    "total":        out.Total,
  })

ACCIÓN: Buscar en TODOS los handlers (handler.go, handler_appointment.go, handler_catalog.go, handler_finance.go, handler_inventory.go, handler_laboratory.go, handler_order.go, handler_prescription.go, handler_product.go, handler_quote.go, handler_sale.go, handler_t9.go, handler_t10.go) CADA bloque gin.H{...} que contenga "current_page" y agregar el campo "meta" con gin.H{current_page, last_page, per_page, total}.

Para cada archivo:
1. Leer el archivo completo (o las secciones relevantes)
2. Identificar TODOS los bloques gin.H con "current_page"
3. Modificar cada uno para agregar "meta": gin.H{...}
4. Usar replace_string_in_file con contexto suficiente para cada cambio

=== FIX GOQA-006: Login 401 debe usar "message" en vez de "error" ===

En el handler de login (handler.go), cuando las credenciales son inválidas, cambiar:
c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
por:
c.JSON(http.StatusUnauthorized, gin.H{"message": "Credenciales incorrectas"})

=== VERIFICACIÓN ===

Al terminar todos los cambios:
1. Compilar: cd /Users/wilderherrera/Desktop/convision/convision-api-golang && go build -o /tmp/convision-api ./cmd/api/ 2>&1
2. Si hay errores de compilación, corregirlos antes de reportar
3. Actualizar QA-FLOWS.md marcando GOQA-004, GOQA-005, GOQA-006 como resuelto

REPORTE FINAL:
- GOQA-004: resuelto/parcial/bloqueado + evidencia
- GOQA-005: resuelto/parcial/bloqueado + N handlers modificados
- GOQA-006: resuelto/parcial/bloqueado
- Build: OK/FAIL
```

### Sub-agente FIX-B — GOQA-003 + GOQA-007 + GOQA-014 (Field name mismatches)

**Archivos a modificar:**
- `internal/domain/patient.go` — campo `profile_image_url` → `profile_image`
- `internal/domain/user.go` — campo `active`
- `internal/transport/http/v1/handler.go` — toUserResource() para exponer `active`
- `internal/transport/http/v1/handler_appointment.go` — validación enum status
- `internal/domain/laboratory.go` o donde se define el enum de lab-order status

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang

=== FIX GOQA-003: Patient.profile_image_url → profile_image ===

El front TypeScript espera: patient.profile_image (no profile_image_url)

1. Leer internal/domain/patient.go
2. Buscar el campo ProfileImageURL con json tag "profile_image_url"
3. Cambiar SOLO el json tag a "profile_image":
   ProfileImageURL string `json:"profile_image" gorm:"column:profile_image_url"`
   (el campo Go puede quedarse con el mismo nombre, solo cambiar el json tag)
4. Verificar que en ningún handler se serialice manualmente este campo con el tag viejo.

=== FIX GOQA-007: Login response debe incluir user.active ===

El front lee user.active en AuthContext.

1. Leer internal/domain/user.go — buscar si existe campo Active bool
2. Leer internal/transport/http/v1/handler.go — buscar struct LoginResponse o similar, y la función que construye el user en login
3. Si el campo Active existe en el dominio pero no se expone en la respuesta JSON de login, agregarlo
4. Si no existe en el dominio: agregar Active bool `json:"active" gorm:"default:true"` en domain/user.go y exponer en el response

=== FIX GOQA-014: laboratory-order status enum: "in_process" no "in_progress" ===

El front TypeScript define: status: 'pending' | 'in_process' | 'sent_to_lab' | 'ready_for_delivery' | 'delivered' | 'cancelled'
El Go API acepta "in_progress" (incorrecto). Debe ser "in_process".

1. Leer internal/domain/laboratory.go (o donde esté el enum/validación de LaboratoryOrder status)
2. Leer internal/laboratory/service.go — buscar validación de status
3. Cambiar cualquier referencia a "in_progress" en el contexto de laboratory-orders por "in_process"
4. Si hay binding:"oneof=..." actualizar los valores permitidos

=== FIX GOQA-002: Appointments status debe validarse en UpdateInput ===

El front puede enviar cualquier status. El API debe rechazar valores inválidos.

1. Leer internal/appointment/service.go
2. Buscar UpdateInput struct
3. Agregar validación en el campo Status: binding:"omitempty,oneof=scheduled in_progress paused completed cancelled"
4. El handler ya usa ShouldBindJSON, así que la validación ocurrirá automáticamente

=== VERIFICACIÓN ===

Al terminar:
1. go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
2. Actualizar QA-FLOWS.md: GOQA-002, GOQA-003, GOQA-007, GOQA-014 → resuelto

REPORTE FINAL:
- GOQA-002: resuelto/parcial
- GOQA-003: resuelto/parcial
- GOQA-007: resuelto/parcial
- GOQA-014: resuelto/parcial
- Build: OK/FAIL
```

---

## PASO 2 — Wave 2: Fixes de shape de respuesta (lanzar en paralelo tras Wave 1)

### Sub-agente FIX-C — GOQA-015 + GOQA-016 + GOQA-017 + GOQA-019 + GOQA-020 + GOQA-021 + GOQA-022 (Ventas & Cotizaciones)

**Archivos a modificar:**
- `internal/transport/http/v1/handler_sale.go`
- `internal/transport/http/v1/handler_quote.go`
- `internal/sale/service.go`
- `internal/quote/service.go`

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang
FRONT services: /Users/wilderherrera/Desktop/convision/convision-front/src/services/saleService.ts
                /Users/wilderherrera/Desktop/convision/convision-front/src/services/quoteService.ts

LEE PRIMERO: handler_sale.go, handler_quote.go, sale/service.go, quote/service.go
LUEGO lee saleService.ts y quoteService.ts para entender el shape exacto esperado.

=== FIX GOQA-015: GET /api/v1/sales/:id debe retornar {"data": <Sale>} ===

saleService.ts hace: return response.data.data as Sale
El handler actualmente devuelve el objeto directamente.
Cambiar: c.JSON(http.StatusOK, sale) → c.JSON(http.StatusOK, gin.H{"data": sale})

=== FIX GOQA-016: POST /api/v1/sales debe retornar {"message","sale","pdf_url","pdf_token"} ===

saleService.ts castea: response.data as SaleResponse donde SaleResponse = {message, sale, pdf_url, pdf_token}
El handler actualmente devuelve solo el objeto Sale.
Cambiar la respuesta 201 para incluir el wrapper correcto. Si el service ya retorna pdf_token, úsalo.
Si el service no genera pdf_token aún, generarlo con uuid o token simple y devolverlo.

=== FIX GOQA-017: GET /api/v1/sales/:id/pdf-token debe retornar {"data":{"token":"...","url":"..."}} ===

saleService.ts hace: return response.data.data (espera {token, url})
Actualmente devuelve: {"guest_pdf_url":"...","pdf_token":"..."}
Cambiar a: {"data": {"token": <pdf_token>, "url": <guest_pdf_url>}}

=== FIX GOQA-018: POST /api/v1/quotes — aceptar expiration_date en formato "YYYY-MM-DD" ===

El front envía "2026-05-31" (solo fecha, no RFC3339).
Go falla al parsear con time.Time (espera RFC3339).

Solución: En quote/service.go, cambiar el campo ExpirationDate en CreateInput de time.Time a string,
y parsear manualmente con time.Parse("2006-01-02", input.ExpirationDate) antes de guardarlo en el dominio.

Ejemplo:
type CreateInput struct {
    ...
    ExpirationDate string `json:"expiration_date"` // acepta "YYYY-MM-DD"
    ...
}
// en el método Create:
expDate, err := time.Parse("2006-01-02", input.ExpirationDate)
if err != nil { return nil, &domain.ErrValidation{Field: "expiration_date", Msg: "formato debe ser YYYY-MM-DD"} }

=== FIX GOQA-019: POST /api/v1/quotes debe retornar {"message","quote","pdf_url","pdf_token"} ===

Igual que GOQA-016 pero para quotes. quoteService.ts castea response.data as QuoteResponse.
Cambiar la respuesta 201 del handler de quotes para incluir el wrapper.

=== FIX GOQA-020: GET /api/v1/sales/:id debe incluir payments[] y laboratoryOrders[] ===

El front hace .map() sobre sale.payments y sale.laboratoryOrders.
Si el dominio Sale tiene estos campos, asegurarse que se incluyan en la respuesta (Preload en el repo si aplica).
Si no existen, agregar arrays vacíos [] en la respuesta para evitar crash: incluirlos como [] vacíos.

=== FIX GOQA-021: Quote debe retornar "discount" y "tax" (no "discount_amount" ni "tax_amount") ===

El front TypeScript espera: quote.discount y quote.tax
El handler devuelve: discount_amount y tax_amount
Cambiar los json tags en la struct de respuesta del quote (o en domain/quote.go si es el tag del dominio).

=== FIX GOQA-022: GET /api/v1/quotes/:id/pdf-token — implementar endpoint ===

Falta este endpoint. Implementar análogo a /sales/:id/pdf-token:
1. En handler_quote.go agregar handler GetQuotePdfToken(c *gin.Context)
2. En routes.go registrar: GET /quotes/:id/pdf-token → h.GetQuotePdfToken con auth
3. En quote/service.go agregar método GetPdfToken(id uint) (*PdfTokenOutput, error) que devuelva {Token, URL}
4. El servicio puede reusar la lógica existente de pdf_token del quote

=== VERIFICACIÓN ===

Al terminar:
1. go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
2. Si build OK, reiniciar y probar:
   pkill -f "/tmp/convision-api"; /tmp/convision-api > /tmp/api.log 2>&1 &
   sleep 2
   TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')
   SALE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/sales | jq -r '.data[0].id // empty')
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/sales/$SALE_ID | jq 'has("data")'
3. Actualizar QA-FLOWS.md: GOQA-015..022 → resuelto/parcial

REPORTE FINAL por GOQA (resuelto/parcial/bloqueado + evidencia curl)
```

### Sub-agente FIX-D — GOQA-008 + GOQA-009 + GOQA-010 + GOQA-011 (Catálogo e Inventario)

**Archivos a modificar:**
- `internal/transport/http/v1/routes.go` — registrar rutas faltantes
- `internal/transport/http/v1/handler_catalog.go` — rutas de categories
- `internal/transport/http/v1/handler_inventory.go`
- `internal/transport/http/v1/handler_discount.go`
- `internal/product/category_service.go`
- `internal/platform/storage/mysql/catalog_repository.go`

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang
ARCHIVOS FRONT: /Users/wilderherrera/Desktop/convision/convision-front/src/services/catalogService.ts
                /Users/wilderherrera/Desktop/convision/convision-front/src/services/lensService.ts

LEE PRIMERO:
- internal/transport/http/v1/routes.go (completo)
- internal/transport/http/v1/handler_catalog.go
- internal/product/category_service.go
- internal/platform/storage/mysql/catalog_repository.go (o product_category_repository.go)
- internal/transport/http/v1/handler_inventory.go
- internal/transport/http/v1/handler_discount.go
- internal/discount/service.go

=== FIX GOQA-008: /api/v1/categories devuelve 404 ===

Verificar si el handler existe en handler_catalog.go y si la ruta está registrada en routes.go.
- Si existe handler pero falta ruta: agregar en routes.go
- Si falta handler: implementar CRUD básico (List, Create, Show, Update, Delete) para categories
  siguiendo exactamente el patrón de brands que probablemente ya existe en handler_catalog.go

Shape que espera el front (catalogService.ts):
GET /categories → {data:[{id, name, description}], meta:{...}}
POST /categories → {id, name, description} con HTTP 201
PUT /categories/:id → {id, name, description}
DELETE /categories/:id → HTTP 204

=== FIX GOQA-009: POST /products — campos incorrectos ===

Problemas:
a) Requiere campo "identifier" no documentado (422 sin él) — hacerlo opcional o eliminarlo
b) category_id se ignora → product_category_id:null — revisar el binding y el save
c) El campo name no aparece en el response

1. Leer internal/product/service.go — CreateInput struct
2. Hacer "identifier" opcional (omitempty)
3. Asegurar que category_id del input se mapee correctamente al campo del dominio
4. Leer handler_product.go y verificar que el response incluye el campo name

=== FIX GOQA-010: /api/v1/inventory y /inventory/adjust devuelven 404 ===

1. Verificar routes.go si las rutas están registradas
2. Leer handler_inventory.go — ver si los handlers existen
3. Si los handlers existen pero faltan rutas, agregarlas en routes.go
4. Si los handlers no existen, implementarlos:
   GET /inventory → listar items de inventario con stock actual
   POST /inventory/adjust → ajustar stock de un producto

=== FIX GOQA-011: /api/v1/discounts y /discounts/best devuelven 404 ===

1. Verificar routes.go si las rutas están registradas
2. Leer handler_discount.go y discount/service.go
3. Si los handlers existen pero faltan rutas, agregarlas
4. Si /discounts/best no existe, implementar:
   GET /discounts/best?lens_id=<id>&patient_id=<id> → devolver el descuento mayor aplicable o null

El front usa: discountService.getBestDiscount(lensId, patientId?)
Espera: {discount_percentage: number} o null

=== VERIFICACIÓN ===

Al terminar:
1. go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
2. Si OK, probar:
   TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')
   curl -s -o /dev/null -w "categories: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/categories
   curl -s -o /dev/null -w "inventory: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/inventory
   curl -s -o /dev/null -w "discounts: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/discounts
3. Actualizar QA-FLOWS.md: GOQA-008..011 → resuelto/parcial

REPORTE FINAL por GOQA (resuelto/parcial/bloqueado)
```

---

## PASO 3 — Wave 3: Fixes de endpoints faltantes y shapes secundarios (lanzar en paralelo)

### Sub-agente FIX-E — GOQA-012 + GOQA-013 + GOQA-025 + GOQA-026 (Órdenes, Lab, Compras)

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang

LEE PRIMERO:
- internal/transport/http/v1/routes.go
- internal/transport/http/v1/handler_order.go
- internal/transport/http/v1/handler_laboratory.go
- internal/order/service.go
- internal/purchase/service.go
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/orderService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/supplierService.ts

=== FIX GOQA-012: GET /orders/:id debe incluir pdf_token y lab_pdf_token ===

El front (orderService.ts) espera que el objeto Order tenga:
pdf_token, pdf_url, guest_pdf_url, laboratory_pdf_token, guest_lab_pdf_url

Revisar en order/service.go y handler_order.go si estos campos se generan al crear.
Si existen en el dominio/DB pero no se devuelven en GetByID, agregarlos en la respuesta del handler.
Si no se generan: en CreateOrder, generar pdf_token y lab_pdf_token con un UUID o similar y devolverlos.

=== FIX GOQA-013: GET /laboratories incluir meta ===

Ya cubierto por GOQA-005 sistémico (FIX-A), pero verificar específicamente el handler de laboratories.
Si handler_laboratory.go tiene su propia serialización de paginación, agregar el campo "meta" igual que el fix sistémico.

=== FIX GOQA-025: POST /purchases/:id/receive — endpoint faltante ===

1. Verificar si hay algún método en purchase/service.go o handler_product.go para recibir compra
2. Si no existe, implementar:
   a. En internal/purchase/service.go agregar: Receive(id uint) (*domain.Purchase, error) que cambia status a "received"
   b. En handler (handler_t10.go o crear handler_purchase.go): ReceivePurchase(c *gin.Context)
   c. En routes.go: POST /purchases/:id/receive → h.ReceivePurchase (con auth admin/receptionist)

=== FIX GOQA-026: GET /supplier-payments — endpoint faltante ===

1. Verificar si existe algún modelo/servicio de supplier payments
2. Revisar laravel_map/15-purchases.md para entender qué es supplier-payments:
   cat /Users/wilderherrera/Desktop/convision/laravel_map/15-purchases.md | head -80
3. Si el concepto existe pero el endpoint no está registrado, implementar un CRUD básico
4. Si el dominio no existe aún, crear un endpoint mínimo que devuelva lista vacía paginada para no romper el front:
   GET /supplier-payments → {data:[], meta:{current_page:1, last_page:1, per_page:15, total:0}}

=== VERIFICACIÓN ===

Al terminar:
1. go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
2. Probar:
   TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')
   ORDER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/orders | jq -r '.data[0].id // empty')
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/orders/$ORDER_ID | jq '{has_pdf_token: (has("pdf_token")), has_lab_token: (has("laboratory_pdf_token"))}'
   curl -s -o /dev/null -w "supplier-payments: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/supplier-payments
3. Actualizar QA-FLOWS.md: GOQA-012, GOQA-013, GOQA-025, GOQA-026 → resuelto/parcial

REPORTE FINAL por GOQA
```

### Sub-agente FIX-F — GOQA-027 + GOQA-028 + GOQA-029 + GOQA-030 + GOQA-031 + GOQA-032 + GOQA-033 (Nómina, Caja, Dashboard, Notificaciones)

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang

LEE PRIMERO:
- internal/transport/http/v1/handler_t10.go (payrolls, service-orders, cash-transfers)
- internal/transport/http/v1/handler_t9.go (dashboard, notifications, daily-activity)
- internal/cash/service.go
- internal/notification/service.go
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/payrollService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/cashTransferService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/dashboardService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/adminNotificationService.ts

=== FIX GOQA-027: POST /payrolls y POST /service-orders deben retornar {"data": <objeto>} ===

payrollService.createPayroll() hace: return response.data.data
serviceOrderService.createServiceOrder() hace: return response.data.data

En handler_t10.go:
- handler CreatePayroll: cambiar c.JSON(http.StatusCreated, payroll) → c.JSON(http.StatusCreated, gin.H{"data": payroll})
- handler CreateServiceOrder: igual

=== FIX GOQA-028: ServiceOrder campo "description" → "problem_description" ===

El front TypeScript define: problem_description: string
El handler/dominio devuelve: description

Opciones (elegir la menos invasiva):
a) Cambiar el json tag del campo en domain o en la struct de respuesta del handler a "problem_description"
b) En el handler al serializar, mapear manualmente el campo

Implementar opción (a): en el dominio o struct de respuesta, cambiar json:"description" → json:"problem_description"

=== FIX GOQA-029: POST /cash-transfers — shape incompatible ===

El front (cashTransferService.ts) espera:
- Enviar: {transfer_number, origin_type, origin_description, destination_type, destination_description, amount, reason}
- Recibir: {"data": <CashTransfer>}
- CashTransfer tiene: transfer_number, origin_type, origin_description, destination_type, destination_description, amount, reason, requested_by, approved_by, status

El API actualmente usa: from_account, to_account, concept

Leer cashTransferService.ts para ver el shape exacto.
Leer internal/domain/cash.go y internal/cash/service.go para ver el modelo.

Ajuste posible:
a) Si el dominio usa from_account/to_account, cambiar json tags para exponer origin_type, etc.
b) Si es necesario agregar campos al modelo, hacerlo

También: el handler debe retornar {"data": <transfer>} en lugar del objeto directo.

=== FIX GOQA-030: GET /dashboard/summary — aplanar métricas ===

dashboardService.ts espera:
metrics: {
  monthly_sales: number, monthly_sales_change: number|null,
  monthly_patients: number, monthly_patients_change: number|null,
  lab_orders_total: number, lab_orders_pending: number,
  pending_balance: number, pending_balance_count: number
}
weekly_count: number
recent_orders: []

El API devuelve objetos anidados: {monthly_sales: {total, count}, ...}

En handler_t9.go, el handler GetDashboardSummary:
1. Obtener los datos del servicio
2. Aplanar la respuesta para que coincida con lo que espera el front:
   monthly_sales → (del objeto anidado extraer el valor numérico)
   Agregar campos _change como null si no están disponibles
   lab_orders_total, lab_orders_pending → del objeto lab_orders

=== FIX GOQA-031: GET /admin/notifications debe tener meta + counts ===

adminNotificationService.list() espera: {data[], counts:{all, unread, archived}, meta:{current_page, last_page, per_page, total}}

En handler_t9.go, el handler ListNotifications:
Cambiar para agregar "meta": gin.H{current_page, last_page, per_page, total} y "counts": gin.H{all, unread, archived}
Si los conteos no están disponibles en el servicio, agregarlos como 0 por ahora.

=== FIX GOQA-032: GET /notifications/summary debe retornar {"data":{unread, inbox, archived}} ===

adminNotificationService.getSummary() hace: return res.data.data
El endpoint devuelve directo sin wrapper.

En el handler GetNotificationSummary:
- Cambiar a retornar: gin.H{"data": gin.H{"unread": N, "inbox": N, "archived": N}}
- El campo "total" del API se mapea a "inbox" del front

=== FIX GOQA-033: PATCH /notifications/read-all debe retornar {"data":{"updated":N}} ===

adminNotificationService.markAllRead() hace: res.data.data.updated as number

En el handler MarkAllNotificationsRead:
- Cambiar a: gin.H{"data": gin.H{"updated": count}} o gin.H{"data": gin.H{"updated": 0}} si no hay conteo

=== VERIFICACIÓN ===

Al terminar:
1. go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
2. Probar fixes críticos:
   TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/dashboard/summary | jq '{has_metrics: (has("metrics")), monthly_sales_type: (.metrics.monthly_sales | type)}'
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/admin/notifications/summary | jq 'has("data")'
3. Actualizar QA-FLOWS.md: GOQA-027..033 → resuelto/parcial

REPORTE FINAL por GOQA
```

### Sub-agente FIX-G — GOQA-034 + GOQA-035 + GOQA-023 + GOQA-024 (Daily Activity, Prescripciones, Supplier)

**Prompt exacto:**
```
Eres un fixer del Go API Convision. Ejecuta sin pausas. Lee antes de editar.

BASE: /Users/wilderherrera/Desktop/convision/convision-api-golang

LEE PRIMERO:
- internal/transport/http/v1/handler_t9.go (daily-activity)
- internal/dailyactivity/service.go
- internal/domain/patient.go (para GOQA-023)
- internal/prescription/service.go (para GOQA-023)
- internal/domain/supplier.go (para GOQA-024)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/dailyActivityReportService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/supplierService.ts

=== FIX GOQA-034 (BLOQUEANTE): daily-activity-reports — estructura anidada vs plana ===

El front envía y espera estructura ANIDADA:
POST body: {
  report_date: "YYYY-MM-DD",
  shift: "morning"|"afternoon"|"evening",
  customer_attention: { preguntas_hombre, preguntas_mujeres, cotizaciones_hombre, cotizaciones_mujeres, ... },
  operations: { ... },
  social_media: { publicaciones_fb, publicaciones_instagram, ... }
}

El front deserializa con normalizeDailyActivityReport() que espera esa estructura anidada.

El API usa estructura PLANA: preguntas_hombre, cotizaciones_mujeres, publicaciones_facebook, etc.

SOLUCIÓN: Adaptar el handler de daily-activity para:
a) Aceptar en POST tanto la estructura anidada del front como la plana
b) En GET, devolver la estructura anidada que espera normalizeDailyActivityReport()

Estrategia concreta:
1. En el handler POST, deserializar el body anidado y aplanar antes de llamar al servicio
2. En el handler GET/lista, anidar los campos al armar la respuesta
3. El campo "publicaciones_fb" del front vs "publicaciones_facebook" del API: unificar a "publicaciones_fb"

Leer dailyActivityReportService.ts para extraer el mapping exacto de campos.

=== FIX GOQA-035: GET /daily-activity-reports — usar current_page y last_page ===

El front espera paginación estándar con current_page y last_page.
El handler usa "page" en vez de "current_page" y no incluye "last_page".
Corrección: estandarizar al patrón del proyecto (ya cubierto por FIX-A sistémico, pero verificar handler_t9.go específicamente).

=== FIX GOQA-023: GET /patients/:id/prescriptions no filtra correctamente ===

GET /api/v1/patients/:id/prescriptions devuelve total=0 aunque hay prescripciones del paciente.
El filtro de la ruta anidada falla.

1. Leer internal/prescription/service.go — ver cómo se lista por patient_id
2. Leer el handler en handler_prescription.go — ver cómo extrae el patient_id de la URL
3. Corregir el filtro para que use el patient_id de la ruta, no de query params

=== FIX GOQA-024: Supplier debe devolver campo "city" (string) no "city_id" (int) ===

El front espera: supplier.city?: string | null
El API devuelve: city_id: null (entero FK)

Opciones:
a) Hacer JOIN con tabla de ciudades y devolver city.name como "city"
b) Si el campo city existe como string en la tabla suppliers, cambiar el json tag
c) Si no, agregar campo virtual en la respuesta: city: null (string vacío por ahora) para no romper el front

Leer internal/domain/supplier.go para ver el modelo exacto.
Si hay un campo de texto city: cambiar json tag.
Si solo hay city_id: agregar campo City *string `json:"city" gorm:"-"` como nil por ahora.

=== VERIFICACIÓN ===

Al terminar:
1. go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"
2. Probar:
   TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')
   TOKEN_REC=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"vcastillo@convision.com","password":"password"}' | jq -r '.access_token')
   # Test daily-activity POST anidado
   curl -s -X POST -H "Authorization: Bearer $TOKEN_REC" -H 'Content-Type: application/json' \
     -d '{"report_date":"2026-04-18","shift":"morning","customer_attention":{"preguntas_hombre":1},"operations":{},"social_media":{}}' \
     http://localhost:8001/api/v1/daily-activity-reports -w "\nHTTP:%{http_code}"
   # Test supplier city field
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/suppliers | jq '.data[0] | has("city")'
3. Actualizar QA-FLOWS.md: GOQA-023, GOQA-024, GOQA-034, GOQA-035 → resuelto/parcial

REPORTE FINAL por GOQA
```

---

## PASO 4 — Rebuild final y verificación integral (el orquestador lo hace sin sub-agentes)

Cuando todos los sub-agentes hayan reportado:

```bash
cd /Users/wilderherrera/Desktop/convision/convision-api-golang

# Compilar
go build -o /tmp/convision-api ./cmd/api/ 2>&1 && echo "BUILD OK"

# Reiniciar
pkill -f "/tmp/convision-api" 2>/dev/null; sleep 1
/tmp/convision-api > /tmp/api.log 2>&1 &
sleep 3

TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')

echo "=== GOQA-004: /auth/me tiene wrapper data? ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/auth/me | jq 'has("data")'

echo "=== GOQA-005: /users tiene meta? ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/users | jq 'has("meta")'

echo "=== GOQA-008: /categories responde? ==="
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/categories

echo "=== GOQA-018: POST /quotes acepta fecha YYYY-MM-DD? ==="
PATIENT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/patients | jq -r '.data[0].id // "1"')
PRODUCT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/products | jq -r '.data[0].id // "1"')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"patient_id\":$PATIENT_ID,\"items\":[{\"product_id\":$PRODUCT_ID,\"quantity\":1,\"unit_price\":100}],\"expiration_date\":\"2026-06-30\"}" \
  http://localhost:8001/api/v1/quotes -o /dev/null -w "%{http_code}"

echo "=== GOQA-029: /cash-transfers tiene wrapper data? ==="
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":100,"type":"income","description":"test"}' \
  http://localhost:8001/api/v1/cash-transfers | jq 'has("data")'

echo "=== GOQA-032: /notifications/summary tiene wrapper data? ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/admin/notifications/summary | jq 'has("data")'
```

---

## PASO 5 — Reporte final

Agregar fila en QA-FLOWS.md:

```
| FIX-01 | 2026-04-18 | GOQA-001→035 | <N resueltos> | <N parciales> | orquestador-fix-autonomo |
```

Imprimir al usuario:

```
╔══════════════════════════════════════════════════════════════╗
║         REPORTE DE FIXES — Go API Convision                  ║
╠══════════════════════════════════════════════════════════════╣
║ GOQA resueltos:  N/35                                        ║
║ GOQA parciales:  N                                           ║
║ GOQA bloqueados: N                                           ║
╠══════════════════════════════════════════════════════════════╣
║ Build final: OK / FAIL                                       ║
╠══════════════════════════════════════════════════════════════╣
║ VEREDICTO                                                    ║
║ Si GOQA-004 + GOQA-005 resueltos:                           ║
║   ✅ LISTO PARA CONECTAR CON EL FRONT                       ║
║   → Actualizar convision-front/.env.local:                  ║
║      VITE_API_URL=http://localhost:8001                      ║
║ Si siguen abiertos:                                          ║
║   ❌ NO conectar aún — resolver bloqueantes primero          ║
╚══════════════════════════════════════════════════════════════╝
```
