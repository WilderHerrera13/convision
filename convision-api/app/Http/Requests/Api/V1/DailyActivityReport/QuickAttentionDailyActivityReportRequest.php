<?php

namespace App\Http\Requests\Api\V1\DailyActivityReport;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class QuickAttentionDailyActivityReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role !== User::ROLE_ADMIN;
    }

    public function rules(): array
    {
        return [
            'report_date' => 'required|date_format:Y-m-d',
            'shift'       => 'required|in:morning,afternoon,full',
            'item'        => 'required|string|in:preguntas,cotizaciones,consultas_efectivas,consulta_venta_formula,consultas_no_efectivas,bonos_entregados,bonos_redimidos,sistecreditos_realizados,addi_realizados',
            'profile'     => 'nullable|in:hombre,mujer,nino',
            'note'        => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'report_date.required' => 'La fecha del reporte es obligatoria.',
            'report_date.date_format' => 'La fecha debe tener el formato AAAA-MM-DD.',
            'shift.required' => 'La jornada es obligatoria.',
            'shift.in' => 'La jornada debe ser mañana, tarde o jornada completa.',
            'item.required' => 'El tipo de atención es obligatorio.',
            'item.in' => 'El tipo de atención no es válido.',
            'profile.in' => 'El perfil seleccionado no es válido.',
            'note.max' => 'La observación no puede superar :max caracteres.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $item = $this->input('item');
            $profile = $this->input('profile');
            $needsProfile = in_array($item, ['preguntas', 'cotizaciones', 'consultas_efectivas'], true);
            if ($needsProfile && ! in_array($profile, ['hombre', 'mujer', 'nino'], true)) {
                $validator->errors()->add('profile', 'El perfil es obligatorio para este ítem.');
            }
        });
    }
}
