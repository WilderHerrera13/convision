# Gap Analysis — Módulo Bodega/Inventario: Laravel vs Go

Documento de comparación entre la implementación Laravel original (`convision-api/`) y la implementación Go activa (`convision-api-golang/`).

**Fecha:** 2026-04-24  
**Referencia Laravel:** [laravel-warehouse-inventory-module.md](./laravel-warehouse-inventory-module.md)

---

## Resumen ejecutivo

| Categoría | Estado |
|---|---|
| Entidades / Domain structs | ✅ Completo |
| Repositorios | ✅ Completo |
| Servicio | ✅ Mayormente completo |
| Handlers HTTP | ⚠️ 2 endpoints faltantes |
| Rutas | ⚠️ 2 rutas faltantes |
| Migraciones SQL | 🔴 Crítico — 3 tablas sin migración SQL |
| Validaciones de negocio | 🔴 Crítico — 3 reglas sin implementar |
| RBAC | ⚠️ Diferencias con Laravel |
| Integraciones (compras/ventas) | ⚠️ Sin implementar en ninguno de los dos |

---

## 1. Endpoints faltantes en Go

### 1.1 `GET /warehouse-locations/{id}/inventory` — FALTANTE

**Laravel:** `WarehouseLocationController@inventoryItems`  
Retorna los `InventoryItem` de una ubicación específica (paginado, eager-loads lens+warehouse).

**Go:** No existe esta ruta. El grupo `/warehouse-locations` solo tiene CRUD estándar.

**Impacto:** No se puede consultar el stock de una ubicación específica sin filtrar el endpoint genérico `/inventory-items?warehouse_location_id=X`.

**Fix requerido:**
```go
// routes.go — agregar dentro del grupo warehouseLocations
warehouseLocations.GET("/:id/inventory", h.ListLocationInventoryItems)

// handler_inventory.go — nuevo handler
func (h *Handler) ListLocationInventoryItems(c *gin.Context) {
    id := parseUintParam(c, "id")
    // verificar que la location existe
    // listar inventory items de esa location con paginación
}
```

---

### 1.2 `GET /products/{product_id}/inventory-summary` — FALTANTE

**Laravel:** `InventoryItemController@productInventory`  
Retorna el desglose de inventario de un producto específico: todas sus ubicaciones, cantidades, estados; eager-loads brand, supplier, category, inventoryItems.warehouse, inventoryItems.warehouseLocation.

**Go:** No existe. El handler `GetTotalStock` solo retorna un `int64` global, sin desglose por producto/ubicación.

**Impacto:** Para ver el inventario de un producto específico hay que cruzar datos manualmente en el frontend con `/inventory-items?product_id=X`.

**Fix requerido:**
```go
// routes.go — en el grupo de products (o en inventory)
products.GET("/:id/inventory-summary", h.GetProductInventorySummary)

// handler_inventory.go — nuevo handler
// Retorna: product con brand/supplier/category + []InventoryItem con warehouse+location
```

---

## 2. Diferencias en `GET /inventory/total-stock`

**Laravel:** Retorna una lista de **productos** con su `total_quantity` calculado. Soporta filtros por `warehouse_id`, `warehouse_location_id`, `category_id`, `brand_id`, `supplier_id`.

**Go:** `TotalStock()` en el repositorio solo hace `SUM(quantity)` global y retorna un `int64`. El handler `GetTotalStock` retorna ese único número.

**Gap:** El endpoint Go no es equivalente al Laravel. Laravel retorna una colección de productos con stock, Go retorna un entero global.

**Fix requerido:** Agregar método al repositorio / servicio que agrupe por `product_id` y soporte los filtros de Laravel.

---

## 3. Validaciones de negocio faltantes en Go

### 3.1 Validación location → warehouse al crear/actualizar InventoryItem

**Laravel:** Antes de crear o actualizar un `InventoryItem`, valida que `warehouse_location_id` pertenezca al `warehouse_id` indicado. Si no coinciden → HTTP 422.

