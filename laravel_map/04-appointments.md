# 04 — Appointments

## Source files
- Controller: `app/Http/Controllers/Api/V1/AppointmentController.php`
- Service: `app/Services/AppointmentService.php`
- Store Request: `app/Http/Requests/Api/V1/Appointment/StoreAppointmentRequest.php`
- Update Request: `app/Http/Requests/Api/V1/Appointment/UpdateAppointmentRequest.php`
- Reschedule Request: `app/Http/Requests/Api/V1/Appointment/RescheduleAppointmentRequest.php`
- Resource: `app/Http/Resources/V1/Appointment/AppointmentResource.php`

---

## Middleware by route
| Route | Middleware |
|---|---|
| CRUD + pause/resume/annotations | `auth:api`, `role:admin\|specialist\|receptionist` |
| take/lens-annotation | `auth:api`, `role:specialist` |

---

## Appointment Statuses
`scheduled` → `in_progress` → `paused` → `in_progress` → `completed`
Also: `cancelled`

---

## Endpoints

### GET /api/v1/appointments
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated AppointmentResource collection

---

### GET /api/v1/appointments/{id}
**Response 200:** AppointmentResource
**Relations loaded:** patient, specialist, receptionist, prescription, takenBy, billing

---

### POST /api/v1/appointments
**Request body:**
```json
{
  "patient_id": 1,            // required|exists:patients,id
  "specialist_id": 2,         // nullable|exists:users,id (role=specialist)
  "scheduled_at": "2024-05-01 10:00",  // required_without_all:date,time | date_format:Y-m-d H:i | after:now
  "date": "2024-05-01",       // required_without:scheduled_at (alternative to scheduled_at)
  "time": "10:00",            // required_without:scheduled_at
  "notes": "string",          // nullable
  "appointment_type_id": 1    // nullable|exists:appointment_types,id
}
```
If `date` + `time` provided, they are merged into `scheduled_at`.

**Response 201:** AppointmentResource

---

### PUT /api/v1/appointments/{id}
**Request body:** Similar to store, fields optional.
**Response 200:** AppointmentResource

---

### DELETE /api/v1/appointments/{id}
**Response 204:** No content

---

### POST /api/v1/appointments/{id}/take
**Auth:** specialist only
Sets appointment status to `in_progress`, assigns `taken_by` = current user.
**Response 200:** AppointmentResource

---

### POST /api/v1/appointments/{id}/pause
**Auth:** admin|specialist|receptionist
Sets status to `paused`.
**Response 200:** AppointmentResource
**Response 400:** If not in `in_progress` status

---

### POST /api/v1/appointments/{id}/resume
**Auth:** admin|specialist|receptionist
Sets status to `in_progress`.
**Response 200:** AppointmentResource
**Response 400:** If not `paused` or specialist has another active appointment

---

### POST /api/v1/appointments/{id}/annotations
Save general annotations (text/paths) to appointment.
**Request body:**
```json
{
  "notes": "string",
  "left_eye_annotation_paths": {},
  "right_eye_annotation_paths": {}
}
```
**Response 200:** AppointmentResource

---

### POST /api/v1/appointments/{id}/lens-annotation
**Auth:** specialist only
Upload lens annotation image.
**Content-Type:** `multipart/form-data`
**Form field:** `annotation_image` (image file)
Also accepts `annotation_paths` (JSON).
**Response 200:** AppointmentResource

---

### GET /api/v1/appointments/{id}/lens-annotation
**Auth:** specialist only
Returns lens annotation image URL and paths.
**Response 200:**
```json
{
  "lens_annotation_image": "storage/path",
  "lens_annotation_image_url": "https://...",
  "lens_annotation_paths": {}
}
```

---

## AppointmentResource shape
```json
{
  "id": 1,
  "patient_id": 1,
  "specialist_id": 2,
  "receptionist_id": 3,
  "scheduled_at": "2024-05-01T10:00:00.000000Z",
  "notes": "string",
  "reason": "string",
  "status": "scheduled | in_progress | paused | completed | cancelled",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "patient": { ...PatientResource },
  "specialist": { ...UserResource },
  "receptionist": { ...UserResource },
  "prescription": { ...PrescriptionResource },
  "taken_by": { ...UserResource },
  "is_billed": false,
  "billing": null,
  "sale_id": null,
  "left_eye_annotation_paths": {},
  "left_eye_annotation_image_url": "https://...",
  "right_eye_annotation_paths": {},
  "right_eye_annotation_image_url": "https://...",
  "lens_annotation_image": "storage/path",
  "lens_annotation_paths": {}
}
```

---

## DB table: `appointments`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| patient_id | bigint FK | → patients.id |
| specialist_id | bigint FK nullable | → users.id |
| receptionist_id | bigint FK nullable | → users.id |
| taken_by_id | bigint FK nullable | → users.id |
| scheduled_at | datetime | |
| status | varchar | scheduled/in_progress/paused/completed/cancelled |
| notes | text nullable | |
| reason | varchar nullable | |
| is_billed | boolean default false | |
| sale_id | bigint FK nullable | → sales.id |
| left_eye_annotation_paths | json nullable | |
| left_eye_annotation_image | varchar nullable | storage path |
| right_eye_annotation_paths | json nullable | |
| right_eye_annotation_image | varchar nullable | storage path |
| lens_annotation_image | varchar nullable | storage path |
| lens_annotation_paths | json nullable | |
| appointment_type_id | bigint FK nullable | → appointment_types.id |
| created_at | timestamp | |
| updated_at | timestamp | |
