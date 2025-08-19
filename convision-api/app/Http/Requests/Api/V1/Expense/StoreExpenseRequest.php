<?php

namespace App\Http\Requests\Api\V1\Expense;

use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
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
            'invoice_number' => 'required|string|max:255',
            'concept' => 'required|string|max:255',
            'description' => 'nullable|string',
            'expense_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_amount' => 'nullable|numeric|min:0',
            'tax_excluded' => 'boolean',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required' => 'El proveedor es obligatorio.',
            'supplier_id.exists' => 'El proveedor seleccionado no existe.',
            'invoice_number.required' => 'El número de factura es obligatorio.',
            'concept.required' => 'El concepto es obligatorio.',
            'expense_date.required' => 'La fecha del gasto es obligatoria.',
            'amount.required' => 'El monto es obligatorio.',
            'amount.min' => 'El monto debe ser mayor a 0.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
        ];
    }
}
