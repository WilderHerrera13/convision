<?php

namespace App\Http\Requests\Api\V1\Material;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreMaterialRequest extends FormRequest
{
    public function authorize()
    {
        // Assuming only admin or specialist can create materials
        $user = Auth::user();
        return $user && ($user->role === 'admin' || $user->role === 'specialist');
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255|unique:materials,name',
            'description' => 'nullable|string|max:1000',
            // Add other relevant fields for Material model
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre del material es obligatorio.',
            'name.unique' => 'Ya existe un material con este nombre.',
            'name.max' => 'El nombre no debe exceder los 255 caracteres.',
            'description.max' => 'La descripción no debe exceder los 1000 caracteres.',
        ];
    }
} 