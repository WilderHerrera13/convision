<?php

namespace App\Http\Requests\Api\V1\InventoryTransfer;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryTransferRequest extends FormRequest
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
            'lens_id' => 'required|exists:lenses,id',
            'source_location_id' => 'required|exists:warehouse_locations,id',
            'destination_location_id' => 'required|exists:warehouse_locations,id|different:source_location_id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:pending,completed,cancelled',
        ];
    }
} 