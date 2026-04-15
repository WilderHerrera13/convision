<?php

namespace App\Http\Requests\Api\V1\CashRegisterClose;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashRegisterCloseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'close_date' => 'required|date|date_format:Y-m-d',
            'payment_methods' => 'required|array',
            'payment_methods.*.name' => 'required|string|in:efectivo,voucher,bancolombia,daviplata,nequi,addi,sistecredito,anticipo,bono,pago_sistecredito',
            'payment_methods.*.counted_amount' => 'required|numeric|min:0',
            'denominations' => 'nullable|array',
            'denominations.*.denomination' => 'required_with:denominations|integer|in:100000,50000,20000,10000,5000,2000,1000,500,200,100,50',
            'denominations.*.quantity' => 'required_with:denominations|integer|min:0',
        ];
    }
}
