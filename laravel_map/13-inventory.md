# 13 — Inventory (Warehouses, Locations, Items, Transfers)

## Source files
- Controllers: `WarehouseController.php`, `WarehouseLocationController.php`, `InventoryItemController.php`, `InventoryTransferController.php`
- Resources: `WarehouseResource`, `WarehouseLocationResource`, `InventoryItemResource`, `InventoryTransferResource`

---

## Middleware: `auth:api` (all routes)

---

## Warehouses — `/api/v1/warehouses`

### GET /api/v1/warehouses
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated WarehouseResource collection

### GET /api/v1/warehouses/{id}
**Response 200:** WarehouseResource

### GET /api/v1/warehouses/{warehouse}/locations
Returns all locations for a warehouse.
**Response 200:** Array of WarehouseLocationResource

### POST /api/v1/warehouses
```json
{
  "name": "string",     // required|max:255
  "address": "string"   // nullable|max:255
}
```
**Response 201:** WarehouseResource

### PUT /api/v1/warehouses/{id}
**Response 200:** WarehouseResource

### DELETE /api/v1/warehouses/{id}
**Response 204:** No content

## WarehouseResource shape
```json
{
  "id": 1,
  "name": "Bodega Principal",
  "address": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Warehouse Locations — `/api/v1/warehouse-locations`

### GET /api/v1/warehouse-locations
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated WarehouseLocationResource collection

### GET /api/v1/warehouse-locations/{id}
**Response 200:** WarehouseLocationResource (with warehouse)

### GET /api/v1/warehouse-locations/{location}/inventory
Returns inventory items at this location.
**Response 200:** Paginated InventoryItemResource collection

### POST /api/v1/warehouse-locations
```json
{
  "warehouse_id": 1,      // required|exists:warehouses,id
  "name": "string",       // required|max:255
  "description": "string" // nullable
}
```
**Response 201:** WarehouseLocationResource

### PUT /api/v1/warehouse-locations/{id}
**Response 200:** WarehouseLocationResource

### DELETE /api/v1/warehouse-locations/{id}
**Response 204:** No content

## WarehouseLocationResource shape
```json
{
  "id": 1,
  "name": "Estante A",
  "description": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "warehouse": { ...WarehouseResource }
}
```

---

## Inventory Items — `/api/v1/inventory-items`

### GET /api/v1/inventory-items
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated InventoryItemResource collection

### GET /api/v1/inventory/total-stock
Returns total stock across all locations.
**Response 200:** `{ "total_quantity": 1250, "by_category": [...] }`

### GET /api/v1/products/{product}/inventory-summary
Returns inventory summary for a specific product.
**Response 200:** ProductInventoryResource

### GET /api/v1/inventory-items/{id}
**Response 200:** InventoryItemResource (with product, warehouse, warehouse_location)

### POST /api/v1/inventory-items
```json
{
  "product_id": 1,              // required|exists:products,id
  "warehouse_id": 1,            // required|exists:warehouses,id
  "warehouse_location_id": 1,   // required|exists:warehouse_locations,id (must belong to warehouse_id)
  "quantity": 50,               // required|integer|min:0
  "status": "available",        // nullable|in:available,reserved,damaged,sold,returned,lost
  "notes": "string"             // nullable|max:1000
}
```
**Constraint:** product+location combination must be unique.
**Response 201:** InventoryItemResource

### PUT /api/v1/inventory-items/{id}
**Response 200:** InventoryItemResource

### DELETE /api/v1/inventory-items/{id}
**Response 204:** No content

## InventoryItemResource shape
```json
{
  "id": 1,
  "quantity": 50,
  "status": "available | reserved | damaged | sold | returned | lost",
  "notes": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "product": { ...ProductResource },
  "warehouse": { ...WarehouseResource },
  "warehouse_location": { ...WarehouseLocationResource }
}
```

---

## Inventory Transfers — `/api/v1/inventory-transfers`

### GET /api/v1/inventory-transfers
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated InventoryTransferResource collection

### GET /api/v1/inventory-transfers/{id}
**Response 200:** InventoryTransferResource

### POST /api/v1/inventory-transfers
```json
{
  "lens_id": 1,                   // required|exists:lenses,id (NOTE: legacy field — refers to product_id in practice)
  "source_location_id": 1,        // required|exists:warehouse_locations,id
  "destination_location_id": 2,   // required|exists:warehouse_locations,id|different:source_location_id
  "quantity": 10,                 // required|integer|min:1
  "notes": "string",              // nullable
  "status": "pending"             // nullable|in:pending,completed,cancelled
}
```
**Response 201:** InventoryTransferResource

### PUT /api/v1/inventory-transfers/{id}
**Response 200:** InventoryTransferResource

### DELETE /api/v1/inventory-transfers/{id}
**Response 204:** No content

## InventoryTransferResource shape
```json
{
  "id": 1,
  "lens_id": 1,
  "source_location_id": 1,
  "destination_location_id": 2,
  "quantity": 10,
  "transferred_by": 1,
  "notes": "string",
  "status": "pending | completed | cancelled",
  "completed_at": "ISO8601",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "lens": { ...ProductResource },
  "sourceLocation": { ...WarehouseLocationResource },
  "destinationLocation": { ...WarehouseLocationResource },
  "transferredBy": { ...UserResource }
}
```

---

## DB tables

### `warehouses`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar(255) |
| address | varchar(255) nullable |
| created_at | timestamp |
| updated_at | timestamp |

### `warehouse_locations`
| Column | Type |
|---|---|
| id | bigint PK |
| warehouse_id | bigint FK → warehouses.id |
| name | varchar(255) |
| description | text nullable |
| created_at | timestamp |
| updated_at | timestamp |

### `inventory_items`
| Column | Type |
|---|---|
| id | bigint PK |
| product_id | bigint FK → products.id |
| warehouse_id | bigint FK → warehouses.id |
| warehouse_location_id | bigint FK → warehouse_locations.id |
| quantity | int |
| status | varchar |
| notes | text nullable |
| created_at | timestamp |
| updated_at | timestamp |

### `inventory_transfers`
| Column | Type |
|---|---|
| id | bigint PK |
| lens_id | bigint FK → products.id (legacy naming) |
| source_location_id | bigint FK → warehouse_locations.id |
| destination_location_id | bigint FK → warehouse_locations.id |
| quantity | int |
| transferred_by | bigint FK → users.id |
| notes | text nullable |
| status | varchar |
| completed_at | timestamp nullable |
| created_at | timestamp |
| updated_at | timestamp |
