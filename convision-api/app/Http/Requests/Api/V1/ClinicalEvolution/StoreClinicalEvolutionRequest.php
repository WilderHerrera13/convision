<?php

namespace App\Http\Requests\Api\V1\ClinicalEvolution;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\ClinicalHistory;
use App\Models\Appointment;

class StoreClinicalEvolutionRequest extends FormRequest
{
    public function authorize()
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin', 'specialist'])) {
            return false;
        }

        $history = ClinicalHistory::find($this->input('clinical_history_id'));
        if (!$history) {
            return false; // Or handle error: history not found
        }

        if ($user->role === 'specialist') {
            $canAccessPatient = $user->appointments()
                ->where('patient_id', $history->patient_id)
                ->exists();
            if (!$canAccessPatient) {
                return false;
            }

            if ($this->filled('appointment_id')) {
                $appointment = Appointment::find($this->input('appointment_id'));
                if (!$appointment || $appointment->specialist_id !== $user->id || $appointment->patient_id !== $history->patient_id) {
                    return false;
                }
            }
        }
        return true;
    }

    public function rules()
    {
        return [
            'clinical_history_id' => 'required|exists:clinical_histories,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'evolution_date' => 'required|date',
            'subjective' => 'required|string',
            'objective' => 'required|string',
            'assessment' => 'required|string',
            'plan' => 'required|string',
            'diagnostic_impression' => 'nullable|string',
            'treatment_given' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'observations' => 'nullable|string',
            'vital_signs' => 'nullable|array',
            'vital_signs.blood_pressure' => 'nullable|string',
            'vital_signs.heart_rate' => 'nullable|string',
            'vital_signs.respiratory_rate' => 'nullable|string',
            'vital_signs.temperature' => 'nullable|string',
            'vital_signs.oxygen_saturation' => 'nullable|string',
        ];
    }

    public function messages()
    {
        return [
            'clinical_history_id.required' => 'La historia clínica es obligatoria.',
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
                $history = ClinicalHistory::find($this->input('clinical_history_id'));
                if ($appointment && $history && $appointment->patient_id !== $history->patient_id) {
                    $validator->errors()->add('appointment_id', 'La cita no pertenece al mismo paciente de la historia clínica.');
                }
            }
        });
    }
} 