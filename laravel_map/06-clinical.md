# 06 — Clinical History & Clinical Evolution

## Source files
- Controllers: `app/Http/Controllers/Api/V1/ClinicalHistoryController.php`
                `app/Http/Controllers/Api/V1/ClinicalEvolutionController.php`
- Resources: `app/Http/Resources/V1/Clinical/ClinicalHistoryResource.php`
             `app/Http/Resources/V1/Clinical/ClinicalEvolutionResource.php`

---

## Middleware
**No authentication required** on these routes (public with no explicit middleware group in routes/api.php).

---

## Clinical History Endpoints

### GET /api/v1/clinical-histories
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated ClinicalHistoryResource collection (no evolutions loaded)

---

### GET /api/v1/clinical-histories/{id}
**Response 200:** ClinicalHistoryResource (with evolutions loaded)

---

### POST /api/v1/clinical-histories
**Request body:**
```json
{
  "patient_id": 1,                        // required|exists:patients,id
  "reason_for_consultation": "string",   // nullable
  "current_illness": "string",           // nullable
  "personal_history": "string",          // nullable
  "family_history": "string",            // nullable
  "occupational_history": "string",      // nullable

  "uses_optical_correction": true,       // nullable|boolean
  "optical_correction_type": "string",   // nullable
  "last_control_detail": "string",       // nullable
  "ophthalmological_diagnosis": "string",// nullable
  "eye_surgery": "string",               // nullable

  "has_systemic_disease": false,         // nullable|boolean
  "systemic_disease_detail": "string",   // nullable
  "medications": "string",               // nullable
  "allergies": "string",                 // nullable

  "right_far_vision_no_correction": "20/200",
  "left_far_vision_no_correction": "20/200",
  "right_near_vision_no_correction": "20/40",
  "left_near_vision_no_correction": "20/40",
  "right_far_vision_with_correction": "20/20",
  "left_far_vision_with_correction": "20/20",
  "right_near_vision_with_correction": "20/20",
  "left_near_vision_with_correction": "20/20",

  "right_eye_external_exam": "string",
  "left_eye_external_exam": "string",
  "right_eye_ophthalmoscopy": "string",
  "left_eye_ophthalmoscopy": "string",

  "right_eye_horizontal_k": "string",
  "right_eye_vertical_k": "string",
  "left_eye_horizontal_k": "string",
  "left_eye_vertical_k": "string",

  "refraction_technique": "string",
  "right_eye_static_sphere": "-1.50",
  "right_eye_static_cylinder": "-0.50",
  "right_eye_static_axis": 90,
  "right_eye_static_visual_acuity": "20/20",
  "left_eye_static_sphere": "-2.00",
  "left_eye_static_cylinder": "-0.75",
  "left_eye_static_axis": 85,
  "left_eye_static_visual_acuity": "20/20",
  "right_eye_subjective_sphere": "-1.25",
  "right_eye_subjective_cylinder": "-0.50",
  "right_eye_subjective_axis": 90,
  "right_eye_subjective_visual_acuity": "20/20",
  "left_eye_subjective_sphere": "-1.75",
  "left_eye_subjective_cylinder": "-0.75",
  "left_eye_subjective_axis": 85,
  "left_eye_subjective_visual_acuity": "20/20",

  "diagnostic": "string",
  "treatment_plan": "string",
  "observations": "string"
}
```
**Response 201:** ClinicalHistoryResource

---

### PUT /api/v1/clinical-histories/{id}
**Request body:** Same fields, all optional.
**Response 200:** ClinicalHistoryResource

---

### GET /api/v1/patients/{patientId}/clinical-history
Returns the clinical history for a specific patient.
**Response 200:** ClinicalHistoryResource (single, not paginated)
**Response 404:** Not found

---

