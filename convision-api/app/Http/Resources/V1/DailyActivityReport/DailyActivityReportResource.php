<?php

namespace App\Http\Resources\V1\DailyActivityReport;

use Illuminate\Http\Resources\Json\JsonResource;

class DailyActivityReportResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'report_date' => $this->report_date->format('Y-m-d'),
            'shift'       => $this->shift,
            'user'        => $this->whenLoaded('user', fn () => [
                'id'   => $this->user->id,
                'name' => $this->user->name,
            ]),
            'atencion' => [
                'preguntas' => [
                    'hombre'  => $this->preguntas_hombre,
                    'mujeres' => $this->preguntas_mujeres,
                    'ninos'   => $this->preguntas_ninos,
                ],
                'cotizaciones' => [
                    'hombre'  => $this->cotizaciones_hombre,
                    'mujeres' => $this->cotizaciones_mujeres,
                    'ninos'   => $this->cotizaciones_ninos,
                ],
                'consultas_efectivas' => [
                    'hombre'  => $this->consultas_efectivas_hombre,
                    'mujeres' => $this->consultas_efectivas_mujeres,
                    'ninos'   => $this->consultas_efectivas_ninos,
                ],
                'consulta_venta_formula'  => $this->consulta_venta_formula,
                'consultas_no_efectivas'  => $this->consultas_no_efectivas,
            ],
            'operaciones' => [
                'bonos_entregados'         => $this->bonos_entregados,
                'bonos_redimidos'          => $this->bonos_redimidos,
                'sistecreditos_realizados' => $this->sistecreditos_realizados,
                'addi_realizados'          => $this->addi_realizados,
                'seguimiento_garantias'    => $this->seguimiento_garantias,
                'ordenes'                  => $this->ordenes,
                'plan_separe'              => $this->plan_separe,
                'otras_ventas'             => $this->otras_ventas,
                'entregas'                 => $this->entregas,
                'sistecreditos_abonos'     => $this->sistecreditos_abonos,
                'valor_ordenes'            => $this->valor_ordenes,
            ],
            'redes_sociales' => [
                'publicaciones_facebook'       => $this->publicaciones_facebook,
                'publicaciones_instagram'      => $this->publicaciones_instagram,
                'publicaciones_whatsapp'       => $this->publicaciones_whatsapp,
                'publicaciones_compartidas_fb' => $this->publicaciones_compartidas_fb,
                'tiktok_realizados'            => $this->tiktok_realizados,
                'bonos_regalo_enviados'        => $this->bonos_regalo_enviados,
                'bonos_fidelizacion_enviados'  => $this->bonos_fidelizacion_enviados,
                'mensajes_facebook'            => $this->mensajes_facebook,
                'mensajes_instagram'           => $this->mensajes_instagram,
                'mensajes_whatsapp'            => $this->mensajes_whatsapp,
                'entregas_realizadas'          => $this->entregas_realizadas,
                'etiquetas_clientes'           => $this->etiquetas_clientes,
                'cotizaciones_trabajo'         => $this->cotizaciones_trabajo,
                'ordenes_trabajo'              => $this->ordenes_trabajo,
            ],
            'observations' => $this->observations,
            'totales' => [
                'total_preguntas'           => $this->getTotalPreguntas(),
                'total_consultas_efectivas' => $this->getTotalConsultasEfectivas(),
            ],
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