**Go:** No hay evidencia de esta validación en el servicio. El repositorio solo hace `INSERT` o `UPDATE` sin verificar la consistencia warehouse ↔ location.

**Riesgo:** Se puede crear un InventoryItem asignando una ubicación de una bodega diferente a la indicada, corrompiendo los datos.

**Fix requerido:**
```go
// internal/inventory/service.go — en CreateItem y UpdateItem
func (s *Service) validateLocationBelongsToWarehouse(locationID, warehouseID uint) error {
    loc, err := s.locationRepo.GetByID(locationID)
    if err != nil { return err }
    if loc.WarehouseID != warehouseID {
        return &domain.ErrValidation{Message: "la ubicación no pertenece a la bodega indicada"}
    }
    return nil
}
```

---

### 3.2 Validación de unicidad (product_id, warehouse_location_id) en InventoryItem

**Laravel:** Valida que no exista ya un `InventoryItem` con el mismo `(product_id, warehouse_location_id)` antes de crear. También valida al actualizar si cambian esos campos.

**Go:** No hay validación a nivel de servicio. Si existe alguna restricción es solo a nivel de BD (índice), pero si no hay UNIQUE constraint en la migración, se pueden crear duplicados.

**Riesgo:** Un producto puede tener múltiples InventoryItems en la misma ubicación, duplicando stock y rompiendo la integridad del inventario.

**Fix requerido:**
1. Agregar UNIQUE constraint en la migración: `UNIQUE (product_id, warehouse_location_id)`
2. Agregar validación a nivel de servicio en `CreateItem` y `UpdateItem`

---

### 3.3 Validación de quantity = 0 al eliminar InventoryItem

**Laravel:** Antes de eliminar un `InventoryItem`, valida que su `quantity` sea 0. Si `quantity > 0` → lanza excepción (HTTP 422).

**Go:** `DeleteItem` en el servicio llama directamente a `itemRepo.Delete(id)` sin verificar la cantidad. No hay protección contra eliminar un ítem con stock activo.

**Riesgo:** Se puede eliminar un ítem con stock real, perdiendo el registro del inventario.

**Fix requerido:**
```go
// internal/inventory/service.go — en DeleteItem
func (s *Service) DeleteItem(id uint) error {
    item, err := s.itemRepo.GetByID(id)
    if err != nil { return err }
    if item.Quantity > 0 {
        return &domain.ErrValidation{Message: "no se puede eliminar un ítem con stock activo"}
    }
    return s.itemRepo.Delete(id)
}
```

---

### 3.4 Validación de quantity = 0 al eliminar Warehouse

**Laravel:** No permite eliminar una Bodega si tiene `inventoryItems` asociados.

**Go:** `DeleteWarehouse` llama directamente a `warehouseRepo.Delete(id)` sin verificar si la bodega tiene ítems. Solo verifica que la bodega exista.

**Riesgo:** Se puede eliminar una bodega con inventario activo, perdiendo la trazabilidad.

**Fix requerido:**
```go
// internal/inventory/service.go — en DeleteWarehouse
func (s *Service) DeleteWarehouse(id uint) error {
    // verificar que no tenga inventory items
    items, _, err := s.itemRepo.List(map[string]any{"warehouse_id": id}, 1, 1)
    if err != nil { return err }
    if len(items) > 0 {
        return &domain.ErrValidation{Message: "no se puede eliminar una bodega con inventario activo"}
    }
    return s.warehouseRepo.Delete(id)
}
```

---

## 4. Problema crítico — Migraciones SQL incompletas

### 4.1 Tablas solo en AutoMigrate, no en SQL migrations

**Tablas afectadas:**
- `warehouse_locations`
- `inventory_items`
- `inventory_transfers`

**Estado Go:** Estas tablas solo se crean via `AutoMigrate` de GORM (`db.go`). No existen archivos `.sql` en `db/migrations/` para ellas.

**Impacto en producción:** `AutoMigrate` solo corre con `APP_ENV=local`. En staging/producción, estas tablas no existen a menos que se creen manualmente. Según `DATABASE_GUIDE.md`, las migraciones SQL son **obligatorias para staging/prod**.

