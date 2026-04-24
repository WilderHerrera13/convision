# Módulo de Bodega e Inventario — Laravel (convision-api)

Documento de referencia para la migración de Laravel → Go.  
Propósito: identificar gaps entre la implementación Laravel original y la implementación Go.

---

## 1. Modelos

### 1.1 Warehouse

**Archivo:** `app/Models/Warehouse.php`  
**Tabla:** `warehouses`

```php
class Warehouse extends Model {
    use HasFactory, ApiFilterable;
    
    const STATUS_ACTIVE   = 'active';
    const STATUS_INACTIVE = 'inactive';
    
    protected $fillable = [
        'name',     // Nombre de la bodega
        'code',     // Código único (slug o código corto)
        'address',  // Dirección física
        'city',     // Ciudad
        'status',   // active | inactive
        'notes',    // Notas libres
    ];
}
```

**Relaciones:**

| Relación | Tipo | Modelo destino |
|---|---|---|
| `locations()` | `hasMany` | `WarehouseLocation` |
| `inventoryItems()` | `hasMany` | `InventoryItem` |

---

### 1.2 WarehouseLocation

**Archivo:** `app/Models/WarehouseLocation.php`  
**Tabla:** `warehouse_locations`

```php
class WarehouseLocation extends Model {
    use HasFactory, ApiFilterable;
    
    const STATUS_ACTIVE   = 'active';
    const STATUS_INACTIVE = 'inactive';
    
    protected $fillable = [
        'warehouse_id',   // FK → warehouses
        'name',           // Nombre de la ubicación
        'code',           // Código único (ej. VITRINA-LENTES)
        'type',           // Shelf | Zone | Bin
        'status',         // active | inactive
        'description',    // Descripción libre
    ];
}
```

**Relaciones:**

| Relación | Tipo | Modelo destino | FK |
|---|---|---|---|
| `warehouse()` | `belongsTo` | `Warehouse` | `warehouse_id` |
| `inventoryItems()` | `hasMany` | `InventoryItem` | — |
| `sourceTransfers()` | `hasMany` | `InventoryTransfer` | `source_location_id` |
| `destinationTransfers()` | `hasMany` | `InventoryTransfer` | `destination_location_id` |

---

### 1.3 InventoryItem

**Archivo:** `app/Models/InventoryItem.php`  
**Tabla:** `inventory_items`

```php
class InventoryItem extends Model {
    use HasFactory, ApiFilterable;
    
    const STATUS_AVAILABLE = 'available';
    const STATUS_RESERVED  = 'reserved';
    const STATUS_DAMAGED   = 'damaged';
    const STATUS_SOLD      = 'sold';      // Solo en el modelo, NO en la migración
    const STATUS_RETURNED  = 'returned';  // Solo en el modelo, NO en la migración
    const STATUS_LOST      = 'lost';      // Solo en el modelo, NO en la migración
    
    protected $fillable = [
        'product_id',              // FK → products
        'warehouse_id',            // FK → warehouses
        'warehouse_location_id',   // FK → warehouse_locations (nullable)
        'quantity',                // Cantidad en stock (integer)
        'status',                  // Ver constantes arriba
        'notes',                   // Notas libres
    ];
    
    protected $casts = [
        'quantity' => 'integer',
    ];
}
```

**Relaciones:**

| Relación | Tipo | Modelo destino |
|---|---|---|
| `product()` | `belongsTo` | `Product` |
| `warehouse()` | `belongsTo` | `Warehouse` |
| `warehouseLocation()` | `belongsTo` | `WarehouseLocation` |

**Regla de unicidad:** Un producto NO puede tener dos `InventoryItem` en la misma ubicación (`product_id + warehouse_location_id` es unique).

---

### 1.4 InventoryTransfer

**Archivo:** `app/Models/InventoryTransfer.php`  
**Tabla:** `inventory_transfers`

> **Inconsistencia conocida:** el modelo usa `lens_id` pero la migración define la columna como `product_id`.  
> Los Form Requests también validan el campo como `lens_id`.

