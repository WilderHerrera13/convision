<?php

namespace App\Http\Requests\Api\V1\Laboratory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLaboratoryRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $laboratoryId = $this->route('laboratory'); // laboratory is the route parameter name
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('laboratories')->ignore($laboratoryId)],
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'contact_person' => 'nullable|string|max:255',
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'notes' => 'nullable|string',
        ];
    }
} 