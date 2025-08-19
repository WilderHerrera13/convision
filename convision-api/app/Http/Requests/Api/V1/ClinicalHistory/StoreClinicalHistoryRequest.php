<?php

namespace App\Http\Requests\Api\V1\ClinicalHistory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\ClinicalHistory;

class StoreClinicalHistoryRequest extends FormRequest
{
    public function authorize()
    {
        $user = Auth::user();
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'specialist') {
            // Specialist can only create histories for patients in their appointments
            return $user->appointments()
                ->where('patient_id', $this->input('patient_id'))
                ->exists();
        }
        return false;
    }

    public function rules()
    {
        return [
            'patient_id' => [
                'required',
                'exists:patients,id',
                function ($attribute, $value, $fail) {
                    // Check if patient already has a clinical history
                    if (ClinicalHistory::where('patient_id', $value)->exists()) {
                        $fail('El paciente ya tiene una historia clínica.');
                    }
                }
            ],
            'reason_for_consultation' => 'required|string|max:1000',
            'current_illness' => 'nullable|string',
            'background_personal_pathological' => 'nullable|string',
            'background_family_pathological' => 'nullable|string',
            'background_allergies' => 'nullable|string',
            'background_surgical' => 'nullable|string',
            'background_pharmacological' => 'nullable|string',
            'background_toxic_habits' => 'nullable|string',
            'background_immunizations' => 'nullable|string',
            'background_gynecological_obstetrical' => 'nullable|string',
            'background_other' => 'nullable|string',
            'physical_exam_vital_signs' => 'nullable|string',
            'physical_exam_general_appearance' => 'nullable|string',
            'physical_exam_head_neck' => 'nullable|string',
            'physical_exam_cardiovascular' => 'nullable|string',
            'physical_exam_respiratory' => 'nullable|string',
            'physical_exam_abdomen' => 'nullable|string',
            'physical_exam_genitourinary' => 'nullable|string',
            'physical_exam_musculoskeletal' => 'nullable|string',
            'physical_exam_neurological' => 'nullable|string',
            'physical_exam_skin_appendages' => 'nullable|string',
            'diagnostic_impression' => 'nullable|string',
            'treatment_plan' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'observations' => 'nullable|string',
            'professional_conduct' => 'nullable|string',
            // Add more rules as needed based on ClinicalHistory model fillable fields
        ];
    }

    public function messages()
    {
        return [
            'patient_id.required' => 'El ID del paciente es obligatorio.',
            'patient_id.exists' => 'El paciente seleccionado no es válido.',
            'reason_for_consultation.required' => 'El motivo de la consulta es obligatorio.',
            'reason_for_consultation.max' => 'El motivo de la consulta no debe exceder los 1000 caracteres.',
        ];
    }

    protected function prepareForValidation()
    {
        // You can add any data preparation logic here if needed
    }
} 