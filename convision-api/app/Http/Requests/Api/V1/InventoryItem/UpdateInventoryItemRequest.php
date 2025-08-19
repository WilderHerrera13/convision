<?php

namespace App\Http\Requests\Api\V1\InventoryItem;

use App\Models\InventoryItem;
use App\Models\WarehouseLocation;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInventoryItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Assuming any authenticated user can update inventory items for now.
        // Adjust as per specific authorization logic if needed.
        // E.g., check if the user owns the warehouse or has specific permissions.
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_id' => 'sometimes|required|exists:products,id',
            'warehouse_id' => 'sometimes|required|exists:warehouses,id',
            'warehouse_location_id' => 'sometimes|required|exists:warehouse_locations,id',
            'quantity' => 'sometimes|required|integer|min:0',
            'status' => 'nullable|string|in:available,reserved,damaged,sold,returned,lost',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.required' => 'El producto es obligatorio.',
            'product_id.exists' => 'El producto seleccionado no existe.',
            'warehouse_id.required' => 'El almacén es obligatorio.',
            'warehouse_id.exists' => 'El almacén seleccionado no existe.',
            'warehouse_location_id.required' => 'La ubicación es obligatoria.',
            'warehouse_location_id.exists' => 'La ubicación seleccionada no existe.',
            'quantity.required' => 'La cantidad es obligatoria.',
            'quantity.integer' => 'La cantidad debe ser un número entero.',
            'quantity.min' => 'La cantidad debe ser como mínimo :min.',
            'status.in' => 'El estado seleccionado no es válido.',
            'notes.string' => 'Las notas deben ser texto.',
            'notes.max' => 'Las notas no deben exceder los :max caracteres.'
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isEmpty()) {
                $item = $this->route('inventoryItem');

                $targetWarehouseId = $this->input('warehouse_id', $item->warehouse_id);
                if ($this->filled('warehouse_location_id')) {
                    $location = WarehouseLocation::find($this->warehouse_location_id);
                    if ($location && $location->warehouse_id != $targetWarehouseId) {
                        $validator->errors()->add('warehouse_location_id', 'La ubicación especificada no pertenece al almacén indicado.');
                    }
                }

                $productIdToUpdate = $this->input('product_id', $item->product_id);
                $locationIdToUpdate = $this->input('warehouse_location_id', $item->warehouse_location_id);

                if ($this->filled('product_id') || $this->filled('warehouse_location_id')) {
                    if ($productIdToUpdate != $item->product_id || $locationIdToUpdate != $item->warehouse_location_id) {
                        $existingItem = InventoryItem::where('product_id', $productIdToUpdate)
                            ->where('warehouse_location_id', $locationIdToUpdate)
                            ->where('id', '!=', $item->id)
                            ->first();

                        if ($existingItem) {
                            $validator->errors()->add('product_id', 'Ya existe otro ítem de inventario para este producto en esta ubicación.');
                        }
                    }
                }
            }
        });
    }
} 