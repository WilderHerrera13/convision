<?php

namespace App\Http\Requests\Api\V1\Expense;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
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
            'invoice_number' => 'sometimes|string|max:255',
            'concept' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'expense_date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0.01',
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
            'supplier_id.exists' => 'El proveedor seleccionado no existe.',
            'invoice_number.string' => 'El número de factura debe ser texto.',
            'concept.string' => 'El concepto debe ser texto.',
            'expense_date.date' => 'La fecha del gasto debe ser una fecha válida.',
            'amount.numeric' => 'El monto debe ser un número.',
            'amount.min' => 'El monto debe ser mayor a 0.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
        ];
    }
}
