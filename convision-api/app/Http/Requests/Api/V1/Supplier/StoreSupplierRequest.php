<?php

namespace App\Http\Requests\Api\V1\Supplier;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Or add specific authorization logic
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'nit' => 'nullable|string|max:255|unique:suppliers,nit',
            'legal_name' => 'nullable|string|max:255',
            'legal_representative' => 'nullable|string|max:255',
            'legal_representative_id' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:suppliers,email',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'nit.unique' => 'El NIT ya existe.',
            'email.unique' => 'El correo electrónico ya existe.',
            'email.email' => 'El correo electrónico no es válido.',
        ];
    }
} 