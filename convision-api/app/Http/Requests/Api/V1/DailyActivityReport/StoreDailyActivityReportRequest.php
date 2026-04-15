<?php

namespace App\Http\Requests\Api\V1\DailyActivityReport;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreDailyActivityReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role !== User::ROLE_ADMIN;
    }

    public function rules(): array
    {
        return [
            'report_date' => 'required|date|date_format:Y-m-d',
            'shift'       => 'required|in:morning,afternoon,full',

            // Métricas de atención
            'preguntas_hombre'             => 'nullable|integer|min:0',
            'preguntas_mujeres'            => 'nullable|integer|min:0',
            'preguntas_ninos'              => 'nullable|integer|min:0',
            'cotizaciones_hombre'          => 'nullable|integer|min:0',
            'cotizaciones_mujeres'         => 'nullable|integer|min:0',
            'cotizaciones_ninos'           => 'nullable|integer|min:0',
            'consultas_efectivas_hombre'   => 'nullable|integer|min:0',
            'consultas_efectivas_mujeres'  => 'nullable|integer|min:0',
            'consultas_efectivas_ninos'    => 'nullable|integer|min:0',
            'consulta_venta_formula'       => 'nullable|integer|min:0',
            'consultas_no_efectivas'       => 'nullable|integer|min:0',

            // Operaciones
            'bonos_entregados'         => 'nullable|integer|min:0',
            'bonos_redimidos'          => 'nullable|integer|min:0',
            'sistecreditos_realizados' => 'nullable|integer|min:0',
            'addi_realizados'          => 'nullable|integer|min:0',
            'control_seguimiento'      => 'nullable|integer|min:0',
            'seguimiento_garantias'    => 'nullable|integer|min:0',
            'ordenes'                  => 'nullable|integer|min:0',
            'plan_separe'              => 'nullable|integer|min:0',
            'otras_ventas'             => 'nullable|integer|min:0',
            'entregas'                 => 'nullable|integer|min:0',
            'sistecreditos_abonos'     => 'nullable|integer|min:0',
            'valor_ordenes'            => 'nullable|numeric|min:0',

            // Redes sociales
            'publicaciones_facebook'        => 'nullable|integer|min:0',
            'publicaciones_instagram'       => 'nullable|integer|min:0',
            'publicaciones_whatsapp'        => 'nullable|integer|min:0',
            'publicaciones_compartidas_fb'  => 'nullable|integer|min:0',
            'tiktok_realizados'             => 'nullable|integer|min:0',
            'bonos_regalo_enviados'         => 'nullable|integer|min:0',
            'bonos_fidelizacion_enviados'   => 'nullable|integer|min:0',
            'mensajes_facebook'             => 'nullable|integer|min:0',
            'mensajes_instagram'            => 'nullable|integer|min:0',
            'mensajes_whatsapp'             => 'nullable|integer|min:0',
            'entregas_realizadas'           => 'nullable|integer|min:0',
            'etiquetas_clientes'            => 'nullable|integer|min:0',
            'cotizaciones_trabajo'          => 'nullable|integer|min:0',
            'ordenes_trabajo'               => 'nullable|integer|min:0',

            'observations' => 'nullable|string|max:2000',
        ];
    }
}
