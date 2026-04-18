# 08 — Products & Product Categories

## Source files
- Controller: `app/Http/Controllers/Api/V1/ProductController.php`
- Category Controller: `app/Http/Controllers/Api/V1/ProductCategoryController.php`
- Import Controller: `app/Http/Controllers/Api/V1/ProductImportController.php`
- Resources: `app/Http/Resources/V1/Product/ProductResource.php`, `ProductCollection.php`
             `app/Http/Resources/V1/ProductCategory/ProductCategoryResource.php`

---

## Middleware: `auth:api` (all product and category routes)

---

## Product Endpoints

### GET /api/v1/products
**Filterable:** Yes (ApiFilterable). **Paginated:** Yes.
Additional direct filter params: `brand_id`, `material_id`, `lens_class_id`, `treatment_id`, `photochromic_id`, `supplier_id`, `type_id`
Relations loaded: category, brand, supplier, lensAttributes, frameAttributes, contactLensAttributes

**Response 200:** Paginated ProductResource collection

---

### GET /api/v1/products/{id}
**Response 200:** ProductResource

---

### POST /api/v1/products
**Request body:**
```json
{
  "internal_code": "string",        // required|unique:products
  "identifier": "string",           // required
  "description": "string",          // required
  "cost": 100.00,                   // required|numeric|min:0
  "price": 150.00,                  // required|numeric|min:0
  "product_category_id": 1,         // required|exists:product_categories,id
  "brand_id": 1,                    // required in FormRequest (validation) BUT nullable in DB
  // ⚠️ INCONSISTENCIA: StoreProductRequest valida brand_id como 'required|exists:brands,id'
  // pero la migración 2025_05_26_202949 alteró la columna para ser nullable en BD.
  // En Golang: aceptar brand_id como requerido en validación (mantener paridad con Laravel).
  // La BD acepta NULL pero la API no lo permitirá por la validación.
  "supplier_id": 1,                 // required|exists:suppliers,id
  "status": "enabled",              // required|in:enabled,disabled

  "lens_attributes": {              // optional, for lens-category products
    "lens_type_id": 1,
    "material_id": 1,
    "lens_class_id": 1,
    "treatment_id": 1,
    "photochromic_id": 1,
    "sphere_min": -8.00,
    "sphere_max": 4.00,
    "cylinder_min": -4.00,
    "cylinder_max": 0.00,
    "addition_min": 0.75,
    "addition_max": 3.00,
    "diameter": 65.0,
    "base_curve": 8.0,
    "prism": null,
    "uv_protection": true,
    "engraving": "string",
    "availability": "stock"
  },

  "frame_attributes": {             // optional, for frame-category products
    "frame_type": "string",
    "material_frame": "string",
    "gender": "string",
    "lens_width": 52,
    "bridge_width": 18,
    "temple_length": 140,
    "color": "string",
    "shape": "string"
  },

  "contact_lens_attributes": {      // optional, for contact lens products
    "contact_type": "string",
    "replacement_schedule": "string",
    "base_curve": 8.6,
    "diameter": 14.2,
    "material_contact": "string",
    "water_content": 38.0,
    "uv_protection": false
  }
}
```

**Response 201:** ProductResource

---

### PUT /api/v1/products/{id}
**Request body:** Same as store, `internal_code` unique excludes current record.
**Response 200:** ProductResource

---

### DELETE /api/v1/products/{id}
**Response 204:** No content

---

### GET /api/v1/products/search
**Query params:** `query` (required), `category` (optional), `per_page`
**Response 200:** Array of ProductResource (non-paginated or paginated)

---

### GET /api/v1/products/category/{categorySlug}
**Query params:** `brand_id`, `supplier_id`, `search`, `lens_type_id`, `material_id`, `lens_class_id`, `treatment_id`, `photochromic_id`, `frame_type`, `gender`, `color`, `shape`, `per_page`, `page`
**Response 200:** Paginated ProductResource collection

---

### GET /api/v1/products/lenses/by-prescription
**Query params (from LensesByPrescriptionRequest):**
```
right_sphere, right_cylinder, left_sphere, left_cylinder, addition
```
Returns lenses compatible with prescription values.
**Response 200:** Array of ProductResource