## ClinicalHistoryResource shape
```json
{
  "id": 1,
  "patient_id": 1,
  "patient": { ...PatientResource },
  "creator": { ...UserResource },
  "updater": { ...UserResource },
  "evolutions": [ ...ClinicalEvolutionResource ],

  "reason_for_consultation": "string",
  "current_illness": "string",
  "personal_history": "string",
  "family_history": "string",
  "occupational_history": "string",

  "uses_optical_correction": true,
  "optical_correction_type": "string",
  "last_control_detail": "string",
  "ophthalmological_diagnosis": "string",
  "eye_surgery": "string",

  "has_systemic_disease": false,
  "systemic_disease_detail": "string",
  "medications": "string",
  "allergies": "string",

  "right_far_vision_no_correction": "string",
  "left_far_vision_no_correction": "string",
  "right_near_vision_no_correction": "string",
  "left_near_vision_no_correction": "string",
  "right_far_vision_with_correction": "string",
  "left_far_vision_with_correction": "string",
  "right_near_vision_with_correction": "string",
  "left_near_vision_with_correction": "string",

  "right_eye_external_exam": "string",
  "left_eye_external_exam": "string",
  "right_eye_ophthalmoscopy": "string",
  "left_eye_ophthalmoscopy": "string",

  "right_eye_horizontal_k": "string",
  "right_eye_vertical_k": "string",
  "left_eye_horizontal_k": "string",
  "left_eye_vertical_k": "string",

  "refraction_technique": "string",
  "right_eye_static_sphere": "string",
  "right_eye_static_cylinder": "string",
  "right_eye_static_axis": "string",
  "right_eye_static_visual_acuity": "string",
  "left_eye_static_sphere": "string",
  "left_eye_static_cylinder": "string",
  "left_eye_static_axis": "string",
  "left_eye_static_visual_acuity": "string",
  "right_eye_subjective_sphere": "string",
  "right_eye_subjective_cylinder": "string",
  "right_eye_subjective_axis": "string",
  "right_eye_subjective_visual_acuity": "string",
  "left_eye_subjective_sphere": "string",
  "left_eye_subjective_cylinder": "string",
  "left_eye_subjective_axis": "string",
  "left_eye_subjective_visual_acuity": "string",

  "diagnostic": "string",
  "treatment_plan": "string",
  "observations": "string",

  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "pdf_token": "string",
  "guest_pdf_url": "https://..."
}
```

---

## Clinical Evolution Endpoints

### GET /api/v1/clinical-histories/{historyId}/evolutions
Returns evolutions for a given clinical history.
**Paginated:** Yes.
**Response 200:** Paginated ClinicalEvolutionResource collection

---

### GET /api/v1/clinical-evolutions/{id}
**Response 200:** ClinicalEvolutionResource

---

### POST /api/v1/clinical-evolutions
**Request body:**
```json
{
  "clinical_history_id": 1,    // required|exists:clinical_histories,id
  "appointment_id": 1,         // nullable|exists:appointments,id
  "evolution_date": "2024-05-01",  // required|date

  "subjective": "string",      // nullable — patient-reported symptoms
  "objective": "string",       // nullable — exam findings
  "assessment": "string",      // nullable — diagnosis
  "plan": "string",            // nullable — treatment plan
  "recommendations": "string", // nullable

  "right_far_vision": "20/20", // nullable
  "left_far_vision": "20/40",  // nullable
  "right_near_vision": "20/20",// nullable
  "left_near_vision": "20/20", // nullable

  "right_eye_sphere": "-1.50", // nullable
  "right_eye_cylinder": "-0.50",// nullable
  "right_eye_axis": 90,        // nullable
  "right_eye_visual_acuity": "20/20",// nullable
  "left_eye_sphere": "-2.00",  // nullable
  "left_eye_cylinder": "-0.75",// nullable
  "left_eye_axis": 85,         // nullable
  "left_eye_visual_acuity": "20/20" // nullable
}
```
**Response 201:** ClinicalEvolutionResource

---

### PUT /api/v1/clinical-evolutions/{id}
**Request body:** Same fields, optional.
**Response 200:** ClinicalEvolutionResource

---

### DELETE /api/v1/clinical-evolutions/{id}
**Response 204:** No content

---

### POST /api/v1/appointments/{appointmentId}/evolution
Creates a clinical evolution tied to a specific appointment.
Same body as POST /clinical-evolutions but `appointment_id` derived from URL.
**Response 201:** ClinicalEvolutionResource

---

## ClinicalEvolutionResource shape
```json
{
  "id": 1,
  "clinical_history_id": 1,
  "appointment_id": 1,
  "evolution_date": "2024-05-01",
  "subjective": "string",
  "objective": "string",
  "assessment": "string",
  "plan": "string",
  "recommendations": "string",
  "right_far_vision": "string",
  "left_far_vision": "string",
  "right_near_vision": "string",
  "left_near_vision": "string",
  "right_eye_sphere": "string",
  "right_eye_cylinder": "string",
  "right_eye_axis": "string",
  "right_eye_visual_acuity": "string",
  "left_eye_sphere": "string",
  "left_eye_cylinder": "string",
  "left_eye_axis": "string",
  "left_eye_visual_acuity": "string",
  "created_by": 1,
  "updated_by": 1,
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "creator": { ...UserResource },
  "updater": { ...UserResource },
  "appointment": { ...AppointmentResource },
  "clinical_history": { ...ClinicalHistoryResource }
}
```
