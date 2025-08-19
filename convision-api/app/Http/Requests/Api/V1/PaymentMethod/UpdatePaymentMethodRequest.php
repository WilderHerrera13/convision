<?php

namespace App\Http\Requests\Api\V1\PaymentMethod;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdatePaymentMethodRequest extends FormRequest
{
    public function authorize()
    {
        return Auth::user()->role === 'admin';
    }

    public function rules()
    {
        $paymentMethodId = $this->route('payment_method'); // Assuming route parameter name is 'payment_method'

        return [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('payment_methods')->ignore($paymentMethodId)],
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
} 