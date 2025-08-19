<?php

namespace App\Http\Requests\Api\V1\Patient;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        // Safely retrieve the patient ID from route parameters
        $patientId = $this->route('patient') ? ($this->route('patient')->id ?? $this->route('patient')) : $this->route('id');

        return [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'identification' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('patients')->ignore($patientId)],
            'identification_type_id' => 'sometimes|required|exists:identification_types,id',
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique('patients')->ignore($patientId)],
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'gender' => ['sometimes', 'required', 'in:male,female,other'],
            'address' => 'nullable|string|max:255',
            'country_id' => 'nullable|exists:countries,id',
            'department_id' => 'nullable|exists:departments,id',
            'city_id' => 'nullable|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'neighborhood' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'health_insurance_id' => 'nullable|exists:health_insurance_providers,id',
            'affiliation_type_id' => 'nullable|exists:affiliation_types,id',
            'coverage_type_id' => 'nullable|exists:coverage_types,id',
            'occupation' => 'nullable|string|max:255',
            'education_level_id' => 'nullable|exists:education_levels,id',
            'position' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'notes' => 'nullable|text',
            'status' => ['sometimes', 'required', 'in:active,inactive'],
            // 'profile_image' => 'nullable|image|max:2048', // Add validation for profile image if needed
        ];
    }
} 