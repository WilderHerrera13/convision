<?php

namespace App\Http\Requests\Api\V1\LensImport;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class LensImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Assuming the admin.or.specialist.role middleware handles this,
        // but we can also add a specific check here if needed.
        // For now, let's ensure the user is authenticated.
        // The controller's middleware `admin.or.specialist.role` will further refine this.
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls|max:10240', // max 10MB
        ];
    }
} 