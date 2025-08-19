<?php

namespace App\Http\Requests\Api\V1\Prescription;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\Appointment;

class StorePrescriptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();
        
        if ($user->role !== 'specialist') {
            return false;
        }
        
        $appointment = Appointment::find($this->input('appointment_id'));
        if (!$appointment) {
            return false;
        }
        
        if ($appointment->specialist_id !== $user->id) {
            return false;
        }
        
        if (!in_array($appointment->status, ['in_progress', 'paused', 'completed'])) {
            return false;
        }
        
        if ($appointment->taken_by_id !== $user->id) {
            return false;
        }
        
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'appointment_id' => [
                'required',
                'exists:appointments,id',
                function ($attribute, $value, $fail) {
                    $appointment = Appointment::find($value);
                    if ($appointment) {
                        $hasHistory = $appointment->patient->clinicalHistories()->exists();
                        if (!$hasHistory) {
                            $fail('El paciente debe tener una historia clínica antes de crear una fórmula.');
                        }
                        
                        $hasEvolution = $appointment->patient->clinicalHistories()
                            ->whereHas('evolutions', function($q) use ($appointment) {
                                $q->where('appointment_id', $appointment->id);
                            })
                            ->exists();
                        
                        if (!$hasEvolution) {
                            $fail('Debe crear al menos una evolución clínica para esta cita antes de crear la fórmula.');
                        }
                    }
                }
            ],
            'date' => 'required|date',
            'document' => 'required|string',
            'patient_name' => 'required|string',
            'right_sphere' => 'nullable|string',
            'right_cylinder' => 'nullable|string',
            'right_axis' => 'nullable|string',
            'right_addition' => 'nullable|string',
            'right_height' => 'nullable|string',
            'right_distance_p' => 'nullable|string',
            'right_visual_acuity_far' => 'nullable|string',
            'right_visual_acuity_near' => 'nullable|string',
            'left_sphere' => 'nullable|string',
            'left_cylinder' => 'nullable|string',
            'left_axis' => 'nullable|string',
            'left_addition' => 'nullable|string',
            'left_height' => 'nullable|string',
            'left_distance_p' => 'nullable|string',
            'left_visual_acuity_far' => 'nullable|string',
            'left_visual_acuity_near' => 'nullable|string',
            'correction_type' => 'nullable|string',
            'usage_type' => 'nullable|string',
            'recommendation' => 'nullable|string',
            'professional' => 'nullable|string',
            'observation' => 'nullable|string',
            'attachment' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'appointment_id.required' => 'El ID de la cita es obligatorio.',
            'appointment_id.exists' => 'La cita seleccionada no es válida.',
            'date.required' => 'La fecha es obligatoria.',
            'document.required' => 'El documento es obligatorio.',
            'patient_name.required' => 'El nombre del paciente es obligatorio.',
        ];
    }
} 