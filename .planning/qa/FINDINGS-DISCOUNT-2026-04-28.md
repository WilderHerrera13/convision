---
status: resolved
app: convision-api-golang
api: convision-api-golang
base_url: http://localhost:8001
started: 2026-04-28T21:20:00-05:00
updated: 2026-04-28T21:43:00-05:00
scope: Discount features — Laravel-to-Go migration comparison and API validation
method: API-only (curl testing, no frontend)
resolution: All 7 findings fixed and verified via curl tests.
---

## Resumen ejecutivo

- Endpoints verificados: 18
- Feature comparison items: 22
- Hallazgos confirmados (bugs/gaps): 7
- Sin incidencias (endpoints OK): 11

## Metodologia

Se comparo exhaustivamente el codigo de descuentos entre `convision-api` (Laravel) y `convision-api-golang` (Go), validando:
1. Modelos de datos y relaciones
2. Endpoints REST (rutas, metodos HTTP, parametros)
3. Logica de negocio (flujo create → approve/reject, calculo de precios)
4. Reglas de autorizacion (RBAC)
5. Comportamiento de queries (GetBestDiscount, GetActiveForProduct)
6. Validaciones de entrada

Luego se probaron todos los endpoints Go con curl, creando datos de prueba reales:
- Product ID 1002 (POLY /BLUE / AR AZUL, price=140000)
- Discount ID 1: global 15%, approved (admin)
- Discount ID 2: patient 1, 25%, approved (admin)
- Discount ID 4: patient null, 20%, approved (receptionist → admin approved)

---

## Hallazgos (FAIL / GAP)

### QA-D001 — GET products/:id/discounts retorna datos incorrectos
- Endpoint: `GET /api/v1/products/1002/discounts`
- Severidad: **bloqueante**
- Pasos:
  1. Llamar al endpoint `products/1002/discounts`
  2. Comparar respuesta con comportamiento Laravel
- Esperado (Laravel): Retorna **lista** de descuentos aprobados/activos para el producto (array de DiscountRequest)
- Observado (Go): Retorna **discount-info** (objeto con `has_discounts`, `best_discount_percentage`, `discounted_price`, `original_price`)
- Evidencia:
```json
// Go response (INCORRECTO - es discount-info, no lista):
{"has_discounts":true,"best_discount_percentage":20,"discounted_price":112000,"original_price":140000}

// Laravel response (CORRECTO - lista de descuentos):
[{"id":1,"discount_percentage":15,"original_price":140000,...}, {"id":2,...}]
```
- Causa raiz: `handler_product.go` linea 287-298: `GetProductDiscounts` llama a `h.product.GetDiscountInfo(id, nil)` en lugar de retornar la lista de descuentos activos
- Fix sugerido: Cambiar `GetProductDiscounts` para que retorne la lista de descuentos aprobados (como `GetProductActiveDiscounts` pero sin filtrar solo globales)

### QA-D002 — Update discount no recalcula discounted_price
- Endpoint: `PUT /api/v1/discount-requests/:id`
- Severidad: **bloqueante**
- Pasos:
  1. Crear descuento con `discount_percentage=10`, `original_price=140000`, `discounted_price=126000`
  2. Actualizar solo `discount_percentage=20` (sin enviar `discounted_price`)
  3. Verificar respuesta
- Esperado: `discounted_price` se recalcula a `112000` (140000 * 0.80)
- Observado: `discounted_price` queda en `0`
- Evidencia:
```
ID=3 pct=20% discounted_price=0
```
- Causa raiz: `service.go` linea 155-179: metodo `Update` asigna `d.DiscountedPrice = input.DiscountedPrice` directamente. Si el frontend solo envia `discount_percentage`, `input.DiscountedPrice` es `0` (zero value de float64). No hay recalculo automatico.
- Fix sugerido: En el metodo `Update` del servicio, si `input.DiscountedPrice == 0` y `input.DiscountPercentage > 0`, recalcular: `d.DiscountedPrice = d.OriginalPrice * (1 - input.DiscountPercentage/100)`
- Contraste Laravel: `DiscountRequestService.php` linea 74-83 recalcula automaticamente cuando `discount_percentage` cambia

