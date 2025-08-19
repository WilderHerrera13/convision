<?php

namespace App\Http\Requests\Api\V1\Brand;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreBrandRequest extends FormRequest
{
    public function authorize()
    {
        // Assuming only admin or specialist can create brands
        $user = Auth::user();
        return $user && ($user->role === 'admin' || $user->role === 'specialist');
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:100|unique:brands,name',
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