<?php

namespace App\Http\Requests\Api\V1\Order;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrderRequest extends FormRequest
{
    public function authorize()
    {
        // Add authorization logic if needed, e.g., check user role
        return true;
    }

    public function rules()
    {
        return [
            'status' => ['sometimes', 'required', Rule::in(['pending', 'processing', 'completed', 'cancelled'])],
            'payment_status' => ['sometimes', 'required', Rule::in(['pending', 'paid', 'refunded'])],
            'notes' => 'nullable|string',
            // You might want to add rules for updating items if that's a feature
            // For example:
            // 'items' => 'sometimes|array',
            // 'items.*.id' => 'sometimes|exists:order_items,id', // If updating existing items
            // 'items.*.lens_id' => 'sometimes|required|exists:lenses,id',
            // 'items.*.quantity' => 'sometimes|required|integer|min:1',
            // 'items.*.price' => 'sometimes|required|numeric|min:0',
            // 'items.*.discount' => 'sometimes|required|numeric|min:0',
            // 'items.*.total' => 'sometimes|required|numeric|min:0',
            // 'items.*.notes' => 'nullable|string',
        ];
    }

    public function messages()
    {
        return [
            'status.required' => 'El estado es obligatorio.',
            'status.in' => 'El estado seleccionado no es válido.',
            'payment_status.required' => 'El estado de pago es obligatorio.',
            'payment_status.in' => 'El estado de pago seleccionado no es válido.',
        ];
    }
} 