```php
class InventoryTransfer extends Model {
    use HasFactory, ApiFilterable;
    
    const STATUS_PENDING   = 'pending';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';
    
    protected $fillable = [
        'lens_id',                    // FK → lenses (migración lo llama product_id)
        'source_location_id',         // FK → warehouse_locations
        'destination_location_id',    // FK → warehouse_locations
        'quantity',                   // Cantidad transferida
        'transferred_by',             // FK → users (auditoría)
        'notes',                      // Notas libres
        'status',                     // pending | completed | cancelled
        'completed_at',               // TIMESTAMP nullable
    ];
    
    protected $casts = [
        'quantity'     => 'integer',
        'completed_at' => 'datetime',
    ];
}
```

**Relaciones:**

| Relación | Tipo | Modelo destino | FK |
|---|---|---|---|
| `lens()` | `belongsTo` | `Lens` | `lens_id` |
| `sourceLocation()` | `belongsTo` | `WarehouseLocation` | `source_location_id` |
| `destinationLocation()` | `belongsTo` | `WarehouseLocation` | `destination_location_id` |
| `transferredBy()` | `belongsTo` | `User` | `transferred_by` |

---

### 1.5 Product (relaciones relevantes con inventario)

**Archivo:** `app/Models/Product.php`

```php
// Atributo calculado
getTotalQuantityAttribute() → sum(inventory_items.quantity) para este producto

// Relaciones de inventario
inventoryItems() → hasMany(InventoryItem::class)
inventoryTransfers() → hasMany(InventoryTransfer::class)

// Relaciones de atributos específicos por tipo de producto
lensAttributes()        → hasOne(ProductLensAttributes::class)
frameAttributes()       → hasOne(ProductFrameAttributes::class)
contactLensAttributes() → hasOne(ProductContactLensAttributes::class)

// Scopes
scopeHasActiveDiscounts($query)
scopeByCategory($query, $categorySlug)
```

---

## 2. Migraciones

### 2.1 Tabla: `warehouses`

**Archivo:** `2025_05_20_000001_create_warehouses_table.php`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `name` | VARCHAR(255) | NO | — | — |
| `code` | VARCHAR(255) | NO | — | UNIQUE |
| `address` | TEXT | SÍ | NULL | — |
| `city` | VARCHAR(255) | SÍ | NULL | — |
| `status` | ENUM('active','inactive') | NO | 'active' | — |
| `notes` | TEXT | SÍ | NULL | — |
| `created_at` | TIMESTAMP | SÍ | NULL | — |
| `updated_at` | TIMESTAMP | SÍ | NULL | — |

---

### 2.2 Tabla: `warehouse_locations`

**Archivo:** `2025_05_20_000002_create_warehouse_locations_table.php`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `warehouse_id` | BIGINT UNSIGNED | NO | — | FK → warehouses (CASCADE) |
| `name` | VARCHAR(255) | NO | — | — |
| `code` | VARCHAR(255) | NO | — | UNIQUE |
| `type` | VARCHAR(255) | SÍ | NULL | Shelf / Zone / Bin |
| `status` | ENUM('active','inactive') | NO | 'active' | — |
| `description` | TEXT | SÍ | NULL | — |
| `created_at` | TIMESTAMP | SÍ | NULL | — |
| `updated_at` | TIMESTAMP | SÍ | NULL | — |

**Índices adicionales:**

- `UNIQUE (warehouse_id, name)` — el nombre de ubicación debe ser único dentro de una bodega

---

### 2.3 Tabla: `inventory_items`

**Archivo:** `2025_05_20_000003_create_products_system.php`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `product_id` | BIGINT UNSIGNED | NO | — | FK → products |
| `warehouse_id` | BIGINT UNSIGNED | NO | — | FK → warehouses |
| `warehouse_location_id` | BIGINT UNSIGNED | SÍ | NULL | FK → warehouse_locations |
| `quantity` | INT | NO | 0 | Stock actual |
| `status` | ENUM('available','reserved','damaged') | NO | 'available' | **Solo 3 en migración** |
| `notes` | TEXT | SÍ | NULL | — |
| `created_at` | TIMESTAMP | SÍ | NULL | — |
| `updated_at` | TIMESTAMP | SÍ | NULL | — |

