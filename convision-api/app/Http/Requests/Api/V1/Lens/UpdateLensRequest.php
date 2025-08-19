<?php

namespace App\Http\Requests\Api\V1\Lens;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLensRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $lensId = $this->route('lens') ? $this->route('lens')->id : $this->route('id');
        return [
            'internal_code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('lenses')->ignore($lensId)],
            'identifier' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'material' => 'sometimes|required|string|max:255',
            'lens_class' => 'sometimes|required|string|max:255',
            'treatment' => 'nullable|string|max:255',
            'photochromic' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'supplier' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0.01',
            'cost' => 'sometimes|required|numeric|min:0',
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