---

### POST /api/v1/products/bulk-status
**Request body:**
```json
{
  "product_ids": [1, 2, 3],    // required|array
  "status": "disabled"          // required|in:enabled,disabled
}
```
**Response 200:** `{ "updated": 3 }`

---

### GET /api/v1/products/{product}/stock
**Response 200:** ProductStockResource
```json
{
  "product_id": 1,
  "total_quantity": 50,
  "by_location": [...]
}
```

---

### GET /api/v1/products/{product}/discounts
**Response 200:** Collection of DiscountResource

---

### GET /api/v1/products/{product}/inventory
**Response 200:** ProductInventoryResource

---

### GET /api/v1/products/{product}/discount-info
**Query params:** `patient_id` (optional)
**Response 200:** ProductDiscountInfoResource
```json
{
  "has_discounts": true,
  "best_discount_percentage": 15.0,
  "discounted_price": 127.50,
  "original_price": 150.00
}
```

---

### GET /api/v1/products/{product}/active-discounts
**Response 200:** Collection of active DiscountResource

---

### GET /api/v1/products/{product}/calculate-price
**Query params:** `patient_id` (optional)
**Response 200:** CalculatedPriceResource
```json
{
  "original_price": 150.00,
  "discounted_price": 127.50,
  "discount_percentage": 15.0,
  "has_discount": true
}
```

---

### POST /api/v1/products/import
Import products from CSV/Excel file.
**Middleware:** `auth:api` + `admin.or.specialist.role` (admin and specialist only)
**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Validation | Notes |
|---|---|---|
| `file` | required\|file\|mimes:xlsx,xls,csv,txt\|max:10240 | Max 10 MB |
| `update_mode` | nullable\|in:skip,update,error | Default: `update` |

**Update mode behavior:**
- `update` (default) — if a product with the same `internal_code` exists, update it.
- `skip` — skip existing products silently.
- `error` — treat duplicate `internal_code` as an error and abort that row.

**Expected file columns (first row = headers, case/accent-normalized):**
The service normalizes headers (lowercase, accent-stripped). Expected columns cover all Product + ProductLensAttributes fields. The file is only for lens products (category slug `lens`). Non-lens products must be created via the CRUD endpoint.

**Response 200 (no errors):**
```json
{
  "message": "Product import completed successfully.",
  "created": 25,
  "updated": 3,
  "skipped": 1,
  "errors": []
}
```
**Response 422 (partial errors):**
```json
{
  "message": "Import completed with errors.",
  "created": 20,
  "updated": 2,
  "skipped": 0,
  "errors": [
    "Row 5: field X is invalid...",
    "Row 12: duplicate internal_code in update_mode=error..."
  ]
}
```

---

## ProductResource shape
```json
{
  "id": 1,
  "internal_code": "LENS-001",
  "identifier": "string",
  "description": "string",
  "cost": 100.00,
  "price": 150.00,
  "category": { "id": 1, "name": "Lentes", "slug": "lentes" },
  "brand": { "id": 1, "name": "string" },
  "supplier": { "id": 1, "name": "string" },
  "lens_attributes": { ...ProductLensAttributes },
  "frame_attributes": { ...ProductFrameAttributes },
  "contact_lens_attributes": { ...ProductContactLensAttributes },
  "has_discounts": false,
  "status": "enabled | disabled",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "discount_info": null,

  "type_id": 1,
  "brand_id": 1,
  "material_id": 1,
  "lens_class_id": 1,
  "treatment_id": 1,
  "photochromic_id": 1,
  "supplier_id": 1,
  "sphere_min": -8.00,
  "sphere_max": 4.00,
  "cylinder_min": -4.00,
  "cylinder_max": 0.00,
  "addition_min": 0.75,
  "addition_max": 3.00,
  "diameter": 65.0,
  "base_curve": 8.0,
  "prism": null,
  "uv_protection": true,
  "engraving": "string",
  "availability": "string",
  "type": { "id": 1, "name": "string" },
  "material": { "id": 1, "name": "string" },
  "lens_class": { "id": 1, "name": "string" },
  "treatment": { "id": 1, "name": "string" },
  "photochromic": { "id": 1, "name": "string" }
}
```

