<?php

namespace App\Http\Requests\Api\V1\Quote;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuoteRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'patient_id' => 'sometimes|required|exists:patients,id',
            'subtotal' => 'sometimes|required|numeric|min:0',
            'tax' => 'sometimes|required|numeric|min:0',
            'discount' => 'sometimes|required|numeric|min:0',
            'total' => 'sometimes|required|numeric|min:0',
            'expiration_date' => 'sometimes|required|date|after:today',
            'notes' => 'nullable|string',
            // Items are not updatable via this request for now
            // 'items' => 'sometimes|array|min:1',
            // 'items.*.product_id' => 'sometimes|required|exists:products,id',
            // 'items.*.quantity' => 'sometimes|required|integer|min:1',
            // 'items.*.price' => 'sometimes|required|numeric|min:0',
            // 'items.*.discount' => 'sometimes|required|numeric|min:0',
            // 'items.*.total' => 'sometimes|required|numeric|min:0',
            // 'items.*.notes' => 'nullable|string',
        ];
    }
} 