<?php

namespace App\Http\Requests\Api\V1\Purchase;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseRequest extends FormRequest
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
     * @return array
     */
    public function rules(): array
    {
        return [
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'purchase_date' => 'sometimes|date',
            'invoice_number' => 'sometimes|string|max:255',
            'concept' => 'sometimes|string|max:255',
            'subtotal' => 'sometimes|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'retention_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'sometimes|numeric|min:0',
            'payment_amount' => 'nullable|numeric|min:0',
            'balance' => 'nullable|numeric|min:0',
            'tax_excluded' => 'boolean',
            'invoice_file' => 'nullable|string',
            'notes' => 'nullable|string',
            'payment_due_date' => 'nullable|date',
            'items' => 'sometimes|array|min:1',
            'items.*.id' => 'nullable|exists:purchase_items,id',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_code' => 'nullable|string|max:255',
            'items.*.product_description' => 'required_with:items|string',
            'items.*.quantity' => 'required_with:items|numeric|min:0.01',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.subtotal' => 'required_with:items|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.total' => 'required_with:items|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.exists' => 'El proveedor seleccionado no existe.',
            'purchase_date.date' => 'La fecha de compra debe ser una fecha válida.',
            'invoice_number.string' => 'El número de factura debe ser texto.',
            'concept.string' => 'El concepto debe ser texto.',
            'subtotal.numeric' => 'El subtotal debe ser un número.',
            'total_amount.numeric' => 'El total debe ser un número.',
            'items.min' => 'Debe incluir al menos un producto.',
            'items.*.product_description.required_with' => 'La descripción del producto es obligatoria.',
            'items.*.quantity.required_with' => 'La cantidad es obligatoria.',
            'items.*.unit_price.required_with' => 'El precio unitario es obligatorio.',
            'items.*.subtotal.required_with' => 'El subtotal del producto es obligatorio.',
            'items.*.total.required_with' => 'El total del producto es obligatorio.',
        ];
    }
}