**Fix requerido:** Crear `NNN_create_warehouse_locations_inventory.up.sql` con:

```sql
-- warehouse_locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id              BIGSERIAL PRIMARY KEY,
    warehouse_id    BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    type            VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (warehouse_id, name),
    UNIQUE (code)
);

-- inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
    id                      BIGSERIAL PRIMARY KEY,
    product_id              BIGINT NOT NULL REFERENCES products(id),
    warehouse_id            BIGINT NOT NULL REFERENCES warehouses(id),
    warehouse_location_id   BIGINT REFERENCES warehouse_locations(id),
    quantity                INT NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available','reserved','damaged','sold','returned','lost')),
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, warehouse_location_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_warehouse ON inventory_items(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);

-- inventory_transfers
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id                          BIGSERIAL PRIMARY KEY,
    lens_id                     BIGINT REFERENCES lenses(id),
    source_location_id          BIGINT NOT NULL REFERENCES warehouse_locations(id),
    destination_location_id     BIGINT NOT NULL REFERENCES warehouse_locations(id),
    quantity                    INT NOT NULL,
    transferred_by              BIGINT REFERENCES users(id),
    notes                       TEXT,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','completed','cancelled')),
    completed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON inventory_transfers(status);
```

---

### 4.2 Conflicto de schema en `warehouses`

**SQL migration Go** (`000014_create_inventory.up.sql`) crea `warehouses` con:
```
id, name, location, clinic_id, is_active, created_at, updated_at
```

**Domain struct Go** (`domain/inventory.go`) define `Warehouse` con:
```
ID, Name, Code, Address, City, Status, Notes, CreatedAt, UpdatedAt
```

**Problema:** Los campos `Code`, `Address`, `City`, `Status`, `Notes` del struct NO están en la migración SQL. `AutoMigrate` los agrega pero la migración base no los crea. Además, `location` y `is_active` de la SQL no tienen equivalente en el struct (el struct usa `Address` y `Status`).

**Riesgo:** En producción, la tabla `warehouses` tiene columnas diferentes a las que espera el ORM. Los campos `Code` y `Status` no existen en la tabla real.

**Fix requerido:** Actualizar la migración SQL de `warehouses` para que coincida con el struct del domain, o crear una migración adicional que agregue las columnas faltantes.

---

## 5. Diferencias de RBAC

| Operación | Laravel | Go |
|---|---|---|
| GET (lectura) | `auth:api` (cualquier rol autenticado) | JWT requerido (cualquier rol) |
| POST (crear) | `auth:api` (cualquier rol autenticado) | `RoleAdmin` requerido |
| PUT (actualizar) | `auth:api` (cualquier rol autenticado) | `RoleAdmin` requerido |
| DELETE (eliminar) | `auth:api` (cualquier rol autenticado) | `RoleAdmin` requerido |

**Nota:** En Go las escrituras son más restrictivas (solo Admin). Verificar con el equipo si esto es correcto o si otros roles (Recepcionista) deben poder crear/modificar inventario.

---

## 6. Lo que Go tiene y Laravel NO tiene (mejoras)

| Feature | Descripción |
|---|---|
| `POST /inventory/adjust` | Ajuste directo de stock por producto (suma/resta con `reason`). Laravel no tiene este endpoint. |
| `inventory_movements` table | Tabla SQL para registrar movimientos de stock (tipo: in/out/adjustment/transfer) con `unit_cost`, `reference`, `created_by`. Laravel no tiene auditoría de movimientos. |
| `purchases` + `purchase_items` tables | Tablas SQL de compras integradas en el módulo de inventario. |
| Estructura multi-clínica | Go incluye `clinic_id` en warehouses (via migración SQL). Laravel no tiene aislamiento multi-clínica en este módulo. |

---

## 7. Consistencia del campo `lens_id` vs `product_id`