**Índices:**

- `INDEX (product_id, warehouse_id)`
- `INDEX (status)`

> **Inconsistencia:** el modelo define 6 estados (`available`, `reserved`, `damaged`, `sold`, `returned`, `lost`), la migración solo incluye 3.

---

### 2.4 Tabla: `inventory_transfers`

**Archivo:** `2025_05_20_000003_create_products_system.php`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | AUTO_INCREMENT | PK |
| `product_id` | BIGINT UNSIGNED | NO | — | FK → products (**inconsistente con modelo**) |
| `source_location_id` | BIGINT UNSIGNED | NO | — | FK → warehouse_locations |
| `destination_location_id` | BIGINT UNSIGNED | NO | — | FK → warehouse_locations |
| `quantity` | INT | NO | — | Cantidad transferida |
| `transferred_by` | BIGINT UNSIGNED | NO | — | FK → users |
| `notes` | TEXT | SÍ | NULL | — |
| `status` | ENUM('pending','completed','cancelled') | NO | 'pending' | — |
| `completed_at` | TIMESTAMP | SÍ | NULL | — |
| `created_at` | TIMESTAMP | SÍ | NULL | — |
| `updated_at` | TIMESTAMP | SÍ | NULL | — |

**Índices:**

- `INDEX (product_id, status)`

---

## 3. Rutas (Endpoints)

Todas las rutas requieren middleware `auth:api`. Prefijo base: `/api/v1`.

### Bodegas (Warehouses)

| Método | Path | Controlador | Descripción |
|---|---|---|---|
| GET | `/warehouses` | `WarehouseController@index` | Listar bodegas (paginado + filtros) |
| POST | `/warehouses` | `WarehouseController@store` | Crear bodega |
| GET | `/warehouses/{warehouse}` | `WarehouseController@show` | Ver bodega |
| PUT | `/warehouses/{warehouse}` | `WarehouseController@update` | Actualizar bodega |
| DELETE | `/warehouses/{warehouse}` | `WarehouseController@destroy` | Eliminar bodega |
| GET | `/warehouses/{warehouse}/locations` | `WarehouseController@locations` | Ubicaciones de una bodega (paginado) |

### Ubicaciones de Bodega (Warehouse Locations)

| Método | Path | Controlador | Descripción |
|---|---|---|---|
| GET | `/warehouse-locations` | `WarehouseLocationController@index` | Listar ubicaciones |
| POST | `/warehouse-locations` | `WarehouseLocationController@store` | Crear ubicación |
| GET | `/warehouse-locations/{location}` | `WarehouseLocationController@show` | Ver ubicación |
| PUT | `/warehouse-locations/{location}` | `WarehouseLocationController@update` | Actualizar ubicación |
| DELETE | `/warehouse-locations/{location}` | `WarehouseLocationController@destroy` | Eliminar ubicación |
| GET | `/warehouse-locations/{location}/inventory` | `WarehouseLocationController@inventoryItems` | Ítems de inventario en una ubicación |

### Ítems de Inventario

| Método | Path | Controlador | Descripción |
|---|---|---|---|
| GET | `/inventory-items` | `InventoryItemController@index` | Listar ítems (filtros: product_id, warehouse_id, location_id, status) |
| POST | `/inventory-items` | `InventoryItemController@store` | Crear ítem |
| GET | `/inventory-items/{inventoryItem}` | `InventoryItemController@show` | Ver ítem |
| PUT | `/inventory-items/{inventoryItem}` | `InventoryItemController@update` | Actualizar ítem |
| DELETE | `/inventory-items/{inventoryItem}` | `InventoryItemController@destroy` | Eliminar ítem (solo si quantity=0) |
| GET | `/inventory/total-stock` | `InventoryItemController@totalStock` | Stock total agregado por producto |
| GET | `/products/{product}/inventory-summary` | `InventoryItemController@productInventory` | Desglose de inventario de un producto |