### QA-D003 — products/:id/active-discounts solo retorna descuentos globales
- Endpoint: `GET /api/v1/products/1002/active-discounts`
- Severidad: **mayor**
- Pasos:
  1. Tener descuentos aprobados: ID=1 (global), ID=2 (patient 1, not global), ID=4 (not global)
  2. Llamar `products/1002/active-discounts`
  3. Verificar cuantos descuentos se retornan
- Esperado (Laravel): Retorna **todos** los descuentos aprobados para el producto, sin filtrar por `is_global` ni `patient_id`
- Observado (Go): Retorna solo el descuento global (ID=1). Los descuentos paciente-especificos (ID=2, ID=4) no aparecen
- Evidencia:
```json
// Go: solo 1 descuento (el global ID=1)
{"data":[{"id":1,"is_global":true,...}]}

// Laravel getActiveDiscountsForProduct: retorna TODOS los aprobados
// Deberia retornar IDs 1, 2, 4
```
- Causa raiz: `handler_product.go` linea 321-332: `GetProductActiveDiscounts` llama a `h.discount.ListActive(&id, nil)` con `patientID=nil`. En el repositorio, sin `patientID` solo filtra `is_global = true` (`discount_repository.go` linea 76-77)
- Fix sugerido: Crear un metodo `ListActiveForProduct` en el repositorio que retorne todos los descuentos aprobados del producto sin filtrar por paciente o globalidad. O usar `List` con filtro `status=approved` + `product_id=X`

### QA-D004 — Product list no incluye campo has_discounts
- Endpoint: `GET /api/v1/products`
- Severidad: **menor**
- Pasos:
  1. Llamar `products/1002` (show) → verificar `has_discounts: true`
  2. Llamar `products?product_type=lens&per_page=2` (list) → verificar `has_discounts`
- Esperado: Campo `has_discounts` presente en ambos endpoints (show + list)
- Observado: `has_discounts` solo presente en show, ausente en list
- Evidencia:
```
# Show: has_discounts=True (CORRECTO)
# List: has_discounts=NOT_PRESENT (FALTA)
```
- Causa raiz: `handler_product.go` linea 128 agrega `has_discounts` en `ShowProduct` pero no en `ListProducts` / `productResponse`
- Fix sugerido: Agregar `resp["has_discounts"] = h.product.HasActiveDiscounts(p.ID)` en `productResponse` o en el listado

### QA-D005 — Sin transacciones de base de datos en operaciones de descuento
- Endpoints: `POST/PUT /discount-requests`, `POST .../approve`, `POST .../reject`, `DELETE`
- Severidad: **menor**
- Pasos: Revisar codigo de servicio Go vs Laravel
- Esperado: Operaciones de escritura usan transacciones para garantizar consistencia
- Observado: Go no usa transacciones; Laravel usa `DB::beginTransaction() / commit() / rollBack()` en create, update, approve, reject, delete
- Evidencia: `service.go` metodos `Create`, `Update`, `Approve`, `Reject`, `Delete` — no hay `tx.Begin()` ni `tx.Commit()`
- Riesgo: Si `Create` falla despues de escribir el registro principal (ej. al cargar relaciones), datos inconsistentes

### QA-D006 — Autorizacion de Update no verifica propiedad ni estado pending
- Endpoint: `PUT /api/v1/discount-requests/:id`
- Severidad: **sugerencia**
- Pasos:
  1. Receptionist crea descuento (pending, user_id=receptionist)
  2. Otro receptionist intenta actualizarlo
- Esperado (Laravel): Solo el creador puede actualizar su propio descuento, y solo si esta pending. Admin puede actualizar cualquiera.
- Observado (Go): Cualquier usuario con rol receptionist o admin puede actualizar cualquier descuento (no hay check de `user_id` ni `status == pending`)
- Evidencia: `routes.go` linea 425-428: `PUT /:id` protegido por `jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist)` sin verificacion adicional de ownership
- Contraste Laravel: `UpdateDiscountRequestRequest.php` linea 11-24: `authorize()` verifica `$user->role === 'admin'` OR (`$discountRequest->user_id === $user->id && $discountRequest->isPending()`)

