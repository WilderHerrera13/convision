<?php

namespace App\Http\Requests\Api\V1\CashRegisterClose;

use Illuminate\Foundation\Http\FormRequest;

class ApproveCashRegisterCloseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'admin_notes' => 'nullable|string|max:1000',
        ];
    }
}
