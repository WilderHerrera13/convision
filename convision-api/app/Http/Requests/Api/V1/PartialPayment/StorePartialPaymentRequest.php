<?php

namespace App\Http\Requests\Api\V1\PartialPayment;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Sale; // Import the Sale model

class StorePartialPaymentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:0.01',
            'reference_number' => 'nullable|string',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $saleId = $this->route('saleId');
            $sale = Sale::find($saleId);

            if ($sale && $this->input('amount') > $sale->balance) {
                $validator->errors()->add('amount', 'Payment amount cannot exceed the remaining balance of ' . $sale->balance);
            }
        });
    }
} 