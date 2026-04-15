<?php

namespace App\Services;

use App\Models\DailyActivityReport;
use App\Models\User;
use InvalidArgumentException;

class DailyActivityReportService
{
    public function create(array $validated, int $userId): DailyActivityReport
    {
        $validated['user_id'] = $userId;

        return DailyActivityReport::create($validated);
    }

    /**
     * Incrementa en 1 el contador correspondiente al ítem y perfil (registro rápido de atención).
     *
     * @param  array{item: string, report_date: string, shift: string, profile?: string|null, note?: string|null}  $data
     */
    public function quickAttentionIncrement(array $data, int $userId): DailyActivityReport
    {
        $report = DailyActivityReport::firstOrCreate(
            [
                'user_id'     => $userId,
                'report_date' => $data['report_date'],
                'shift'       => $data['shift'],
            ],
            [
                'user_id'     => $userId,
                'report_date' => $data['report_date'],
                'shift'       => $data['shift'],
            ]
        );

        $column = $this->resolveQuickAttentionColumn($data['item'], $data['profile'] ?? null);
        $report->increment($column);

        if (! empty($data['note'])) {
            $note = trim(strip_tags($data['note']));
            if ($note !== '') {
                $prefix = $report->observations ? $report->observations."\n" : '';
                $report->observations = $prefix.'[Registro rápido] '.$note;
                $report->save();
            }
        }

        return $report->fresh();
    }

    private function resolveQuickAttentionColumn(string $item, ?string $profile): string
    {
        $needsProfile = in_array($item, ['preguntas', 'cotizaciones', 'consultas_efectivas'], true);
        $suffix = match ($profile ?? 'hombre') {
            'hombre' => 'hombre',
            'mujer'  => 'mujeres',
            'nino'   => 'ninos',
            default  => 'hombre',
        };

        if ($needsProfile && ! in_array($profile, ['hombre', 'mujer', 'nino'], true)) {
            throw new InvalidArgumentException('Perfil inválido para el ítem.');
        }

        return match ($item) {
            'preguntas' => 'preguntas_'.$suffix,
            'cotizaciones' => 'cotizaciones_'.$suffix,
            'consultas_efectivas' => 'consultas_efectivas_'.$suffix,
            'consulta_venta_formula' => 'consulta_venta_formula',
            'consultas_no_efectivas' => 'consultas_no_efectivas',
            'bonos_entregados' => 'bonos_entregados',
            'bonos_redimidos' => 'bonos_redimidos',
            'sistecreditos_realizados' => 'sistecreditos_realizados',
            'addi_realizados' => 'addi_realizados',
            default => throw new InvalidArgumentException('Ítem no soportado.'),
        };
    }

    public function update(DailyActivityReport $report, array $validated): DailyActivityReport
    {
        $report->update($validated);

        return $report->fresh();
    }

    public function canEdit(DailyActivityReport $report, User $user): bool
    {
        if ($user->role === User::ROLE_ADMIN) {
            return false;
        }

        return $report->user_id === $user->id
            && $report->report_date->isToday();
    }
}
