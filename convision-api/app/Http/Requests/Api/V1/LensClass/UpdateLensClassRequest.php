<?php

namespace App\Http\Requests\Api\V1\LensClass;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateLensClassRequest extends FormRequest
{
    public function authorize()
    {
        // Assuming only admin or specialist can update lens classes
        // Adjust roles as per your application's requirements
        $user = Auth::user();
        return $user && ($user->role === 'admin' || $user->role === 'specialist');
    }

    public function rules()
    {
        $lensClassId = $this->route('lens_class'); // Assuming route parameter is 'lens_class'
        if (is_object($lensClassId)) {
            $lensClassId = $lensClassId->id;
        }

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('lens_classes')->ignore($lensClassId)],
            'description' => 'nullable|string|max:1000',
            // Add any other fields that might be relevant for a LensClass
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre de la clase de lente es obligatorio.',
            'name.unique' => 'Ya existe una clase de lente con este nombre.',
            'name.max' => 'El nombre no debe exceder los 255 caracteres.',
            'description.max' => 'La descripción no debe exceder los 1000 caracteres.',
        ];
    }
} 