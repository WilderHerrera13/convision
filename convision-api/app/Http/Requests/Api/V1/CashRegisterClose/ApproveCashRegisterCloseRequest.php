<?php

namespace App\Http\Requests\Api\V1\CashRegisterClose;

use App\Models\CashRegisterClose;
use Illuminate\Foundation\Http\FormRequest;

class ApproveCashRegisterCloseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'admin_notes' => 'nullable|string|max:1000',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->route()?->getActionMethod() !== 'approve') {
                return;
            }
            $id = (int) $this->route('id');
            if ($id <= 0) {
                return;
            }
            $close = CashRegisterClose::query()->find($id);
            if (!$close) {
                return;
            }
            if ($close->admin_actuals_recorded_at === null) {
                $validator->errors()->add(
                    'approve',
                    'Debe registrar los valores reales (conciliación administrativa) antes de aprobar el cierre.'
                );
            }
        });
    }
}