**Laravel:** La migración usa `product_id` pero el modelo y los requests usan `lens_id`. Es una inconsistencia en el código Laravel original.

**Go:** Adoptó `lens_id` en el domain struct y el filterlist del repositorio, replicando la inconsistencia de Laravel.

**Recomendación:** Decidir si el campo debe llamarse `product_id` (semántica correcta para el inventario genérico) o `lens_id` (consistente con el dominio de ventas). Si se cambia, crear una migración `ALTER TABLE inventory_transfers RENAME COLUMN lens_id TO product_id` y actualizar el domain struct.

---

## 8. Estado general por componente

| Componente | Laravel | Go | Equivalente |
|---|---|---|---|
| `Warehouse` struct | ✅ | ✅ | Sí, campos iguales |
| `WarehouseLocation` struct | ✅ | ✅ | Sí, campos iguales |
| `InventoryItem` struct | ✅ | ✅ | Sí, incluye los 6 estados |
| `InventoryTransfer` struct | ✅ | ✅ | Sí (misma inconsistencia lens_id) |
| CRUD Warehouses | ✅ | ✅ | 5/5 endpoints |
| CRUD Warehouse Locations | ✅ | ✅ | 5/5 endpoints |
| `GET /warehouses/{id}/locations` | ✅ | ✅ | Igual |
| `GET /warehouse-locations/{id}/inventory` | ✅ | ❌ | **FALTANTE en Go** |
| CRUD Inventory Items | ✅ | ✅ | 5/5 endpoints |
| `GET /inventory/total-stock` | ✅ (por producto, con filtros) | ⚠️ (solo int64 global) | **Diferente** |
| `GET /products/{id}/inventory-summary` | ✅ | ❌ | **FALTANTE en Go** |
| CRUD Inventory Transfers | ✅ | ✅ | 5/5 endpoints |
| `TransferredBy` desde JWT | ✅ | ✅ | Igual |
| Validación location ↔ warehouse | ✅ | ❌ | **FALTANTE en Go** |
| Validación unicidad (product+location) | ✅ | ❌ | **FALTANTE en Go** |
| Validación quantity=0 para delete item | ✅ | ❌ | **FALTANTE en Go** |
| Validación no-delete warehouse con items | ✅ | ❌ | **FALTANTE en Go** |
| SQL migrations completas | ✅ | ❌ | 3 tablas sin migración SQL |
| Historial de movimientos | ❌ | ✅ | Go mejora sobre Laravel |
| Ajuste directo de stock (`/adjust`) | ❌ | ✅ | Go mejora sobre Laravel |
| Multi-clínica (clinic_id) | ❌ | ⚠️ (parcial) | Solo en migración SQL, no en struct |

---

## 9. Plan de acción priorizado

### Prioridad 1 — Crítico (bloquea producción)

1. **Crear migración SQL** para `warehouse_locations`, `inventory_items`, `inventory_transfers` con todos los constraints correctos.
2. **Resolver conflicto de schema** en `warehouses` — alinear la migración SQL con el domain struct.
3. **Agregar validación quantity=0** antes de eliminar `InventoryItem`.
4. **Agregar validación no-delete** de `Warehouse` si tiene inventory items.

### Prioridad 2 — Importante (parity con Laravel)

5. **Agregar validación location ↔ warehouse** al crear/actualizar `InventoryItem`.
6. **Agregar UNIQUE constraint** `(product_id, warehouse_location_id)` en `inventory_items` + validación a nivel de servicio.
7. **Implementar `GET /warehouse-locations/{id}/inventory`** con paginación.
8. **Corregir `GET /inventory/total-stock`** para retornar lista de productos con total_quantity y soportar filtros.

### Prioridad 3 — Nice-to-have

9. **Implementar `GET /products/{id}/inventory-summary`** con desglose por ubicación.
10. **Resolver nomenclatura `lens_id` vs `product_id`** en `inventory_transfers`.
11. **Revisar RBAC** — confirmar si roles distintos a Admin necesitan escribir en inventario.

---

*Documento generado el 2026-04-24.*