### QA-D007 — GetBestDiscount incluye filtro is_global que Laravel no tiene
- Endpoint: `GET /api/v1/discounts/best?lens_id=X`
- Severidad: **sugerencia**
- Pasos:
  1. Tener descuento con `patient_id=NULL` y `is_global=false` aprobado
  2. Llamar `discounts/best?lens_id=X` (sin patient_id)
- Esperado (Laravel): Retorna el descuento (Laravel filtra por `patient_id IS NULL`, no por `is_global`)
- Observado (Go): No retorna el descuento (Go filtra `patient_id IS NULL OR is_global = true`, por lo que un descuento con `is_global=false` no califica)
- Evidencia codigo:
  - Laravel `ProductDiscountService.php` linea 26: `$query->whereNull('patient_id')` (sin mencion de is_global)
  - Go `discount_repository.go` linea 122: `Where("patient_id IS NULL OR is_global = true")` (condicion extra)
- Impacto: Descuentos no-globales sin paciente asignado no seran retornados por Go como "best discount", pero si por Laravel

---

## OK (sin incidencias)

| # | Endpoint | Metodo | Notas |
|---|----------|--------|-------|
| 1 | `/discount-requests` | GET | Lista con paginacion y filtros (status, product_id) OK |
| 2 | `/discount-requests/:id` | GET | Get by ID con relaciones cargadas OK |
| 3 | `/discount-requests` | POST | Create: admin auto-aprueba, receptionist crea pending OK |
| 4 | `/discount-requests/:id/approve` | POST | Admin aprueba pending, rechaza ya-approved OK |
| 5 | `/discount-requests/:id/reject` | POST | Admin rechaza pending, solo admin OK |
| 6 | `/discount-requests/:id` | DELETE | Admin elimina (soft delete), receptionist recibe 403 OK |
| 7 | `/products/:id/discount-info` | GET | Best discount con/sin patient_id OK |
| 8 | `/discounts/best` | GET | Best discount lookup con lens_id + patient_id OK |
| 9 | `/products/:id/calculate-price` | GET | Calculo de precio con descuento OK |
| 10 | `/discounts?product_id=X&patient_id=Y` | GET | Active discounts con prioridad paciente OK |
| 11 | `/active-discounts` (legacy) | GET | Mismo comportamiento que /discounts OK |
| 12 | Product show `has_discounts` | GET | `/products/:id` incluye has_discounts OK |
| 13 | RBAC: receptionist no aprueba | POST | 403 forbidden OK |
| 14 | RBAC: receptionist no elimina | DELETE | 403 forbidden OK |
| 15 | Validacion: solo pending se aprueba | POST | Error clear: "only pending requests can be approved" OK |
| 16 | Auto-aprobacion admin | POST | Admin crea → status=approved, approved_by, approved_at OK |
| 17 | Calculo discounted_price en create | POST | `price * (1 - pct/100)` correcto OK |
| 18 | Filtro por status en listado | GET | `?status=approved` filtra correctamente OK |

---

## Comparativa Laravel vs Go: Feature Coverage Matrix