### Transferencias de Inventario

| Método | Path | Controlador | Descripción |
|---|---|---|---|
| GET | `/inventory-transfers` | `InventoryTransferController@index` | Listar transferencias |
| POST | `/inventory-transfers` | `InventoryTransferController@store` | Crear transferencia |
| GET | `/inventory-transfers/{transfer}` | `InventoryTransferController@show` | Ver transferencia |
| PUT | `/inventory-transfers/{transfer}` | `InventoryTransferController@update` | Actualizar (solo notes y status) |
| DELETE | `/inventory-transfers/{transfer}` | `InventoryTransferController@destroy` | Eliminar transferencia |

---

## 4. Controladores

### 4.1 WarehouseController

```
index(Request)
    - Filtros via apiFilter (trait)
    - Paginado: per_page default 15, max 100
    - Retorna: WarehouseCollection

store(StoreWarehouseRequest)
    - Delega a WarehouseService::createWarehouse()
    - Retorna: WarehouseResource

show(Warehouse)
    - Retorna: WarehouseResource

update(UpdateWarehouseRequest, Warehouse)
    - Delega a WarehouseService::updateWarehouse()
    - Retorna: WarehouseResource

destroy(Warehouse)
    - Delega a WarehouseService::deleteWarehouse()
    - Retorna: 204 No Content

locations(Request, Warehouse)
    - Delega a WarehouseService::getWarehouseLocations()
    - Retorna: WarehouseLocationCollection (paginado)
```

### 4.2 WarehouseLocationController

```
index(Request)
    - Eager-loads: warehouse
    - Filtros via apiFilter
    - Retorna: WarehouseLocationCollection (paginado)

store(StoreWarehouseLocationRequest)
    - Delega a WarehouseLocationService::createLocation()
    - Retorna: WarehouseLocationResource

show(WarehouseLocation)
    - Eager-loads: warehouse
    - Retorna: WarehouseLocationResource

update(UpdateWarehouseLocationRequest, WarehouseLocation)
    - Delega a WarehouseLocationService::updateLocation()
    - Retorna: WarehouseLocationResource

destroy(WarehouseLocation)
    - Delega a WarehouseLocationService::deleteLocation()
    - Retorna: 204 No Content

inventoryItems(Request, WarehouseLocation)
    - Delega a WarehouseLocationService::getLocationInventoryItems()
    - Retorna: InventoryItemCollection (paginado)
```

### 4.3 InventoryItemController

```
index(Request)
    - Eager-loads: product, warehouse, warehouseLocation
    - Filtros: product_id, warehouse_id, warehouse_location_id, status
    - Ordenado por: created_at DESC
    - Retorna: InventoryItemCollection (paginado)

store(StoreInventoryItemRequest)
    - Valida que warehouse_location_id pertenece al warehouse_id indicado
    - Valida que no existe InventoryItem con mismo (product_id, warehouse_location_id)
    - Retorna: InventoryItemResource

show(InventoryItem)
    - Eager-loads: product, warehouse, warehouseLocation
    - Retorna: InventoryItemResource

update(UpdateInventoryItemRequest, InventoryItem)
    - Valida consistencia warehouse ↔ location
    - Valida no crear duplicados si cambia product o location
    - Retorna: InventoryItemResource

destroy(InventoryItem)
    - REGLA: solo elimina si quantity = 0
    - Si quantity > 0 → lanza excepción (HTTP 422)
    - Retorna: 204 No Content

totalStock(Request)
    - Query: JOIN products + inventory_items GROUP BY product_id
    - Calcula: COALESCE(SUM(inventory_items.quantity), 0) AS total_quantity
    - Filtros opcionales: warehouse_id, warehouse_location_id, category_id, brand_id, supplier_id
    - Retorna: array de productos con campo total_quantity

productInventory(Product)
    - Eager-loads: brand, supplier, category, inventoryItems.warehouse, inventoryItems.warehouseLocation
    - Retorna: ProductInventoryResource (desglose por ubicación)
```

