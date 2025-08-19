<?php

namespace App\Http\Requests\Api\V1\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'identification' => 'required|string|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'role' => ['required', 'string', Rule::in(['admin', 'specialist', 'receptionist'])],
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