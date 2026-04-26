import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import dailyActivityReportService, {
  DailyActivityReport,
  normalizeDailyActivityReport,
} from '@/services/dailyActivityReportService';

const DailyReportHistory: React.FC = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const columns: DataTableColumnDef<DailyActivityReport>[] = [
    {
      accessorKey: 'report_date',
      header: 'Fecha',
      cell: (item) => format(new Date(item.report_date), 'dd/MM/yyyy'),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (item) => {
        const isClosed = item.status === 'closed';
        return (
          <Badge
            variant="outline"
            className={
              isClosed
                ? 'rounded-full border-0 bg-[#ebf5ef] text-[#228b52]'
                : 'rounded-full border-0 bg-[#fff6e3] text-[#b57218]'
            }
          >
            {isClosed ? 'Cerrado' : 'Pendiente'}
          </Badge>
        );
      },
    },
    {
      id: 'total_questions',
      header: 'Total Preguntas',
      cell: (item) => {
        const ca = item.customer_attention;
        if (!ca) return '—';
        return (ca.questions_men ?? 0) + (ca.questions_women ?? 0) + (ca.questions_children ?? 0);
      },
    },
    {
      id: 'effective_consultations',
      header: 'Consultas Efectivas',
      cell: (item) => {
        const ca = item.customer_attention;
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
      cell: (item) => {
        const ops = item.operations;
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
      cell: (item) => (
        <Button
          size="sm"
          variant="outline"
          className="border-[#8753ef] text-[#8753ef] hover:bg-[#f5f0ff]"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/receptionist/daily-report-history/${item.id}`);
          }}
          aria-label="Ver detalle del reporte"
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
    const raw = (resp as { data?: unknown[] })?.data ?? [];
    const rows = Array.isArray(raw) ? raw : [];
    return {
      data: rows.map((r) => normalizeDailyActivityReport(r as Record<string, unknown>)),
      last_page: (resp as { meta?: { last_page?: number } })?.meta?.last_page ?? (resp as { last_page?: number })?.last_page ?? 1,
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
        onRowClick={(row) => navigate(`/receptionist/daily-report-history/${row.id}`)}
        tableLayout="ledger"
        paginationVariant="figma"
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Historial de Reportes</span>
            <span className="text-[11px] text-[#7d7d87]">Reportes diarios registrados</span>
          </div>
        }
        emptyStateNode={<EmptyState variant="default" title="Sin reportes" description="No hay reportes diarios registrados." />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />
    </div>
  );
};

export default DailyReportHistory;
