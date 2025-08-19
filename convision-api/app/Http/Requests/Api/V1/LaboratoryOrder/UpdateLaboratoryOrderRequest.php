<?php

namespace App\Http\Requests\Api\V1\LaboratoryOrder;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLaboratoryOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'laboratory_id' => 'nullable|exists:laboratories,id',
            'patient_id' => 'nullable|exists:patients,id',
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'estimated_completion_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ];
    }
} 