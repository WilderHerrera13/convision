<?php

namespace App\Http\Requests\Api\V1\DailyActivityReport;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDailyActivityReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role !== User::ROLE_ADMIN;
    }

    public function rules(): array
    {
        return [
            'report_date' => 'sometimes|date|date_format:Y-m-d',
            'shift'       => 'sometimes|in:morning,afternoon,full',

            // Métricas de atención
            'preguntas_hombre'             => 'sometimes|nullable|integer|min:0',
            'preguntas_mujeres'            => 'sometimes|nullable|integer|min:0',
            'preguntas_ninos'              => 'sometimes|nullable|integer|min:0',
            'cotizaciones_hombre'          => 'sometimes|nullable|integer|min:0',
            'cotizaciones_mujeres'         => 'sometimes|nullable|integer|min:0',
            'cotizaciones_ninos'           => 'sometimes|nullable|integer|min:0',
            'consultas_efectivas_hombre'   => 'sometimes|nullable|integer|min:0',
            'consultas_efectivas_mujeres'  => 'sometimes|nullable|integer|min:0',
            'consultas_efectivas_ninos'    => 'sometimes|nullable|integer|min:0',
            'consulta_venta_formula'       => 'sometimes|nullable|integer|min:0',
            'consultas_no_efectivas'       => 'sometimes|nullable|integer|min:0',

            // Operaciones
            'bonos_entregados'         => 'sometimes|nullable|integer|min:0',
            'bonos_redimidos'          => 'sometimes|nullable|integer|min:0',
            'sistecreditos_realizados' => 'sometimes|nullable|integer|min:0',
            'addi_realizados'          => 'sometimes|nullable|integer|min:0',
            'control_seguimiento'      => 'sometimes|nullable|integer|min:0',
            'seguimiento_garantias'    => 'sometimes|nullable|integer|min:0',
            'ordenes'                  => 'sometimes|nullable|integer|min:0',
            'plan_separe'              => 'sometimes|nullable|integer|min:0',
            'otras_ventas'             => 'sometimes|nullable|integer|min:0',
            'entregas'                 => 'sometimes|nullable|integer|min:0',
            'sistecreditos_abonos'     => 'sometimes|nullable|integer|min:0',
            'valor_ordenes'            => 'sometimes|nullable|numeric|min:0',

            // Redes sociales
            'publicaciones_facebook'        => 'sometimes|nullable|integer|min:0',
            'publicaciones_instagram'       => 'sometimes|nullable|integer|min:0',
            'publicaciones_whatsapp'        => 'sometimes|nullable|integer|min:0',
            'publicaciones_compartidas_fb'  => 'sometimes|nullable|integer|min:0',
            'tiktok_realizados'             => 'sometimes|nullable|integer|min:0',
            'bonos_regalo_enviados'         => 'sometimes|nullable|integer|min:0',
            'bonos_fidelizacion_enviados'   => 'sometimes|nullable|integer|min:0',
            'mensajes_facebook'             => 'sometimes|nullable|integer|min:0',
            'mensajes_instagram'            => 'sometimes|nullable|integer|min:0',
            'mensajes_whatsapp'             => 'sometimes|nullable|integer|min:0',
            'entregas_realizadas'           => 'sometimes|nullable|integer|min:0',
            'etiquetas_clientes'            => 'sometimes|nullable|integer|min:0',
            'cotizaciones_trabajo'          => 'sometimes|nullable|integer|min:0',
            'ordenes_trabajo'               => 'sometimes|nullable|integer|min:0',

            'observations' => 'sometimes|nullable|string|max:2000',
        ];
    }
}
