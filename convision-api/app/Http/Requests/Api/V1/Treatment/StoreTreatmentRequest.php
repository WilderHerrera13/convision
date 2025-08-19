<?php

namespace App\Http\Requests\Api\V1\Treatment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreTreatmentRequest extends FormRequest
{
    public function authorize()
    {
        // Assuming only admin or specialist can create treatments
        $user = Auth::user();
        return $user && ($user->role === 'admin' || $user->role === 'specialist');
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255|unique:treatments,name',
            'description' => 'nullable|string|max:1000',
            'cost' => 'nullable|numeric|min:0',
            // Add other relevant fields for Treatment model
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre del tratamiento es obligatorio.',
            'name.unique' => 'Ya existe un tratamiento con este nombre.',
            'name.max' => 'El nombre no debe exceder los 255 caracteres.',
            'description.max' => 'La descripción no debe exceder los 1000 caracteres.',
            'cost.numeric' => 'El costo debe ser un valor numérico.',
            'cost.min' => 'El costo debe ser como mínimo 0.',
        ];
    }
} 