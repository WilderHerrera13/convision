<?php

namespace App\Http\Requests\Api\V1\Supplier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Or add specific authorization logic
    }

    public function rules()
    {
        $supplierId = $this->route('supplier'); // Assuming route parameter is 'supplier'

        return [
            'name' => 'sometimes|required|string|max:255',
            'nit' => ['nullable', 'string', 'max:255', Rule::unique('suppliers')->ignore($supplierId)],
            'legal_name' => 'nullable|string|max:255',
            'legal_representative' => 'nullable|string|max:255',
            'legal_representative_id' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => ['nullable', 'email', 'max:255', Rule::unique('suppliers')->ignore($supplierId)],
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