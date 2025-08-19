<?php

namespace App\Http\Requests\Api\V1\WarehouseLocation;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWarehouseLocationRequest extends FormRequest
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
            'warehouse_id' => 'sometimes|required|exists:warehouses,id',
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:warehouse_locations,code,' . $this->route('location')->id,
            'type' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,inactive',
            'description' => 'nullable|string',
        ];
    }
} 