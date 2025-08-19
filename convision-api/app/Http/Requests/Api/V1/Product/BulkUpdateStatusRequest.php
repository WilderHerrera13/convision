<?php

namespace App\Http\Requests\Api\V1\Product;

use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'product_ids' => 'required|array',
            'product_ids.*' => 'exists:products,id',
            'status' => 'required|in:enabled,disabled'
        ];
    }

    public function messages()
    {
        return [
            'product_ids.required' => 'Se requiere una lista de productos.',
            'product_ids.array' => 'Los productos deben ser enviados como una lista.',
            'product_ids.*.exists' => 'Uno o más productos no existen.',
            'status.required' => 'El estado es requerido.',
            'status.in' => 'El estado debe ser "enabled" o "disabled".',
        ];
    }
} 