### 4.4 InventoryTransferController

```
index(Request)
    - Eager-loads: lens, sourceLocation.warehouse, destinationLocation.warehouse, transferredBy
    - Filtros via apiFilter
    - Retorna: InventoryTransferCollection (paginado)

store(StoreInventoryTransferRequest)
    - Obtiene usuario autenticado: Auth::user()
    - Asigna transferred_by automáticamente
    - Valida: source_location_id ≠ destination_location_id
    - Delega a InventoryTransferService::createTransfer(data, user)
    - Retorna: InventoryTransferResource

show(InventoryTransfer)
    - Eager-loads: lens, sourceLocation.warehouse, destinationLocation.warehouse, transferredBy
    - Retorna: InventoryTransferResource

update(UpdateInventoryTransferRequest, InventoryTransfer)
    - Solo permite actualizar: notes, status
    - Delega a InventoryTransferService::updateTransfer()
    - Retorna: InventoryTransferResource

destroy(InventoryTransfer)
    - Delega a InventoryTransferService::deleteTransfer()
    - Retorna: 204 No Content
```

---

## 5. Validaciones (Form Requests)

### StoreWarehouseRequest

```
name       → required | string | max:255
code       → required | string | max:50 | unique:warehouses
address    → nullable | string
city       → nullable | string | max:100
status     → nullable | in:active,inactive
notes      → nullable | string
```

### UpdateWarehouseRequest

```
name       → sometimes|required | string | max:255
code       → sometimes|required | string | max:50 | unique:warehouses,code,{id}
address    → nullable | string
city       → nullable | string | max:100
status     → nullable | in:active,inactive
notes      → nullable | string
```

### StoreWarehouseLocationRequest

```
warehouse_id   → required | exists:warehouses,id
name           → required | string | max:255
code           → required | string | max:50 | unique:warehouse_locations
type           → nullable | string | max:50
status         → nullable | in:active,inactive
description    → nullable | string
```

### UpdateWarehouseLocationRequest

```
warehouse_id   → sometimes|required | exists:warehouses,id
name           → sometimes|required | string | max:255
code           → sometimes|required | string | max:50 | unique:warehouse_locations,code,{id}
type           → nullable | string | max:50
status         → nullable | in:active,inactive
description    → nullable | string
```

### StoreInventoryItemRequest

```
product_id              → required | exists:products,id
warehouse_id            → required | exists:warehouses,id
warehouse_location_id   → required | exists:warehouse_locations,id
quantity                → required | integer | min:0
status                  → nullable | in:available,reserved,damaged,sold,returned,lost
notes                   → nullable | string | max:1000

CUSTOM VALIDATIONS (withValidator):
  - warehouse_location_id debe pertenecer al warehouse_id dado
  - No puede existir ya un InventoryItem con (product_id, warehouse_location_id)
  - Mensajes de error en español
```

### UpdateInventoryItemRequest

```
product_id              → sometimes|required | exists:products,id
warehouse_id            → sometimes|required | exists:warehouses,id
warehouse_location_id   → sometimes|required | exists:warehouse_locations,id
quantity                → sometimes|required | integer | min:0
status                  → nullable | in:available,reserved,damaged,sold,returned,lost
notes                   → nullable | string | max:1000

CUSTOM VALIDATIONS (withValidator):
  - Si cambia warehouse_location_id: debe pertenecer al warehouse_id
  - Si cambia product o location: no debe crear duplicado (product+location)
```

### StoreInventoryTransferRequest

```
lens_id                   → required | exists:lenses,id
source_location_id        → required | exists:warehouse_locations,id
destination_location_id   → required | exists:warehouse_locations,id | different:source_location_id
quantity                  → required | integer | min:1
notes                     → nullable | string
status                    → nullable | in:pending,completed,cancelled
```

### UpdateInventoryTransferRequest

```
notes    → nullable | string
status   → sometimes|required | in:pending,completed,cancelled
```

---

