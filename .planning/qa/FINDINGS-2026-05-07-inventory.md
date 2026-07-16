---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-07T14:02:00-05:00
updated: 2026-05-07T14:15:00-05:00
roles_tested: [admin]
scope: Módulo Inventario (/admin/inventory)
---

# QA FINDINGS — Módulo Inventario (2026-05-07)

## Resumen ejecutivo

- Pantallas / flujos verificados: 12 (Stock, Almacenes, Ubicaciones, Transferencias, Catálogo Lentes, Detalle Lente, Agregar Stock, Ajustes, Movimientos, Filtro almacén, Búsqueda catálogo, Eliminación almacén)
- Hallazgos confirmados: 9
- Hipótesis: 0
- Sin incidencias: Login admin, GET /inventory/total-stock, GET /inventory/lens-catalog (listado básico), GET /warehouses (listado), GET/POST /warehouse-locations (listado), GET /warehouses/:id, POST /warehouses, POST /warehouse-locations, PUT /warehouse-locations/:id, validación sin header X-Branch-ID

---

## Hallazgos (FAIL / GAP)

### INV-001 — BLOQUEANTE

- **Rol:** admin
- **URL:** `http://localhost:4300/admin/inventory` (tab Stock → botón "Agregar Stock")
- **Severidad:** bloqueante
- **Pasos:**
  1. Login como admin.
  2. Ir a `/admin/inventory`, tab Stock.
  3. Clic en "Agregar Stock".
  4. Seleccionar lente del dropdown (poblado por `/inventory/total-stock` con IDs del esquema tenant).
  5. Seleccionar almacén y ubicación.
  6. Clic en "Guardar".
- **Esperado:** Item creado → toast "Stock agregado".
- **Observado:** `POST /api/v1/inventory-items` devuelve HTTP 500.
- **Evidencia:**
  ```
  HTTP 500
  GORM: ERROR: insert or update on table "inventory_items" violates foreign key
  constraint "fk_inventory_items_product" (SQLSTATE 23503)
  ```
- **Causa raíz:** `inventory_items` (schema platform) tiene FK a `products` (schema platform), pero **todos los productos están en el schema tenant** (`optima_main`). Los IDs de lentes del dropdown vienen del tenant; al insertarlos en la tabla platform la FK falla.
- **Estado:** confirmado

---

### INV-002 — BLOQUEANTE

- **Rol:** admin
- **URL:** `http://localhost:4300/admin/inventory` (tab Stock → botón ojo en fila de Stock Físico)
- **Severidad:** bloqueante
- **Pasos:**
  1. Ir a `/admin/inventory`, tab Stock.
  2. En la tabla "Stock Físico" hacer clic en el botón ojo de cualquier fila.
  3. El componente `LensInventoryDetailDialog` llama `GET /api/v1/lenses/:id/inventory`.
- **Esperado:** Modal con detalle de inventario del lente.
- **Observado:** HTTP 404 — la ruta `/lenses/:id/inventory` no existe.
- **Evidencia:**
  ```
  GET http://localhost:8001/api/v1/lenses/1/inventory → 404 page not found
  ```
