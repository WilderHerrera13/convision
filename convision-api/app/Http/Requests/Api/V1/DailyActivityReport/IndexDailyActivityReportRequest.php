<?php

namespace App\Http\Requests\Api\V1\DailyActivityReport;

use Illuminate\Foundation\Http\FormRequest;

class IndexDailyActivityReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to'   => ['sometimes', 'nullable', 'date'],
            'user_id'   => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'shift'     => ['sometimes', 'nullable', 'in:morning,afternoon,full'],
            'per_page'  => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