## 6. Servicios

### 6.1 WarehouseService

| Método | Descripción |
|---|---|
| `getFilteredWarehouses(Request)` | Query Builder filtrado via apiFilter |
| `createWarehouse(array)` | Crea bodega en transacción DB, LOG en error |
| `updateWarehouse(Warehouse, array)` | Actualiza en transacción, hace `fresh()` al retornar |
| `deleteWarehouse(Warehouse)` | **Valida que no tenga inventoryItems** antes de eliminar |
| `getWarehouseLocations(Warehouse, Request)` | Retorna paginación de locations de la bodega |
| `findWarehouse(int)` | `findOrFail` por id |

### 6.2 WarehouseLocationService

| Método | Descripción |
|---|---|
| `createLocation(array)` | Crea ubicación en transacción |
| `updateLocation(WarehouseLocation, array)` | Actualiza, retorna `fresh()` |
| `deleteLocation(WarehouseLocation)` | Elimina ubicación |
| `getLocationInventoryItems(WarehouseLocation, int $perPage)` | Eager-loads: lens, warehouse. Paginado |

### 6.3 InventoryItemService

| Método | Descripción |
|---|---|
| `getFilteredInventoryItems(Request)` | Eager-loads product/warehouse/location. Filtros. Orden created_at DESC |
| `createInventoryItem(array)` | Valida location↔warehouse. Valida no duplicado. Transacción |
| `updateInventoryItem(InventoryItem, array)` | Mismas validaciones de create. Transacción |
| `deleteInventoryItem(InventoryItem)` | **Solo si quantity=0**, sino excepción |
| `getTotalStock(Request)` | JOIN + GROUP BY + SUM(quantity). Filtros múltiples |
| `getProductInventory(Product)` | Eager-loads brand/supplier/category/inventoryItems.warehouse/location |
| `validateLocationWarehouse(int, int)` | (protected) Valida que location pertenece al warehouse |
| `checkExistingInventoryItem(int, int)` | (protected) Valida no duplicado product+location al crear |
| `checkDuplicateInventoryItem(InventoryItem, array)` | (protected) Valida no duplicado al actualizar |
| `applyFilters($query, Request)` | (protected) Aplica filtros dinámicos para index |
| `applyStockFilters($query, Request)` | (protected) Aplica filtros para totalStock |

### 6.4 InventoryTransferService

| Método | Descripción |
|---|---|
| `createTransfer(array, User)` | Asigna `transferred_by = user->id`. Crea transferencia |
| `updateTransfer(InventoryTransfer, array)` | Actualiza, retorna `fresh()` |
| `deleteTransfer(InventoryTransfer)` | Elimina transferencia |

---

## 7. API Resources (Estructura de respuesta)

### InventoryItemResource

```json
{
  "id": 1,
  "quantity": 15,
  "status": "available",
  "notes": "...",
  "created_at": "2025-05-20T00:00:00Z",
  "updated_at": "2025-05-20T00:00:00Z",
  "product": { /* ProductResource whenLoaded */ },
  "warehouse": { /* WarehouseResource whenLoaded */ },
  "warehouse_location": { /* WarehouseLocationResource whenLoaded */ }
}
```

### WarehouseResource

```json
{
  "id": 1,
  "name": "Sede Principal - Bogotá",
  "address": "Calle 123 # 45-67",
  "created_at": "...",
  "updated_at": "..."
}
```

> Nota: `code`, `city`, `status`, `notes` no están explícitamente en el resource documentado. Verificar el archivo real.

### InventoryTransferResource

```json
{
  "id": 1,
  "quantity": 5,
  "status": "pending",
  "notes": "...",
  "completed_at": null,
  "created_at": "...",
  "lens": { /* whenLoaded */ },
  "source_location": { /* con warehouse whenLoaded */ },
  "destination_location": { /* con warehouse whenLoaded */ },
  "transferred_by": { /* User whenLoaded */ }
}
```

---

## 8. Seeder — Datos iniciales (InventorySeeder)

