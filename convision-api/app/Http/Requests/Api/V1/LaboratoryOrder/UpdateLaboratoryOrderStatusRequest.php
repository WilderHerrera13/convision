<?php

namespace App\Http\Requests\Api\V1\LaboratoryOrder;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLaboratoryOrderStatusRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'status' => ['required', Rule::in(['pending', 'in_process', 'sent_to_lab', 'ready_for_delivery', 'delivered', 'cancelled'])],
            'notes' => 'nullable|string',
        ];
    }
} 