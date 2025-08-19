<?php

namespace App\Http\Requests\Api\V1\LensType;

use Illuminate\Foundation\Http\FormRequest;

class StoreLensTypeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:lens_types,name',
            'description' => 'nullable|string|max:1000',
        ];
    }
} 