**Archivo:** `database/seeders/InventorySeeder.php`

**Bodega creada:**

| Campo | Valor |
|---|---|
| name | Sede Principal - Bogotá |
| code | SEDE-PRINCIPAL |
| status | active |

**Ubicaciones creadas:**

| code | name | type |
|---|---|---|
| VITRINA-LENTES | Vitrina Lentes | Shelf |
| VITRINA-MONTURAS | Vitrina Monturas | Shelf |
| VITRINA-LC | Vitrina Lentes de Contacto | Shelf |
| ALMACEN-GENERAL | Almacén General | Storage |
| ACCESORIOS | Accesorios | Shelf |

**Productos sembrados y su stock inicial:**

| Categoría | Cantidad de productos | Rango de stock |
|---|---|---|
| Lentes oftálmicos | 8 | 3-30 unidades |
| Monturas | 8 | 3-30 unidades |
| Lentes de contacto | 4 | 3-30 unidades |
| Accesorios/Soluciones | 4 | 3-30 unidades |

---

## 9. Relaciones con otros módulos

### Compras (Purchases)

- **Relación:** `PurchaseItem.product_id → Product.id`
- **Impacto esperado:** Las compras deberían incrementar el inventario
- **Estado real:** **No hay integración automática**. Las compras no actualizan `inventory_items` de forma automática (sin eventos/listeners visibles). El ajuste de stock es manual.

### Ventas (Sales)

- **Relación:** `SaleItem.lens_id → Product.id` (los productos se llaman "lenses" en el contexto de ventas)
- **Impacto esperado:** Las ventas deberían decrementar el inventario
- **Estado real:** **No hay integración automática**. Las ventas no actualizan `inventory_items` automáticamente.

### Productos (Products)

- **Relación directa:** `InventoryItem.product_id → Product.id`
- **Atributo calculado:** `Product.total_quantity` = suma de todos sus `inventory_items.quantity`
- **Tipos de productos:** Lentes, Monturas, Lentes de contacto — cada uno con su tabla de atributos específicos

### Usuarios (Users)

- **Relación:** `InventoryTransfer.transferred_by → User.id`
- **Propósito:** Auditoría — registrar quién realizó cada transferencia

### Proveedores (Suppliers)

- **Relación indirecta:** `Product.supplier_id → Supplier.id`
- **Uso:** Filtro disponible en `totalStock` por `supplier_id`

---

## 10. Lógica de negocio clave

### 10.1 Gestión de stock

- Un producto puede tener stock en **múltiples ubicaciones** de una o más bodegas.
- `InventoryItem` es la entidad de intersección `producto × ubicación`.
- **Restricción de unicidad:** `(product_id, warehouse_location_id)` es único — no puede haber dos registros del mismo producto en la misma ubicación.
- La cantidad se guarda como `INTEGER` (no decimal).

### 10.2 Estados de un InventoryItem

| Estado | Definido en migración | Definido en modelo |
|---|---|---|
| `available` | ✅ | ✅ |
| `reserved` | ✅ | ✅ |
| `damaged` | ✅ | ✅ |
| `sold` | ❌ | ✅ |
| `returned` | ❌ | ✅ |
| `lost` | ❌ | ✅ |

### 10.3 Workflow de transferencias

```
1. POST /inventory-transfers  →  status = 'pending'
2. PUT  /inventory-transfers/{id}  →  { status: 'completed', completed_at: <now> }
3. (opcional) PUT  →  { status: 'cancelled' }
```

- `source_location_id ≠ destination_location_id` (validado en request)
- `transferred_by` se asigna automáticamente desde `Auth::user()` — no lo envía el cliente
- **No hay validación de cantidad disponible** antes de crear una transferencia
- **No hay ajuste automático de stock** al completar una transferencia (el decremento/incremento es manual)

### 10.4 Consulta de stock total

```sql
SELECT
    products.*,
    COALESCE(SUM(inventory_items.quantity), 0) AS total_quantity
FROM products
LEFT JOIN inventory_items ON inventory_items.product_id = products.id
WHERE [filtros opcionales]
GROUP BY products.id
```

