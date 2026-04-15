<?php

namespace App\Http\Requests\Api\V1\CashRegisterClose;

use App\Models\CashRegisterClose;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PutCashRegisterCloseAdminActualsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'admin';
    }

    public function rules(): array
    {
        $methods = implode(',', CashRegisterClose::PAYMENT_METHODS);

        return [
            'actual_payment_methods' => ['required', 'array', 'size:'.count(CashRegisterClose::PAYMENT_METHODS)],
            'actual_payment_methods.*.name' => ['required', 'string', 'in:'.$methods],
            'actual_payment_methods.*.actual_amount' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $rows = $this->input('actual_payment_methods', []);
            $names = collect($rows)->pluck('name')->filter()->unique()->sort()->values()->all();
            $expected = CashRegisterClose::PAYMENT_METHODS;
            sort($expected);
            $sortedNames = $names;
            sort($sortedNames);
            if ($sortedNames !== $expected) {
                $validator->errors()->add(
                    'actual_payment_methods',
                    'Debe enviar exactamente un monto por cada medio de pago permitido, sin duplicados.'
                );
            }
        });
    }
}
