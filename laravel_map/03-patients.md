# 03 — Patients

## Source files
- Controller: `app/Http/Controllers/Api/V1/PatientController.php`
- Lookup Controller: `app/Http/Controllers/Api/V1/PatientLookupController.php`
- Store Request: `app/Http/Requests/Api/V1/Patient/StorePatientRequest.php`
- Update Request: `app/Http/Requests/Api/V1/Patient/UpdatePatientRequest.php`
- Resource: `app/Http/Resources/V1/Patient/PatientResource.php`
- Collection: `app/Http/Resources/V1/Patient/PatientCollection.php`

---

## Middleware
All patient routes: `auth:api`, `role:admin|specialist|receptionist`

---

## Endpoints

### GET /api/v1/patients
**Filterable:** Yes (ApiFilterable)
**Paginated:** Yes
**Soft deletes:** Included by default? No — `withTrashed` must be used explicitly if needed.

**Query params:** `per_page`, `s_f`, `s_v`, `s_o`, `sort`, `status`

**Response 200:** Paginated collection of PatientResource

---

### GET /api/v1/patients/{id}
**Response 200:** PatientResource (with loaded relations)
**Response 404:** Not found

---

### POST /api/v1/patients
**Request body:**
```json
{
  "first_name": "string",               // required|max:255
  "last_name": "string",                // required|max:255
  "email": "string",                    // required|email|unique:patients
  "phone": "string",                    // required|max:20
  "identification": "string",           // required|unique:patients
  "identification_type_id": 1,          // nullable|exists:identification_types,id
  "birth_date": "1990-01-01",           // required|date
  "gender": "male",                     // required|in:male,female,other
  "address": "string",                  // nullable|max:255
  "city_id": 1,                         // nullable|exists:cities,id
  "district_id": 1,                     // nullable|exists:districts,id
  "department_id": 1,                   // nullable|exists:departments,id
  "country_id": 1,                      // nullable|exists:countries,id
  "neighborhood": "string",             // nullable|max:255
  "postal_code": "string",              // nullable|max:10
  "health_insurance_provider_id": 1,    // nullable|exists:health_insurance_providers,id
  // ⚠️ INCONSISTENCIA CONOCIDA: FormRequest valida 'health_insurance_provider_id'
  // pero la columna en DB es 'health_insurance_id'. Ambas apuntan a health_insurance_providers.id.
  // En Golang: usar 'health_insurance_id' como nombre de columna en el modelo
  // y mapear el JSON field 'health_insurance_provider_id' a esa columna.
  "affiliation_type_id": 1,             // nullable|exists:affiliation_types,id
  "coverage_type_id": 1,                // nullable|exists:coverage_types,id
  "occupation": "string",               // nullable|max:255
  "education_level_id": 1,              // nullable|exists:education_levels,id
  "position": "string",                 // nullable|max:255
  "company": "string",                  // nullable|max:255
  "notes": "string",                    // nullable
  "status": "active"                    // sometimes|in:active,inactive
}
```

**Response 201:** PatientResource

---

### PUT /api/v1/patients/{id}
**Request body:** Same as store, with email/identification unique rules excluding current record.

**Response 200:** PatientResource

---

### DELETE /api/v1/patients/{id}
Soft delete (sets `deleted_at`).
**Response 204:** No content

---

### POST /api/v1/patients/{id}/restore
Restores a soft-deleted patient.
**Response 200:** PatientResource

---

### POST /api/v1/patients/{id}/profile-image
**Content-Type:** `multipart/form-data`
**Form field:** `profile_image` — image file (jpeg/png/jpg/gif/svg, max 2MB)

**Response 200:** PatientResource with updated `profile_image_url`

---

## PatientResource shape
```json
{
  "id": 1,
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "identification": "string",
  "identification_type": "Cédula de Ciudadanía",
  "birth_date": "1990-01-01",
  "gender": "male | female | other",
  "address": "string",
  "city": "string",
  "district": "string",
  "state": "string",
  "country": "string",
  "neighborhood": "string",
  "postal_code": "string",
  "eps": "string",
  "affiliation": "string",
  "coverage": "string",
  "occupation": "string",
  "education": "string",
  "position": "string",
  "company": "string",
  "notes": "string",
  "status": "active | inactive",
  "profile_image_url": "https://...",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## Lookup Endpoints (all: `auth:api`)

### GET /api/v1/lookup/identification-types
Returns array of `{id, name, code}` — active identification types (cached 24h)

### GET /api/v1/lookup/health-insurance-providers
Returns array of `{id, name}` — active providers (cached 24h)

### GET /api/v1/lookup/affiliation-types
Returns array of `{id, name}` — active affiliation types (cached 24h)

### GET /api/v1/lookup/coverage-types
Returns array of `{id, name}` — active coverage types (cached 24h)

### GET /api/v1/lookup/education-levels
Returns array of `{id, name}` — active education levels (cached 24h)

### GET /api/v1/lookup/patient-data
Returns all the above combined in a single object:
```json
{
  "identification_types": [...],
  "health_insurance_providers": [...],
  "affiliation_types": [...],
  "coverage_types": [...],
  "education_levels": [...]
}
```

---

## DB table: `patients`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| first_name | varchar(255) | |
| last_name | varchar(255) | |
| email | varchar(255) unique | |
| phone | varchar(20) | |
| identification | varchar(255) unique | |
| identification_type_id | bigint FK nullable | → identification_types.id |
| birth_date | date | |
| gender | varchar | male/female/other |
| address | varchar(255) nullable | |
| city_id | bigint FK nullable | → cities.id |
| district_id | bigint FK nullable | → districts.id |
| department_id | bigint FK nullable | → departments.id |
| country_id | bigint FK nullable | → countries.id |
| neighborhood | varchar(255) nullable | |
| postal_code | varchar(10) nullable | |
| health_insurance_id | bigint FK nullable | → health_insurance_providers.id (columna real en DB; el FormRequest usa 'health_insurance_provider_id' como alias) |
| affiliation_type_id | bigint FK nullable | → affiliation_types.id |
| coverage_type_id | bigint FK nullable | → coverage_types.id |
| occupation | varchar(255) nullable | |
| education_level_id | bigint FK nullable | → education_levels.id |
| position | varchar(255) nullable | |
| company | varchar(255) nullable | |
| notes | text nullable | |
| status | varchar | active/inactive |
| profile_image | varchar nullable | storage path |
| deleted_at | timestamp nullable | soft delete |
| created_at | timestamp | |
| updated_at | timestamp | |

**Note:** Resource fields `city`, `district`, `state`, `country`, `eps`, `affiliation`, `coverage`, `education` are resolved via related model name attributes or direct denormalized columns.
