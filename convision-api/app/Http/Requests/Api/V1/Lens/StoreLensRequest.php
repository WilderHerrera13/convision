<?php

namespace App\Http\Requests\Api\V1\Lens;

use Illuminate\Foundation\Http\FormRequest;

class StoreLensRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'internal_code' => 'required|string|max:255|unique:lenses',
            'identifier' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'material' => 'required|string|max:255',
            'lens_class' => 'required|string|max:255',
            'treatment' => 'nullable|string|max:255',
            'photochromic' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'supplier' => 'required|string|max:255',
            'price' => 'required|numeric|min:0.01',
            'cost' => 'required|numeric|min:0',
            'sphere_min' => 'nullable|numeric',
            'sphere_max' => 'nullable|numeric',
            'cylinder_min' => 'nullable|numeric',
            'cylinder_max' => 'nullable|numeric',
            'addition_min' => 'nullable|numeric',
            'addition_max' => 'nullable|numeric',
            'is_active' => 'sometimes|boolean',
        ];
    }
} 