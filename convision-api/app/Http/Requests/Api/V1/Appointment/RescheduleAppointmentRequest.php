<?php

namespace App\Http\Requests\Api\V1\Appointment;

use Illuminate\Foundation\Http\FormRequest;
use Carbon\Carbon;

class RescheduleAppointmentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'scheduled_at' => 'required_without_all:date,time|date_format:Y-m-d H:i',
            'date' => 'required_without:scheduled_at|date_format:Y-m-d',
            'time' => 'required_without:scheduled_at|date_format:H:i',
            'specialist_id' => 'nullable|exists:users,id,role,specialist',
            'notes' => 'nullable|string',
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