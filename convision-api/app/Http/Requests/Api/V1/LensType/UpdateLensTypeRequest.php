<?php

namespace App\Http\Requests\Api\V1\LensType;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLensTypeRequest extends FormRequest
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
        $lensTypeId = $this->route('lens_type') ? $this->route('lens_type')->id : null;
        return [
            'name' => 'required|string|max:255|unique:lens_types,name,' . $lensTypeId,
            'description' => 'nullable|string|max:1000',
        ];
    }
} 