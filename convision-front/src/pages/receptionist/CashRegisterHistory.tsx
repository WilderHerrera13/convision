import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import cashRegisterCloseService, { CashClose } from '@/services/cashRegisterCloseService';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'border-gray-300 bg-[#f5f5f7] text-[#7d7d87]' },
  submitted: { label: 'Enviado', className: 'border-[#b57218] bg-[#fff6e3] text-[#b57218]' },
  approved: { label: 'Aprobado', className: 'border-[#228b52] bg-[#ebf5ef] text-[#228b52]' },
};

const CashRegisterHistory: React.FC = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const columns: DataTableColumnDef<CashClose>[] = [
    {
      accessorKey: 'close_date',
      header: 'Fecha',
      cell: ({ row }) => format(new Date(row.original.close_date), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'total_registered',
      header: 'Total Registrado',
      cell: ({ row }) => formatCOP(row.original.total_registered ?? 0),
    },
    {
      accessorKey: 'total_counted',
      header: 'Total Contado',
      cell: ({ row }) => formatCOP(row.original.total_counted ?? 0),
    },
    {
      accessorKey: 'total_difference',
      header: 'Diferencia',
      cell: ({ row }) => {
        const diff = row.original.total_difference ?? 0;
        return (
          <span className={diff < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
            {formatCOP(diff)}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const cfg = STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.draft;
        return (
          <Badge variant="outline" className={cfg.className}>
            {cfg.label}
          </Badge>
        );
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
          onClick={() => navigate(`/receptionist/cash-close-detail/${row.original.id}`)}
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
    const resp = await cashRegisterCloseService.list(params);
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
        <h1 className="text-2xl font-bold">Historial de Cierres</h1>
        <p className="text-muted-foreground text-sm">Consulta los cierres registrados por fecha</p>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-48">
          <p className="text-sm font-medium mb-1">Desde</p>
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Fecha inicio"
          />
        </div>
        <div className="w-48">
          <p className="text-sm font-medium mb-1">Hasta</p>
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="Fecha fin"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <EntityTable<CashClose>
        columns={columns}
        fetcher={fetcher}
        queryKeyBase="cash-close-history"
        enableSearch={false}
        extraFilters={extraFilters}
      />
    </div>
  );
};

export default CashRegisterHistory;