Filtros disponibles: `warehouse_id`, `warehouse_location_id`, `category_id`, `brand_id`, `supplier_id`.

### 10.5 Reglas de eliminación

| Entidad | Condición para eliminar |
|---|---|
| `Warehouse` | No debe tener `inventoryItems` asociados |
| `InventoryItem` | `quantity` debe ser `0` |
| `InventoryTransfer` | Sin restricción explícita |
| `WarehouseLocation` | Sin restricción explícita documentada |

---

## 11. Inconsistencias y gaps en Laravel (a tener en cuenta en Go)

| # | Inconsistencia | Impacto |
|---|---|---|
| 1 | `InventoryTransfer` usa `lens_id` en el modelo/request pero la migración define `product_id` | La columna real en BD es `product_id`, pero el ORM mapea a `lens_id`. Confusión en queries directas. |
| 2 | `InventoryItem.status` tiene 6 valores en el modelo pero solo 3 en la migración | Los estados `sold`, `returned`, `lost` no están en el `CHECK constraint` de la BD. |
| 3 | Sin integración compras → inventario | Hay que incrementar stock manualmente al registrar compras. |
| 4 | Sin integración ventas → inventario | Hay que decrementar stock manualmente al registrar ventas. |
| 5 | Sin validación de stock disponible en transferencias | Se puede crear una transferencia por más unidades de las que existen. |
| 6 | Sin ajuste automático de stock al completar una transferencia | Cambiar estado a `completed` no mueve cantidades entre ubicaciones. |
| 7 | Sin auditoría de cambios de cantidad en `InventoryItem` | No hay historial de movimientos de stock. |
| 8 | `WarehouseResource` puede estar omitiendo campos | `code`, `city`, `status`, `notes` pueden no estar en la respuesta de la API. |

---

## 12. Checklist para comparar con Go

Al revisar la implementación Go, verificar que existan:

### Tablas / Entidades

- [ ] `warehouses` con todos los campos
- [ ] `warehouse_locations` con índice UNIQUE `(warehouse_id, name)`
- [ ] `inventory_items` con los 6 estados + índice `(product_id, warehouse_id)`
- [ ] `inventory_transfers` con `product_id` (o `lens_id` resuelto) + auditoría `transferred_by`

### Endpoints

- [ ] CRUD completo de bodegas (5 endpoints)
- [ ] `GET /warehouses/{id}/locations`
- [ ] CRUD completo de ubicaciones (5 endpoints)
- [ ] `GET /warehouse-locations/{id}/inventory`
- [ ] CRUD completo de inventory items (5 endpoints)
- [ ] `GET /inventory/total-stock` con filtros agregados
- [ ] `GET /products/{id}/inventory-summary`
- [ ] CRUD completo de transferencias (5 endpoints)

### Validaciones de negocio

- [ ] `warehouse_location_id` debe pertenecer al `warehouse_id` al crear/actualizar inventory item
- [ ] Unicidad de `(product_id, warehouse_location_id)` en inventory items
- [ ] No eliminar `InventoryItem` si `quantity > 0`
- [ ] No eliminar `Warehouse` si tiene inventory items
- [ ] `source_location_id ≠ destination_location_id` en transferencias
- [ ] `transferred_by` se asigna desde el usuario autenticado (no del cliente)

### Relaciones a eager-load

- [ ] `InventoryItem` → product, warehouse, warehouseLocation
- [ ] `InventoryTransfer` → lens/product, sourceLocation.warehouse, destinationLocation.warehouse, transferredBy

### Lógica extra (mejoras sobre Laravel)

- [ ] Validar cantidad disponible antes de crear transferencia
- [ ] Ajuste automático de stock al completar transferencia
- [ ] Integración con compras (incremento de stock)
- [ ] Integración con ventas (decremento de stock)
- [ ] Historial de movimientos de stock

---

*Documento generado el 2026-04-24. Basado en el análisis directo del código fuente de `convision-api/` (Laravel 8).*
