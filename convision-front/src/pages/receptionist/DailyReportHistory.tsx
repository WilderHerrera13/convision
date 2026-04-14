import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import dailyActivityReportService, {
  DailyActivityReport,
  SHIFT_OPTIONS,
} from '@/services/dailyActivityReportService';

const SHIFT_LABELS: Record<string, string> = Object.fromEntries(
  SHIFT_OPTIONS.map(({ value, label }) => [value, label])
);

const DailyReportHistory: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const columns: DataTableColumnDef<DailyActivityReport>[] = [
    {
      accessorKey: 'report_date',
      header: 'Fecha',
      cell: ({ row }) => format(new Date(row.original.report_date), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'shift',
      header: 'Jornada',
      cell: ({ row }) => (
        <Badge variant="outline">
          {SHIFT_LABELS[row.original.shift] ?? row.original.shift}
        </Badge>
      ),
    },
    {
      id: 'total_questions',
      header: 'Total Preguntas',
      cell: ({ row }) => {
        const ca = row.original.customer_attention;
        if (!ca) return '—';
        return (ca.questions_men ?? 0) + (ca.questions_women ?? 0) + (ca.questions_children ?? 0);
      },
    },
    {
      id: 'effective_consultations',
      header: 'Consultas Efectivas',
      cell: ({ row }) => {
        const ca = row.original.customer_attention;
        if (!ca) return '—';
        return (
          (ca.effective_consultations_men ?? 0) +
          (ca.effective_consultations_women ?? 0) +
          (ca.effective_consultations_children ?? 0)
        );
      },
    },
    {
      id: 'valor_ordenes',
      header: 'Valor de Órdenes',
      cell: ({ row }) => {
        const ops = row.original.operations;
        if (!ops) return '—';
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(ops.valor_ordenes ?? 0);
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: () => (
        <Button
          size="sm"
          variant="outline"
          className="bg-[#eff4ff] border-[#c5d3f8] text-[#3a71f7] hover:bg-blue-100"
          onClick={() => alert('Vista detalle próximamente')}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const fetcher = async ({ page, per_page }: { page: number; per_page: number }) => {
    const params: Record<string, unknown> = { page, per_page };
    if (dateFrom) params.date_from = format(dateFrom, 'yyyy-MM-dd');
    if (dateTo) params.date_to = format(dateTo, 'yyyy-MM-dd');
    const resp = await dailyActivityReportService.list(params);
    return {
      data: resp?.data ?? (Array.isArray(resp) ? resp : []),
      last_page: resp?.meta?.last_page ?? resp?.last_page ?? 1,
    };
  };

  const extraFilters = {
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de Reportes Diarios</h1>
        <p className="text-muted-foreground text-sm">Consulta los reportes de gestión registrados</p>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-48">
          <p className="text-sm font-medium mb-1">Desde</p>
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Fecha inicio" />
        </div>
        <div className="w-48">
          <p className="text-sm font-medium mb-1">Hasta</p>
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fecha fin" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <EntityTable<DailyActivityReport>
        columns={columns}
        fetcher={fetcher}
        queryKeyBase="daily-report-history"
        enableSearch={false}
        extraFilters={extraFilters}
      />
    </div>
  );
};

export default DailyReportHistory;
