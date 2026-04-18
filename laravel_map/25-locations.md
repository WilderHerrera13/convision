# 25 — Locations (Lookup Geográfico)

## Source files
- Controller: `app/Http/Controllers/Api/V1/LocationController.php`

---

## Middleware: `auth:api`

---

## Purpose
Hierarchical geographic lookup for patient address fields. Used when creating/editing patients to populate dropdown selects: Country → Department → City → District.

---

## Endpoints

### GET /api/v1/lookup/countries
Returns all countries.
**Response 200:**
```json
[
  { "id": 1, "name": "Colombia" },
  { "id": 2, "name": "Venezuela" }
]
```

### GET /api/v1/lookup/departments?country_id={id}
Returns departments (states/provinces) for the given country.
**Query params:** `country_id` (required, integer)
**Response 200:**
```json
[
  { "id": 10, "name": "Cundinamarca", "country_id": 1 },
  { "id": 11, "name": "Antioquia", "country_id": 1 }
]
```

### GET /api/v1/lookup/cities?department_id={id}
Returns cities for the given department.
**Query params:** `department_id` (required, integer)
**Response 200:**
```json
[
  { "id": 100, "name": "Bogotá", "department_id": 10 }
]
```

### GET /api/v1/lookup/districts?city_id={id}
Returns districts (barrios/sectores) for the given city.
**Query params:** `city_id` (required, integer)
**Response 200:**
```json
[
  { "id": 1000, "name": "Chapinero", "city_id": 100 }
]
```

---

## DB tables

### `countries`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar |

### `departments`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar |
| country_id | bigint FK → countries.id |

### `cities`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar |
| department_id | bigint FK → departments.id |

### `districts`
| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar |
| city_id | bigint FK → cities.id |
