<?php

namespace App\Http\Requests\Api\V1\ServiceOrder;

use Illuminate\Foundation\Http\FormRequest;

class StoreServiceOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'supplier_id' => 'required|exists:suppliers,id',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:100',
            'customer_email' => 'nullable|email|max:255',
            'service_type' => 'required|string|max:150',
            'problem_description' => 'required|string',
            'estimated_cost' => 'nullable|numeric|min:0',
            'deadline' => 'nullable|date',
            'priority' => 'required|in:low,medium,high',
            'notes' => 'nullable|string',
        ];
    }
}
