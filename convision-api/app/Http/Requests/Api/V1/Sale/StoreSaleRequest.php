<?php

namespace App\Http\Requests\Api\V1\Sale;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'patient_id' => 'required|exists:patients,id',
            'order_id' => 'nullable|exists:orders,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'subtotal' => 'required|numeric|min:0',
            'tax' => 'required|numeric|min:0',
            'discount' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'payments' => 'sometimes|array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.reference_number' => 'nullable|string',
            'payments.*.payment_date' => 'required|date',
            'payments.*.notes' => 'nullable|string',
            'is_partial_payment' => 'sometimes|boolean',
            'laboratory_id' => 'nullable|exists:laboratories,id',
            'laboratory_notes' => 'nullable|string',
            
            // Lens detection fields for automatic laboratory order creation
            'contains_lenses' => 'sometimes|boolean',
            'lens_items' => 'sometimes|array',
            'lens_items.*.lens_id' => 'required_with:lens_items|exists:products,id',
            'lens_items.*.quantity' => 'required_with:lens_items|integer|min:1',
            'lens_items.*.price' => 'required_with:lens_items|numeric|min:0',
            
            // Direct sale items (alternative to order-based sales)
            'items' => 'sometimes|array',
            'items.*.lens_id' => 'nullable|exists:products,id',
            'items.*.quantity' => 'sometimes|integer|min:1',
            'items.*.price' => 'sometimes|numeric|min:0',
            'items.*.discount' => 'sometimes|numeric|min:0',
            'items.*.total' => 'sometimes|numeric|min:0',
        ];
    }
} 