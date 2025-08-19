<?php

namespace App\Http\Requests\Api\V1\DiscountRequest;

use Illuminate\Foundation\Http\FormRequest;

class ActiveDiscountsRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'product_id' => 'required|exists:products,id',
            'patient_id' => 'nullable|exists:patients,id',
        ];
    }

    public function messages()
    {
        return [
            'product_id.required' => 'El ID del producto es obligatorio.',
            'product_id.exists' => 'El producto seleccionado no existe.',
            'patient_id.exists' => 'El paciente seleccionado no existe.',
        ];
    }
} 