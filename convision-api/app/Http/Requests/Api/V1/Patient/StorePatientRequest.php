<?php

namespace App\Http\Requests\Api\V1\Patient;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:patients',
            'phone' => 'required|string|max:20',
            'identification' => 'required|string|max:255|unique:patients',
            'identification_type_id' => 'required|exists:identification_types,id',
            'birth_date' => 'required|date',
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'address' => 'nullable|string|max:255',
            'city_id' => 'nullable|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'department_id' => 'nullable|exists:departments,id',
            'country_id' => 'nullable|exists:countries,id',
            'neighborhood' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:10',
            'health_insurance_provider_id' => 'nullable|exists:health_insurance_providers,id',
            'affiliation_type_id' => 'nullable|exists:affiliation_types,id',
            'coverage_type_id' => 'nullable|exists:coverage_types,id',
            'occupation' => 'nullable|string|max:255',
            'education_level_id' => 'nullable|exists:education_levels,id',
            'position' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ];
    }
} 