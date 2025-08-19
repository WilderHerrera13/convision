<?php

namespace App\Http\Requests\Api\V1\DiscountRequest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\DiscountRequest;
use Illuminate\Support\Facades\Log;

class ProcessDiscountRequestRequest extends FormRequest
{
    public function authorize()
    {
        $user = $this->user();
        $discountRequest = $this->route('discount_request');

        Log::info('ProcessDiscountRequest: Authorize check', [
            'user_id' => $user->id,
            'request_id' => $discountRequest ? $discountRequest->id : null,
            'request_user_id' => $discountRequest ? $discountRequest->user_id : null,
            'request_is_pending' => $discountRequest ? $discountRequest->isPending() : null,
            'user_role' => $user->role,
        ]);

        if ($user->role !== 'admin') {
            if (!$discountRequest || $discountRequest->user_id !== $user->id) {
                Log::warning('ProcessDiscountRequest: Denied - Non-admin processing other user request or request not found');
                return false;
            }
        }

        if (!$discountRequest || !$discountRequest->isPending()) {
            Log::warning('ProcessDiscountRequest: Denied - Request not found or not pending', [
                'exists' => !!$discountRequest,
                'is_pending' => $discountRequest ? $discountRequest->isPending() : null
            ]);
            return false;
        }
        Log::info('ProcessDiscountRequest: Authorized');
        return true;
    }

    public function rules()
    {
        // No specific input fields are validated here as actions are based on route and authenticated user.
        // However, you might add a 'rejection_reason' if you want to make it mandatory for rejections.
        return [
            'approval_notes' => 'nullable|string|max:500', // For admin notes on approval/rejection
        ];
    }

    public function messages()
    {
        return [
            'approval_notes.max' => 'Las notas de aprobación no deben exceder los 500 caracteres.',
        ];
    }
} 