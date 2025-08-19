<?php

namespace App\Http\Requests\Api\V1\InventoryTransfer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInventoryTransferRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'notes' => 'nullable|string',
            'status' => 'sometimes|required|in:pending,completed,cancelled',
        ];
    }
} 