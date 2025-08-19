<?php

namespace App\Http\Requests\Api\V1\ClinicalEvolution;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\Appointment;
use App\Models\ClinicalHistory;
use App\Models\ClinicalEvolution;

class CreateClinicalEvolutionFromAppointmentRequest extends FormRequest
{
    public function authorize()
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin', 'specialist'])) {
            return false;
        }

        $appointmentId = $this->route('appointmentId');
        $appointment = Appointment::find($appointmentId);
        if (!$appointment) {
             return false;
        }

        if ($user->role === 'specialist' && $appointment->specialist_id !== $user->id) {
            return false; // Specialist can only use their own appointments
        }

        // Check if there's a clinical history for this patient
        $history = ClinicalHistory::where('patient_id', $appointment->patient_id)->first();
        if (!$history) {
            // This scenario should be handled by the controller, but good to have a check
            return false; 
        }

        // Note: We allow multiple evolutions per appointment
        // The business logic can handle this in the frontend/controller if needed

        return true;
    }

    public function rules()
    {
        return [
            // clinical_history_id and appointment_id will be set from the route/controller
            'evolution_date' => 'nullable|date',
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
            'subjective.required' => 'La sección subjetiva es obligatoria.',
            'objective.required' => 'La sección objetiva es obligatoria.',
            'assessment.required' => 'La sección de apreciación/diagnóstico es obligatoria.',
            'plan.required' => 'La sección de plan de manejo es obligatoria.',
        ];
    }
} 