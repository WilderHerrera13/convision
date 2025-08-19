<?php

namespace App\Http\Requests\Api\V1\Brand;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateBrandRequest extends FormRequest
{
    public function authorize()
    {
        // Assuming only admin or specialist can update brands
        $user = Auth::user();
        return $user && ($user->role === 'admin' || $user->role === 'specialist');
    }

    public function rules()
    {
        $brandId = $this->route('brand'); // Assuming route model binding with 'brand'
        if (is_object($brandId)) {
            $brandId = $brandId->id;
        }

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('brands')->ignore($brandId)],
            'description' => 'nullable|string|max:1000',
            // Add other relevant fields for Brand model if any
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre de la marca es obligatorio.',
            'name.unique' => 'Ya existe una marca con este nombre.',
            'name.max' => 'El nombre no debe exceder los 100 caracteres.',
            'description.max' => 'La descripción no debe exceder los 1000 caracteres.',
        ];
    }
} 