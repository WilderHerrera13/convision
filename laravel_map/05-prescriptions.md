# 05 — Prescriptions

## Source files
- Controller: `app/Http/Controllers/Api/V1/PrescriptionController.php`
- Store Request: `app/Http/Requests/Api/V1/Prescription/StorePrescriptionRequest.php`
- Update Request: `app/Http/Requests/Api/V1/Prescription/UpdatePrescriptionRequest.php`
- Resource: `app/Http/Resources/V1/Clinical/PrescriptionResource.php`

---

## Middleware
All routes: `auth:api`

---

## Endpoints

### GET /api/v1/prescriptions
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated PrescriptionResource collection

---

### GET /api/v1/prescriptions/{id}
**Response 200:** PrescriptionResource

---

### POST /api/v1/prescriptions
**Request body:**
```json
{
  "appointment_id": 1,            // nullable|exists:appointments,id
  "date": "2024-05-01",           // required|date
  "document": "string",           // nullable
  "patient_name": "string",       // nullable

  "right_sphere": "-1.50",        // nullable|numeric
  "right_cylinder": "-0.50",      // nullable|numeric
  "right_axis": 90,               // nullable|integer
  "right_addition": "+1.00",      // nullable|numeric
  "right_height": 22,             // nullable|numeric
  "right_distance_p": 32,         // nullable|numeric
  "right_visual_acuity_far": "20/20", // nullable|string
  "right_visual_acuity_near": "20/20",// nullable|string

  "left_sphere": "-2.00",
  "left_cylinder": "-0.75",
  "left_axis": 85,
  "left_addition": "+1.00",
  "left_height": 22,
  "left_distance_p": 32,
  "left_visual_acuity_far": "20/40",
  "left_visual_acuity_near": "20/20",

  "correction_type": "string",    // nullable
  "usage_type": "string",         // nullable
  "recommendation": "string",     // nullable
  "professional": "string",       // nullable
  "observation": "string",        // nullable
  "attachment": "string"          // nullable (file path)
}
```

**Response 201:** PrescriptionResource

---

### PUT /api/v1/prescriptions/{id}
**Request body:** Same fields, all optional.
**Response 200:** PrescriptionResource

---

### DELETE /api/v1/prescriptions/{id}
**Response 204:** No content

---

### POST /api/v1/prescriptions/{id}/annotation
Upload annotation image for prescription.
**Content-Type:** `multipart/form-data`
**Form fields:** `annotation_image`, optionally `annotation_paths` (JSON)
**Response 200:** PrescriptionResource

---

### GET /api/v1/prescriptions/{id}/annotation
Returns annotation image URL and paths.
**Response 200:**
```json
{
  "annotation_paths": {},
  "annotation_image_url": "https://..."
}
```

---

## PrescriptionResource shape
```json
{
  "id": 1,
  "appointment_id": 1,
  "date": "2024-05-01",
  "document": "string",
  "patient_name": "string",
  "right_sphere": "-1.50",
  "right_cylinder": "-0.50",
  "right_axis": 90,
  "right_addition": "+1.00",
  "right_height": 22,
  "right_distance_p": 32,
  "right_visual_acuity_far": "20/20",
  "right_visual_acuity_near": "20/20",
  "left_sphere": "-2.00",
  "left_cylinder": "-0.75",
  "left_axis": 85,
  "left_addition": "+1.00",
  "left_height": 22,
  "left_distance_p": 32,
  "left_visual_acuity_far": "20/40",
  "left_visual_acuity_near": "20/20",
  "correction_type": "string",
  "usage_type": "string",
  "recommendation": "string",
  "professional": "string",
  "observation": "string",
  "attachment": "string",
  "annotation_paths": {},
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "appointment": { ...AppointmentResource }
}
```

---

## DB table: `prescriptions`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| appointment_id | bigint FK nullable | → appointments.id |
| date | date | |
| document | varchar nullable | |
| patient_name | varchar nullable | |
| right_sphere | decimal nullable | |
| right_cylinder | decimal nullable | |
| right_axis | int nullable | |
| right_addition | decimal nullable | |
| right_height | decimal nullable | |
| right_distance_p | decimal nullable | |
| right_visual_acuity_far | varchar nullable | |
| right_visual_acuity_near | varchar nullable | |
| left_sphere | decimal nullable | |
| left_cylinder | decimal nullable | |
| left_axis | int nullable | |
| left_addition | decimal nullable | |
| left_height | decimal nullable | |
| left_distance_p | decimal nullable | |
| left_visual_acuity_far | varchar nullable | |
| left_visual_acuity_near | varchar nullable | |
| correction_type | varchar nullable | |
| usage_type | varchar nullable | |
| recommendation | text nullable | |
| professional | varchar nullable | |
| observation | text nullable | |
| attachment | varchar nullable | |
| annotation_paths | json nullable | |
| annotation_image | varchar nullable | storage path |
| created_at | timestamp | |
| updated_at | timestamp | |