- **Referencia código:** [inventoryService.ts:332](convision-front/src/services/inventoryService.ts#L332) llama `/api/v1/lenses/${lensId}/inventory`; la ruta no está registrada en [routes.go](convision-api-golang/internal/transport/http/v1/routes.go).
- **Estado:** confirmado

---

### INV-003 — MAYOR

- **Rol:** admin
- **URL:** `http://localhost:4300/admin/inventory` (tab Almacenes → Eliminar almacén con ubicaciones)
- **Severidad:** mayor
- **Pasos:**
  1. Crear un almacén (`POST /warehouses`).
  2. Crear al menos una ubicación en ese almacén (`POST /warehouse-locations`).
  3. Intentar eliminar el almacén (`DELETE /warehouses/:id`).
- **Esperado:** Error amigable "El almacén tiene ubicaciones activas y no puede eliminarse" (HTTP 422) o eliminación en cascada.
- **Observado:** HTTP 500.
- **Evidencia:**
  ```
  HTTP 500
  GORM: ERROR: update or delete on table "warehouses" violates foreign key
  constraint "fk_warehouses_locations" on table "warehouse_locations" (SQLSTATE 23503)
  ```
- **Causa raíz:** `DeleteWarehouse` solo verifica items (`inventory_items`), no verifica `warehouse_locations` antes de eliminar. FK de `warehouse_locations` hace rollback sin manejo de error.
- **Estado:** confirmado

---

### INV-004 — MAYOR

- **Rol:** admin
- **URL:** API `POST /api/v1/warehouse-locations`
- **Severidad:** mayor
- **Pasos:**
  1. Crear una ubicación de almacén vía API o UI.
  2. Revisar el campo `branch_id` en la respuesta.
- **Esperado:** `branch_id` igual al branch del contexto (`X-Branch-ID: 1`).
- **Observado:** `branch_id: 0` en todas las ubicaciones creadas.
- **Evidencia:**
  ```json
  {"id":1,"branch_id":0,"warehouse_id":1,"name":"Estante A",...}
  ```
- **Causa raíz:** `CreateLocation` en [handler_inventory.go](convision-api-golang/internal/transport/http/v1/handler_inventory.go) no setea `input.BranchID` (a diferencia de `CreateWarehouse` que sí lo hace en línea 63).
- **Estado:** confirmado

---

### INV-005 — MAYOR

- **Rol:** admin
- **URL:** API `PUT /api/v1/warehouses/:id`
- **Severidad:** mayor
- **Pasos:**
  1. Crear almacén con `name`, `code`, `address`, `city`, `notes`.
  2. Hacer PUT enviando solo `{"name":"Nuevo Nombre","status":"active"}`.
  3. Revisar el almacén con GET.
- **Esperado:** Solo `name` se actualiza; `address`, `city`, `notes` conservan valores originales.
- **Observado:** `address`, `city` y `notes` se vacían a `""`.
- **Evidencia:**
  ```
  PUT body: {"name":"Almacen QA Actualizado","status":"active"}
  GET response: {"address":"","city":"","notes":"","name":"Almacen QA Actualizado"}
  ```
- **Causa raíz:** `WarehouseUpdateInput` sin punteros — campos no enviados se deserializan como string vacío y la capa de update sobreescribe todos los campos.
- **Estado:** confirmado

---

### INV-006 — MENOR

- **Rol:** admin
- **URL:** `GET /api/v1/inventory/total-stock?warehouse_id=X` / `?brand_id=X`
- **Severidad:** menor
- **Pasos:**
  1. Hacer GET a `/inventory/total-stock?brand_id=1` o `?warehouse_id=999`.
  2. Revisar el campo `data` cuando no hay resultados.
- **Esperado:** `{"data": [], "total": 0, ...}`
- **Observado:** `{"data": null, "total": 0, ...}`
- **Evidencia:**
  ```json
  GET /inventory/total-stock?brand_id=1 → {"current_page":1,"data":null,"last_page":1,"per_page":3,"total":0}
  GET /inventory/total-stock?warehouse_id=1 → {"current_page":1,"data":null,"last_page":1,"per_page":3,"total":0}
  ```
- **Impacto:** Frontend usa `data ?? []` para evitar crashes — actualmente mitigado, pero es inconsistente con el resto de endpoints que devuelven `data: []`.
- **Estado:** confirmado

---

### INV-007 — MENOR

- **Rol:** admin
- **URL:** `GET /api/v1/inventory/lens-catalog?search=MARCA`
- **Severidad:** menor
- **Pasos:**
  1. Buscar un lente por nombre de marca (e.g. `search=MAORI` o `search=FOCUS`).
  2. Revisar resultados.
- **Esperado:** Resultados que coincidan con la marca buscada.
- **Observado:** 0 resultados para búsquedas por marca. Solo funciona para `internal_code` e `identifier`.
- **Evidencia:**
  ```
  GET /inventory/lens-catalog?search=MAORI → {"total":0, "data":[]}
  GET /inventory/lens-catalog?search=L1   → {"total":114, ...}  (busca por código)
  ```
- **Causa raíz:** [product_repository.go:297-299](convision-api-golang/internal/platform/storage/postgres/product_repository.go#L297) solo hace ILIKE en `identifier` y `internal_code`, no en `brands.name`.
- **Estado:** confirmado

---

### INV-008 — MAYOR (GAP ARQUITECTURA)

- **Rol:** admin
- **URL:** `GET /api/v1/inventory` / `GET /api/v1/inventory-items` / `GET /api/v1/inventory/movements` / `GET /api/v1/inventory/adjustments` / `GET /api/v1/inventory-transfers`
- **Severidad:** mayor
- **Pasos:**
  1. Hacer GET a cualquiera de los endpoints CRUD de inventario.
  2. Comparar con `/inventory/total-stock`.
- **Esperado:** Los endpoints CRUD muestran el mismo inventario que `total-stock`.
- **Observado:** Todos los endpoints CRUD devuelven `total: 0` aunque `total-stock` muestra 5.296 productos con stock.
- **Evidencia:**
  ```
  GET /inventory-items          → {"total":0}
  GET /inventory/movements      → {"total":0}
  GET /inventory/adjustments    → {"total":0}
  GET /inventory-transfers      → {"total":0}
  GET /inventory/total-stock    → {"total":5296}  ← datos reales
  ```
- **Causa raíz:** Bifurcación de schemas en el mismo módulo:
  - **Bulk import** y **total-stock/lens-catalog** usan `tenantDBFromCtx` (schema tenant `optima_main`).
  - **CRUD de inventory-items, warehouses, locations, transfers, adjustments, movements** usa `s.db` (schema platform — vacío).
  - Los 5.296 ítems de total-stock viven en el tenant; el CRUD lee/escribe en el platform (vacío).
- **Estado:** confirmado

---

### INV-009 — MENOR

- **Rol:** admin
- **URL:** `GET /api/v1/products/:id/inventory-summary` con product_id de tenant
- **Severidad:** menor
- **Pasos:**
  1. Obtener un product_id de la plataforma (ej. 33077).
  2. GET `/products/33077/inventory-summary`.
- **Esperado:** Resumen de stock del producto con ítems y total.
- **Observado:** `{"product_id":33077,"items":[],"total":0}` — siempre vacío.
- **Evidencia:**
  ```json
  GET /products/33077/inventory-summary → {"product_id":33077,"items":[],"total":0}
  ```
- **Causa raíz:** Derivado de INV-008: `GetProductInventorySummary` consulta el platform DB (sin items); los items reales están en el tenant DB.
- **Estado:** confirmado

---

## OK (sin incidencias)

| Rol | Ruta / Endpoint | Notas |
|-----|------|--------|
| admin | `POST /api/v1/auth/login` | Login correcto, JWT válido |
| admin | `GET /api/v1/warehouses` | Listado con filtro branch_id funciona |
| admin | `POST /api/v1/warehouses` | Creación correcta, `branch_id` seteado del contexto |
| admin | `GET /api/v1/warehouses/:id` | Devuelve locations anidadas |
| admin | `GET /api/v1/warehouse-locations` | Listado OK |
| admin | `POST /api/v1/warehouse-locations` | Creación OK (excepto branch_id=0, ver INV-004) |
| admin | `PUT /api/v1/warehouse-locations/:id` | Update funciona |
| admin | `DELETE /api/v1/warehouse-locations/:id` | Elimina correctamente ubicaciones vacías |
| admin | `GET /api/v1/inventory/total-stock` | Devuelve 5.296 productos con stock real (tenant) |
| admin | `GET /api/v1/inventory/lens-catalog` | Devuelve catálogo 1.002 lentes correctamente |
| admin | `GET /api/v1/inventory/lens-catalog?search=L1` | Búsqueda por código funciona |
| admin | Sin header `X-Branch-ID` | Devuelve HTTP 400 "Sede requerida" — correcto |
| admin | `POST /api/v1/inventory/adjustments` (body inválido) | Validación `adjustment_reason` en español funciona |

---

## Handoff al agente de corrección

Archivo fuente: `.planning/qa/FINDINGS-2026-05-07-inventory.md`

### Orden de prioridad

| ID | Severidad | Descripción breve | Archivo(s) afectado(s) |
|----|-----------|-------------------|------------------------|
| INV-001 | bloqueante | Agregar stock falla 500 — FK cross-schema | `inventory_item_repository.go`, `service.go`, `db.go` |
| INV-002 | bloqueante | Ruta `/lenses/:id/inventory` inexistente — 404 | `routes.go`, `handler_inventory.go` |
| INV-003 | mayor | DELETE warehouse con ubicaciones → 500 sin manejo | `service.go` (DeleteWarehouse), `warehouse_repository.go` |
| INV-004 | mayor | `warehouse_location.branch_id` siempre 0 | `handler_inventory.go` (CreateLocation) |
| INV-005 | mayor | PUT warehouse borra campos no enviados (data loss) | `service.go` (UpdateWarehouse), `domain/inventory.go` |
| INV-008 | mayor | CRUD platform vs tenant DB split — todos los endpoints de items/transfers/adjustments/movements vacíos | Arquitectura: `service.go`, `handler_inventory.go`, `main.go` |
| INV-006 | menor | `data: null` en vez de `[]` en total-stock filtrado | `inventory_item_repository.go` (TotalStockPerProduct) |
| INV-007 | menor | Búsqueda catálogo no incluye nombre de marca | `product_repository.go` (ListLensCatalog) |
| INV-009 | menor | `/products/:id/inventory-summary` siempre vacío | Derivado de INV-008 |

### Notas para el agente corrector

- **INV-001 e INV-008** son la misma raíz: el servicio de inventario debe usar `tenantDBFromCtx` para CRUD de `inventory_items`, igual que hace `TotalStockPerProduct`. Resolver esto cierra INV-001, INV-008 e INV-009 en cascada.
- **INV-002**: Registrar la ruta `GET /products/:id/inventory-summary` también como alias `/lenses/:id/inventory` (o actualizar el frontend para usar `/products/:id/inventory-summary`).
- **INV-004**: En `CreateLocation` del handler, agregar `input.BranchID = branchmw.BranchIDFromCtx(c)` (igual a como lo hace `CreateWarehouse`).
- **INV-005**: Cambiar `WarehouseUpdateInput` para usar punteros (`*string`) en campos opcionales, y en `UpdateWarehouse` usar updates selectivos.
- Comando sugerido: "Con `convision-qa-fixer`, cerrar INV-001..INV-009 usando `.planning/qa/FINDINGS-2026-05-07-inventory.md` como fuente."
