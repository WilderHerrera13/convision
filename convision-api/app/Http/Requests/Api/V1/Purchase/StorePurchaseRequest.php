<?php

namespace App\Http\Requests\Api\V1\Purchase;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
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
            'supplier_id' => 'required|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'invoice_number' => 'required|string|max:255',
            'concept' => 'required|string|max:255',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'retention_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            // payment_amount y balance se calculan automáticamente
            'tax_excluded' => 'boolean',
            'invoice_file' => 'nullable|string',
            'notes' => 'nullable|string',
            'payment_due_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_code' => 'nullable|string|max:255',
            'items.*.product_description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.subtotal' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.total' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
            'payments' => 'nullable|array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.payment_date' => 'required|date',
            'payments.*.reference' => 'nullable|string|max:255',
            'payments.*.notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required' => 'El proveedor es obligatorio.',
            'supplier_id.exists' => 'El proveedor seleccionado no existe.',
            'purchase_date.required' => 'La fecha de compra es obligatoria.',
            'invoice_number.required' => 'El número de factura es obligatorio.',
            'concept.required' => 'El concepto es obligatorio.',
            'subtotal.required' => 'El subtotal es obligatorio.',
            'total_amount.required' => 'El total es obligatorio.',
            'items.required' => 'Debe incluir al menos un producto.',
            'items.min' => 'Debe incluir al menos un producto.',
            'items.*.product_description.required' => 'La descripción del producto es obligatoria.',
            'items.*.quantity.required' => 'La cantidad es obligatoria.',
            'items.*.unit_price.required' => 'El precio unitario es obligatorio.',
            'items.*.subtotal.required' => 'El subtotal del producto es obligatorio.',
            'items.*.total.required' => 'El total del producto es obligatorio.',
        ];
    }
}
