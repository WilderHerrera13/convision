<?php

namespace App\Http\Requests\Api\V1\AdminNotification;

use Illuminate\Foundation\Http\FormRequest;

class IndexAdminNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'scope' => 'nullable|string|in:all,unread,archived',
            'kind' => 'nullable|string|in:system,operational,message',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'sort' => 'nullable|string',
            's_f' => 'nullable',
            's_v' => 'nullable',
            's_o' => 'nullable|string|in:and,or',
        ];
    }
}