The lens-specific fields (type_id, sphere_min, etc.) are merged into the root when `lens_attributes` relation is loaded.

---

## Product Category Endpoints

### GET /api/v1/product-categories
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated ProductCategoryResource collection

### GET /api/v1/product-categories/all
Returns all active categories without pagination.
**Response 200:** Array of ProductCategoryResource

### GET /api/v1/product-categories/products-count
**Response 200:** Collection with product count per category
```json
[{ "id": 1, "name": "Lentes", "slug": "lentes", "products_count": 45 }]
```

### GET /api/v1/product-categories/{id}
**Response 200:** ProductCategoryResource

### POST /api/v1/product-categories
```json
{
  "name": "string",              // required|unique:product_categories
  "slug": "string",              // required|unique:product_categories
  "description": "string",       // nullable
  "icon": "string",              // nullable
  "required_attributes": [],     // nullable|array
  "is_active": true              // boolean
}
```
**Response 201:** ProductCategoryResource

### PUT /api/v1/product-categories/{id}
Same body, unique rules exclude current record.
**Response 200:** ProductCategoryResource

### DELETE /api/v1/product-categories/{id}
**Response 204:** No content

---

## ProductCategoryResource shape
```json
{
  "id": 1,
  "name": "Lentes oftálmicos",
  "slug": "lentes",
  "description": "string",
  "icon": "string",
  "required_attributes": ["lens_type_id", "material_id"],
  "is_active": true,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## DB tables

### `products`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| internal_code | varchar unique | |
| identifier | varchar | |
| description | text | |
| cost | decimal(10,2) | |
| price | decimal(10,2) | |
| product_category_id | bigint FK | → product_categories.id |
| brand_id | bigint FK nullable | → brands.id (nullable en DB desde migración 2025_05_26; FormRequest aún requiere valor) |
| supplier_id | bigint FK | → suppliers.id |
| has_discounts | boolean default false | |
| status | varchar | enabled/disabled |
| created_at | timestamp | |
| updated_at | timestamp | |

### `product_lens_attributes`
| Column | Type |
|---|---|
| id | bigint PK |
| product_id | bigint FK → products.id |
| lens_type_id | bigint FK nullable |
| material_id | bigint FK nullable |
| lens_class_id | bigint FK nullable |
| treatment_id | bigint FK nullable |
| photochromic_id | bigint FK nullable |
| sphere_min | decimal nullable |
| sphere_max | decimal nullable |
| cylinder_min | decimal nullable |
| cylinder_max | decimal nullable |
| addition_min | decimal nullable |
| addition_max | decimal nullable |
| diameter | decimal nullable |
| base_curve | decimal nullable |
| prism | decimal nullable |
| uv_protection | boolean nullable |
| engraving | varchar nullable |
| availability | varchar nullable |

### `product_frame_attributes`
| Column | Type |
|---|---|
| id | bigint PK |
| product_id | bigint FK → products.id |
| frame_type | varchar nullable |
| material_frame | varchar nullable |
| gender | varchar nullable |
| lens_width | decimal nullable |
| bridge_width | decimal nullable |
| temple_length | decimal nullable |
| color | varchar nullable |
| shape | varchar nullable |

### `product_contact_lens_attributes`
| Column | Type |
|---|---|
| id | bigint PK |
| product_id | bigint FK → products.id |
| contact_type | varchar nullable |
| replacement_schedule | varchar nullable |
| base_curve | decimal nullable |
| diameter | decimal nullable |
| material_contact | varchar nullable |
| water_content | decimal nullable |
| uv_protection | boolean nullable |

### `product_categories`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar unique |
| slug | varchar unique |
| description | text nullable |
| icon | varchar nullable |
| required_attributes | json nullable |
| is_active | boolean default true |
| created_at | timestamp |
| updated_at | timestamp |
