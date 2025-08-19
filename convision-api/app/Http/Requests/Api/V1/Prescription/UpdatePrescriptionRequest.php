<?php

namespace App\Http\Requests\Api\V1\Prescription;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdatePrescriptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Add specific authorization for updating if needed, 
        // for now, same as store: only specialists
        return Auth::user()->role === 'specialist';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date' => 'sometimes|required|date',
            'document' => 'sometimes|required|string',
            'patient_name' => 'sometimes|required|string',
            // Add validation for all other updatable fields as needed, e.g.:
            // 'field_name' => 'sometimes|nullable|string',
        ];
    }
} 