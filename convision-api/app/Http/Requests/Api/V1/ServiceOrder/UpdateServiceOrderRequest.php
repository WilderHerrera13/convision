<?php

namespace App\Http\Requests\Api\V1\ServiceOrder;

use Illuminate\Foundation\Http\FormRequest;

class UpdateServiceOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'customer_name' => 'sometimes|string|max:255',
            'customer_phone' => 'sometimes|string|max:100',
            'customer_email' => 'nullable|email|max:255',
            'service_type' => 'sometimes|string|max:150',
            'problem_description' => 'sometimes|string',
            'estimated_cost' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'deadline' => 'nullable|date',
            'priority' => 'sometimes|in:low,medium,high',
            'status' => 'sometimes|in:pending,in_progress,completed,delivered,cancelled',
            'notes' => 'nullable|string',
        ];
    }
}
