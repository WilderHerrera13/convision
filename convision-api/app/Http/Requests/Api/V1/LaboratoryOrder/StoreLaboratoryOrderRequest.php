<?php

namespace App\Http\Requests\Api\V1\LaboratoryOrder;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLaboratoryOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'order_id' => 'nullable|exists:orders,id',
            'sale_id' => 'nullable|exists:sales,id',
            'laboratory_id' => 'required|exists:laboratories,id',
            'patient_id' => 'required|exists:patients,id',
            'status' => ['nullable', Rule::in(['pending', 'in_process', 'sent_to_lab', 'ready_for_delivery', 'delivered', 'cancelled'])],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'estimated_completion_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ];
    }
} 