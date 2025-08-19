<?php

namespace App\Http\Requests\Api\V1\SaleLensPriceAdjustment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleLensPriceAdjustmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return $this->user()->hasRole(['admin', 'receptionist']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'lens_id' => [
                'required',
                'exists:products,id',
                Rule::unique('sale_lens_price_adjustments')->where(function ($query) {
                    return $query->where('sale_id', $this->route('sale'));
                })
            ],
            'adjusted_price' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) {
                    $lens = \App\Models\Product::find($this->lens_id);
                    if ($lens && $value <= $lens->price) {
                        $fail('El precio ajustado debe ser mayor al precio base del lente.');
                    }
                }
            ],
            'reason' => 'nullable|string|max:500'
        ];
    }

    public function messages()
    {
        return [
            'lens_id.required' => 'El lente es requerido.',
            'lens_id.exists' => 'El lente seleccionado no existe.',
            'lens_id.unique' => 'Ya existe un ajuste de precio para este lente en esta venta.',
            'adjusted_price.required' => 'El precio ajustado es requerido.',
            'adjusted_price.numeric' => 'El precio ajustado debe ser un número.',
            'adjusted_price.min' => 'El precio ajustado debe ser mayor a 0.',
            'reason.max' => 'La razón no puede exceder 500 caracteres.'
        ];
    }
}
