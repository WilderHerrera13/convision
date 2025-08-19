<?php

namespace App\Http\Requests\Api\V1\DiscountRequest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreDiscountRequestRequest extends FormRequest
{
    public function authorize()
    {
        // Any authenticated user can request a discount, authorization for approval is handled separately.
        return Auth::check();
    }

    public function rules()
    {
        return [
            'product_id' => 'required|exists:products,id',
            'patient_id' => 'nullable|exists:patients,id',
            'discount_percentage' => 'required|numeric|min:0.01|max:100',
            'reason' => 'nullable|string|max:500',
            'expiry_date' => 'nullable|date|after_or_equal:today',
            'is_global' => 'nullable|boolean',
        ];
    }

    public function messages()
    {
        return [
            'product_id.required' => 'El producto es obligatorio.',
            'product_id.exists' => 'El producto seleccionado no es válido.',
            'patient_id.exists' => 'El paciente seleccionado no es válido.',
            'discount_percentage.required' => 'El porcentaje de descuento es obligatorio.',
            'discount_percentage.numeric' => 'El porcentaje de descuento debe ser un número.',
            'discount_percentage.min' => 'El porcentaje de descuento debe ser al menos :min.',
            'discount_percentage.max' => 'El porcentaje de descuento no debe exceder :max.',
            'reason.max' => 'La razón no debe exceder los :max caracteres.',
            'expiry_date.date' => 'La fecha de expiración debe ser una fecha válida.',
            'expiry_date.after_or_equal' => 'La fecha de expiración debe ser hoy o una fecha futura.',
            'is_global.boolean' => 'El campo global debe ser verdadero o falso.',
        ];
    }

    protected function prepareForValidation()
    {
        if ($this->has('is_global') && !is_null($this->is_global)) {
            $this->merge([
                'is_global' => filter_var($this->is_global, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        } else if (!$this->has('is_global')){
            $this->merge(['is_global' => false]);
        }

        if ($this->boolean('is_global')) {
            $this->merge(['patient_id' => null]);
        }
    }
} 