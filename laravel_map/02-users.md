# 02 — Users

## Source files
- Controller: `app/Http/Controllers/Api/V1/UserController.php`
- Resource: `app/Http/Resources/V1/User/UserResource.php`
- Collection: `app/Http/Resources/V1/User/UserCollection.php`
- Model: `app/Models/User.php`

---

## Middleware
All routes: `auth:api`

---

## Endpoints

### GET /api/v1/users
**Filterable:** Yes (ApiFilterable)
**Paginated:** Yes

**Query params:**
- `per_page` (int, default 15, max 100)
- `s_f`, `s_v`, `s_o` — filter fields/values
- `sort` — e.g. `name,asc`
- `status` — direct status filter

**Response 200:** Paginated collection envelope with `data: [UserResource]`

---

### GET /api/v1/users/{id}
**Response 200:** UserResource
**Response 404:** not found

---

### POST /api/v1/users
**Request body:**
```json
{
  "name": "string",           // required|string|max:255
  "last_name": "string",      // required|string|max:255
  "email": "string",          // required|email|unique:users
  "identification": "string", // required|string|unique:users
  "phone": "string",          // required|string|max:20
  "password": "string",       // required|string|min:8
  "role": "admin"             // required|in:admin,specialist,receptionist,laboratory
}
```

**Response 201:** UserResource

---

### PUT /api/v1/users/{id}
**Request body:** Same as store, but `email` and `identification` unique rules exclude current record.
`password` is optional on update.

**Response 200:** UserResource

---

### DELETE /api/v1/users/{id}
**Response 204:** No content

---

## UserResource shape
```json
{
  "id": 1,
  "name": "string",
  "last_name": "string",
  "email": "string",
  "identification": "string",
  "phone": "string",
  "role": "admin | specialist | receptionist | laboratory",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## DB table: `users`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | varchar(255) | |
| last_name | varchar(255) | |
| email | varchar(255) unique | |
| identification | varchar(255) unique | |
| phone | varchar(20) | |
| password | varchar(255) | bcrypt hashed |
| role | varchar | admin\|specialist\|receptionist\|laboratory |
| remember_token | varchar(100) nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |
