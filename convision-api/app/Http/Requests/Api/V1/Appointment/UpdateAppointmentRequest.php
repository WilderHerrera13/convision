<?php

namespace App\Http\Requests\Api\V1\Appointment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'specialist_id' => 'nullable|exists:users,id,role,specialist',
            'scheduled_at' => 'sometimes|date_format:Y-m-d H:i',
            'date' => 'sometimes|date_format:Y-m-d',
            'time' => 'sometimes|date_format:H:i',
            'notes' => 'nullable|string',
            'status' => ['sometimes', Rule::in(['scheduled', 'completed', 'cancelled', 'in_progress', 'paused'])],
            'appointment_type_id' => 'nullable|exists:appointment_types,id',
        ];
    }

    public function validated($key = null, $default = null)
    {
        $validated = parent::validated($key, $default);
        
        // If date and time are provided separately, combine them into scheduled_at
        if (isset($validated['date']) && isset($validated['time'])) {
            $validated['scheduled_at'] = Carbon::createFromFormat('Y-m-d H:i', $validated['date'] . ' ' . $validated['time'])->format('Y-m-d H:i:s');
            unset($validated['date'], $validated['time']);
        }
        
        return $validated;
    }
} 