| Feature | Laravel | Go | Match? |
|---------|---------|-----|--------|
| List discount requests | `GET /discount-requests` | `GET /discount-requests` | ✅ |
| Get discount by ID | `GET /discount-requests/{id}` | `GET /discount-requests/:id` | ✅ |
| Create discount | `POST /discount-requests` | `POST /discount-requests` | ✅ |
| Update discount | `PUT /discount-requests/{id}` | `PUT /discount-requests/:id` | ⚠️ (autorizacion difiere) |
| Delete discount | `DELETE /discount-requests/{id}` | `DELETE /discount-requests/:id` | ✅ |
| Approve discount | `POST .../{id}/approve` | `POST .../:id/approve` | ✅ |
| Reject discount | `POST .../{id}/reject` | `POST .../:id/reject` | ✅ |
| Product discounts list | `GET /products/{id}/discounts` → lista | `GET /products/:id/discounts` → discount-info | ❌ **QA-D001** |
| Product discount info | `GET /products/{id}/discount-info` | `GET /products/:id/discount-info` | ✅ |
| Product active discounts | `GET /products/{id}/active-discounts` → todos | `GET /products/:id/active-discounts` → solo globales | ❌ **QA-D003** |
| Calculate price | `POST /products/{id}/calculate-price` | `GET /products/:id/calculate-price` | ⚠️ (metodo HTTP difiere) |
| Active discounts standalone | `GET /active-discounts` | `GET /active-discounts` + `GET /discounts` | ✅ |
| Best discount lookup | Embebido en discount-info | `GET /discounts/best` | ✅ (nuevo en Go) |
| DB transactions | SI (create/update/approve/reject/delete) | NO | ❌ **QA-D005** |
| Recalculate price on update | SI | NO | ❌ **QA-D002** |
| has_discounts in product list | SI (via resource) | SI (show) / NO (list) | ❌ **QA-D004** |
| Update authorization | Owner+pending OR admin | Admin+receptionist (sin check) | ❌ **QA-D006** |
| GetBestDiscount query | patient_id IS NULL OR patient_id=X | + is_global=true | ❌ **QA-D007** |

---

## Handoff al agente de correccion

**Archivo fuente:** `.planning/qa/FINDINGS-DISCOUNT-2026-04-28.md`

**IDs a corregir (orden de prioridad):**

1. **QA-D001** (bloqueante) — `products/:id/discounts` retorna discount-info en vez de lista de descuentos
2. **QA-D002** (bloqueante) — `discounted_price` no se recalcula al actualizar `discount_percentage`
3. **QA-D003** (mayor) — `products/:id/active-discounts` solo retorna globales, debe retornar todos
4. **QA-D004** (menor) — `has_discounts` ausente en product list
5. **QA-D005** (menor) — Sin transacciones DB en operaciones de escritura
6. **QA-D006** (sugerencia) — Update sin verificacion de ownership + estado pending
7. **QA-D007** (sugerencia) — `GetBestDiscount` filtra por `is_global` extra vs Laravel

**Recomendado:** Usar regla `convision-qa-gap-fixer` con este archivo como fuente.

**Notas para el fixer:**
- QA-D001: Cambiar `handler_product.go:GetProductDiscounts` para retornar lista de descuentos (como `ListActive` pero sin filtrar por global)
- QA-D002: Agregar recalculo en `service.go:Update` cuando `input.DiscountedPrice == 0`
- QA-D003: Crear metodo `ListActiveForProduct` en repositorio/handler que retorne todos los aprobados sin filtro de paciente
- QA-D004: Agregar `has_discounts` en `productResponse()` o en el handler de list
- QA-D005: Agregar `db.Transaction()` en los metodos de escritura del servicio
- QA-D006: Agregar check de `user_id` y `status == pending` en `Update` del servicio (o middleware)
- QA-D007: Evaluar si remover filtro `is_global` de `GetBestForProduct` para match con Laravel

---

## Resolución (2026-04-28 21:43)

Todos los 7 hallazgos han sido corregidos y verificados con curl:

| ID | Fix | Archivos modificados |
|----|-----|---------------------|
| QA-D001 | `GetProductDiscounts` ahora retorna lista de descuentos (usa `ListAllActiveForProduct`) | `handler_product.go`, `discount/service.go` |
| QA-D002 | `Update` recalcula `discounted_price` si `input.DiscountedPrice == 0` | `discount/service.go` |
| QA-D003 | `GetProductActiveDiscounts` ahora retorna todos los aprobados (no solo globales) | `handler_product.go` |
| QA-D004 | `has_discounts` agregado en `ListProducts`, `ListProductsByCategory`, y search | `handler_product.go` |
| QA-D005 | Todas las operaciones de escritura envueltas en `db.Transaction()` | `discount/service.go`, `cmd/api/main.go` |
| QA-D006 | `Update` verifica ownership (`user_id`) y `status == pending` para no-admin | `discount/service.go`, `handler_discount.go` |
| QA-D007 | `GetBestForProduct` sin `patient_id` ahora filtra solo por `patient_id IS NULL` | `discount_repository.go` |
