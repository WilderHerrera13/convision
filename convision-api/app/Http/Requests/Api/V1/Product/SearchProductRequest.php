<?php

namespace App\Http\Requests\Api\V1\Product;

use Illuminate\Foundation\Http\FormRequest;

class SearchProductRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'query' => 'required|string|min:2',
            'category' => 'nullable|string|exists:product_categories,slug',
            'limit' => 'nullable|integer|min:1|max:50'
        ];
    }

    public function messages()
    {
        return [
            'query.required' => 'El término de búsqueda es requerido.',
            'query.string' => 'El término de búsqueda debe ser texto.',
            'query.min' => 'El término de búsqueda debe tener al menos 2 caracteres.',
            'category.exists' => 'La categoría especificada no existe.',
            'limit.integer' => 'El límite debe ser un número entero.',
            'limit.min' => 'El límite mínimo es 1.',
            'limit.max' => 'El límite máximo es 50.',
        ];
    }
} 