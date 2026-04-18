# 24 — Notes (Notas Polimórficas)

## Source files
- Controller: `app/Http/Controllers/Api/V1/NoteController.php`
- Resources: `NoteResource`, `NoteCollection`

---

## Middleware: `auth:api`

---

## Supported Resource Types (polymorphic)
- `lenses` → maps to `App\Models\Product` (legacy naming)
- `appointments` → maps to `App\Models\Appointment`

---

## Endpoints

### GET /api/v1/{type}/{id}/notes
List all notes for a given resource.
- `{type}`: `lenses` or `appointments`
- `{id}`: resource ID (integer)

**Query params:** `per_page` (default 15, max 100), `page`

**Response 200:** Paginated NoteResource collection
```json
{
  "data": [ ...NoteResource ],
  "current_page": 1,
  "per_page": 15,
  "total": 5,
  "last_page": 1
}
```

### POST /api/v1/{type}/{id}/notes
Create a note for the resource.
- `{type}`: `lenses` or `appointments`
- `{id}`: resource ID (integer)

**Request body:**
```json
{ "content": "string" }  // required
```
**Response 201:** NoteResource

---

## NoteResource shape
```json
{
  "id": 1,
  "content": "string",
  "user_id": 1,
  "notable_id": 42,
  "notable_type": "App\\Models\\Product",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "user": { ...UserResource }
}
```

---

## DB table: `notes`
| Column | Type |
|---|---|
| id | bigint PK |
| content | text |
| user_id | bigint FK → users.id |
| notable_id | bigint (polymorphic) |
| notable_type | varchar (model class name) |
| created_at | timestamp |
| updated_at | timestamp |
