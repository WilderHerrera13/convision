<?php

namespace App\Models;

use App\Traits\ApiFilterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyActivityReport extends Model
{
    use HasFactory, ApiFilterable;

    const SHIFT_MORNING = 'morning';
    const SHIFT_AFTERNOON = 'afternoon';
    const SHIFT_FULL = 'full';

    protected $fillable = [
        'user_id', 'report_date', 'shift',
        'preguntas_hombre', 'preguntas_mujeres', 'preguntas_ninos',
        'cotizaciones_hombre', 'cotizaciones_mujeres', 'cotizaciones_ninos',
        'consultas_efectivas_hombre', 'consultas_efectivas_mujeres', 'consultas_efectivas_ninos',
        'consulta_venta_formula', 'consultas_no_efectivas',
        'bonos_entregados', 'bonos_redimidos',
        'sistecreditos_realizados', 'addi_realizados',
        'control_seguimiento',
        'seguimiento_garantias', 'ordenes', 'plan_separe',
        'otras_ventas', 'entregas', 'sistecreditos_abonos', 'valor_ordenes',
        'publicaciones_facebook', 'publicaciones_instagram', 'publicaciones_whatsapp',
        'publicaciones_compartidas_fb', 'tiktok_realizados',
        'bonos_regalo_enviados', 'bonos_fidelizacion_enviados',
        'mensajes_facebook', 'mensajes_instagram', 'mensajes_whatsapp',
        'entregas_realizadas', 'etiquetas_clientes', 'cotizaciones_trabajo', 'ordenes_trabajo',
        'observations', 'recepciones_dinero',
    ];

    protected $casts = [
        'report_date' => 'date',
        'valor_ordenes' => 'decimal:2',
        'recepciones_dinero' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getTotalPreguntas(): int
    {
        return $this->preguntas_hombre + $this->preguntas_mujeres + $this->preguntas_ninos;
    }

    public function getTotalConsultasEfectivas(): int
    {
        return $this->consultas_efectivas_hombre + $this->consultas_efectivas_mujeres + $this->consultas_efectivas_ninos;
    }
}
