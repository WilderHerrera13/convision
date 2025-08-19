<?php

namespace App\Http\Requests\Api\V1\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        // Safely retrieve the user ID from route parameters
        // Check for 'user' (if route model binding is used with that name) or 'id'
        $userId = $this->route('user') ? ($this->route('user')->id ?? $this->route('user')) : $this->route('id');

        return [
            'name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($userId)],
            'identification' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users')->ignore($userId)],
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
            'role' => ['sometimes', 'required', 'string', Rule::in(['admin', 'specialist', 'receptionist'])],
        ];
    }

    protected function prepareForValidation()
    {
        if ($this->has('role') && strtolower(trim($this->input('role'))) === 'receptionist') {
            $this->merge([
                'role' => 'receptionist',
            ]);
        }
    }
} 