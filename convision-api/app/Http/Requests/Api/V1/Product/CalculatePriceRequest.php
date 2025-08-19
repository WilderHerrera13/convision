<?php

namespace App\Http\Requests\Api\V1\Product;

use Illuminate\Foundation\Http\FormRequest;

class CalculatePriceRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'patient_id' => 'nullable|integer|exists:patients,id',
            'quantity' => 'nullable|integer|min:1'
        ];
    }

    public function messages()
    {
        return [
            'patient_id.integer' => 'El ID del paciente debe ser un número entero.',
            'patient_id.exists' => 'El paciente especificado no existe.',
            'quantity.integer' => 'La cantidad debe ser un número entero.',
            'quantity.min' => 'La cantidad mínima es 1.',
        ];
    }
}