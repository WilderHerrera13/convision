<?php

namespace App\Http\Requests\Api\V1\ClinicalHistory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateClinicalHistoryRequest extends FormRequest
{
    public function authorize()
    {
        $user = Auth::user();
        $history = $this->route('clinical_history'); // Assuming route model binding

        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'specialist') {
            // Specialist can only update histories for patients in their appointments
            return $user->appointments()
                ->where('patient_id', $history->patient_id)
                ->exists();
        }
        return false;
    }

    public function rules()
    {
        // 'sometimes' is used because not all fields are required for an update
        return [
            'reason_for_consultation' => 'sometimes|required|string|max:1000',
            'current_illness' => 'sometimes|nullable|string',
            'background_personal_pathological' => 'sometimes|nullable|string',
            'background_family_pathological' => 'sometimes|nullable|string',
            'background_allergies' => 'sometimes|nullable|string',
            'background_surgical' => 'sometimes|nullable|string',
            'background_pharmacological' => 'sometimes|nullable|string',
            'background_toxic_habits' => 'sometimes|nullable|string',
            'background_immunizations' => 'sometimes|nullable|string',
            'background_gynecological_obstetrical' => 'sometimes|nullable|string',
            'background_other' => 'sometimes|nullable|string',
            'physical_exam_vital_signs' => 'sometimes|nullable|string',
            'physical_exam_general_appearance' => 'sometimes|nullable|string',
            'physical_exam_head_neck' => 'sometimes|nullable|string',
            'physical_exam_cardiovascular' => 'sometimes|nullable|string',
            'physical_exam_respiratory' => 'sometimes|nullable|string',
            'physical_exam_abdomen' => 'sometimes|nullable|string',
            'physical_exam_genitourinary' => 'sometimes|nullable|string',
            'physical_exam_musculoskeletal' => 'sometimes|nullable|string',
            'physical_exam_neurological' => 'sometimes|nullable|string',
            'physical_exam_skin_appendages' => 'sometimes|nullable|string',
            'diagnostic_impression' => 'sometimes|nullable|string',
            'treatment_plan' => 'sometimes|nullable|string',
            'recommendations' => 'sometimes|nullable|string',
            'observations' => 'sometimes|nullable|string',
            'professional_conduct' => 'sometimes|nullable|string',
            // Add more rules as needed based on ClinicalHistory model fillable fields
        ];
    }

    public function messages()
    {
        return [
            'reason_for_consultation.required' => 'El motivo de la consulta es obligatorio.',
            'reason_for_consultation.max' => 'El motivo de la consulta no debe exceder los 1000 caracteres.',
        ];
    }

    protected function prepareForValidation()
    {
        // You can add any data preparation logic here if needed
    }
} 