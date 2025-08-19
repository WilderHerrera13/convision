<?php

namespace App\Http\Requests\Api\V1\LensClass;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreLensClassRequest extends FormRequest
{
    public function authorize()
    {
        // Assuming only admin or specialist can create lens classes
        // Adjust roles as per your application's requirements
        $user = Auth::user();
        return $user && ($user->role === 'admin' || $user->role === 'specialist');
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255|unique:lens_classes,name',
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