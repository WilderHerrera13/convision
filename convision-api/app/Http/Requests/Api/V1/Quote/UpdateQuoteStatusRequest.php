<?php

namespace App\Http\Requests\Api\V1\Quote;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQuoteStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'expired'])],
        ];
    }
} 