<?php

namespace App\Http\Requests\Api\V1\ClinicalEvolution;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\ClinicalEvolution;
use App\Models\Appointment;

class UpdateClinicalEvolutionRequest extends FormRequest
{
    public function authorize()
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin', 'specialist'])) {
            return false;
        }

        $evolution = $this->route('clinical_evolution'); // Assuming route model binding
        if (!$evolution) {
            return false;
        }

        if ($user->role === 'specialist') {
            $canAccessPatient = $user->appointments()
                ->where('patient_id', $evolution->clinicalHistory->patient_id)
                ->exists();
            if (!$canAccessPatient) {
                return false;
            }

            if ($this->filled('appointment_id')) {
                $appointment = Appointment::find($this->input('appointment_id'));
                if (!$appointment || $appointment->specialist_id !== $user->id || $appointment->patient_id !== $evolution->clinicalHistory->patient_id) {
                    return false;
                }
            }
        }
        return true;
    }

    public function rules()
    {
        return [
            // clinical_history_id is not updatable for an existing evolution
            'appointment_id' => 'sometimes|nullable|exists:appointments,id',
            'evolution_date' => 'sometimes|required|date',
            'subjective' => 'sometimes|required|string',
            'objective' => 'sometimes|required|string',
            'assessment' => 'sometimes|required|string',
            'plan' => 'sometimes|required|string',
            'diagnostic_impression' => 'sometimes|nullable|string',
            'treatment_given' => 'sometimes|nullable|string',
            'recommendations' => 'sometimes|nullable|string',
            'observations' => 'sometimes|nullable|string',
            'vital_signs' => 'sometimes|nullable|array',
            'vital_signs.blood_pressure' => 'sometimes|nullable|string',
            'vital_signs.heart_rate' => 'sometimes|nullable|string',
            'vital_signs.respiratory_rate' => 'sometimes|nullable|string',
            'vital_signs.temperature' => 'sometimes|nullable|string',
            'vital_signs.oxygen_saturation' => 'sometimes|nullable|string',
        ];
    }

    public function messages()
    {
        return [
            'evolution_date.required' => 'La fecha de evolución es obligatoria.',
            'subjective.required' => 'La sección subjetiva es obligatoria.',
            'objective.required' => 'La sección objetiva es obligatoria.',
            'assessment.required' => 'La sección de apreciación/diagnóstico es obligatoria.',
            'plan.required' => 'La sección de plan de manejo es obligatoria.',
        ];
    }

    protected function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->filled('appointment_id')) {
                $appointment = Appointment::find($this->input('appointment_id'));
                $evolution = $this->route('clinical_evolution');
                if ($appointment && $evolution && $appointment->patient_id !== $evolution->clinicalHistory->patient_id) {
                    $validator->errors()->add('appointment_id', 'La cita no pertenece al mismo paciente de la historia clínica.');
                }
            }
        });
    }
} 