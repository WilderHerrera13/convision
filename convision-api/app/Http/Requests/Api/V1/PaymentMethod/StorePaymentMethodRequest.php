<?php

namespace App\Http\Requests\Api\V1\PaymentMethod;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StorePaymentMethodRequest extends FormRequest
{
    public function authorize()
    {
        return Auth::user()->role === 'admin';
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:payment_methods',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'is_active' => 'sometimes|boolean',
            'requires_reference' => 'sometimes|boolean',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre del método de pago es obligatorio.',
            'code.required' => 'El código del método de pago es obligatorio.',
            'code.unique' => 'El código del método de pago ya existe.',
        ];
    }

    protected function prepareForValidation()
    {
        if (!$this->has('is_active')) {
            $this->merge([
                'is_active' => true,
            ]);
        }
        if (!$this->has('requires_reference')) {
            $this->merge([
                'requires_reference' => false,
            ]);
        }
    }
} 