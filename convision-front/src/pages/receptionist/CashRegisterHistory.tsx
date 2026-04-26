import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import PageLayout from '@/components/layouts/PageLayout';
import cashRegisterCloseService, { CashClose } from '@/services/cashRegisterCloseService';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Borrador',
    className: 'rounded-full border-[#dcdce0] bg-[#f7f7f8] text-[#7d7d87]',
  },
  submitted: {
    label: 'Enviado',
    className: 'rounded-full border-[#f4c778] bg-[#fff6e3] text-[#b57218]',
  },
  approved: {
    label: 'Aprobado',
    className: 'rounded-full border-[#a3d9b8] bg-[#ebf5ef] text-[#228b52]',
  },
};

const CashRegisterHistory: React.FC = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const columns: DataTableColumnDef<CashClose>[] = [
    {
      accessorKey: 'close_date',
      header: 'Fecha',
      enableSorting: false,
      cell: (item) => (
        <span className="text-[13px] text-[#7d7d87]">
          {format(new Date(`${item.close_date}T12:00:00`), 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      accessorKey: 'total_counted',
      header: 'Total Contado',
      enableSorting: false,
      cell: (item) => (
        <span className="text-[13px] font-semibold text-[#0f0f12]">
          {formatCOP(item.total_counted ?? 0)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      enableSorting: false,
      cell: (item) => {
        const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
        return (
          <Badge variant="outline" className={`text-[11px] font-semibold ${cfg.className}`}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableSorting: false,
      cell: (item) => (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 shrink-0 rounded-[6px] border border-[#c5d3f8] bg-[#eff1ff] text-[#3a71f7] hover:bg-blue-100"
          aria-label="Ver detalle"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/receptionist/cash-close-detail/${item.id}`);
          }}
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
      total: resp?.meta?.total,
    };
  };

  const extraFilters = {
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  };

  return (
    <PageLayout
      title="Historial de Cierres"
      subtitle="Consulta los cierres registrados por fecha"
      contentClassName="bg-[#f5f5f6] p-0"
      actions={
        <Button
          className="h-9 bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2d5dcc]"
          onClick={() => navigate('/receptionist/cash-closes')}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Nuevo Cierre
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="w-[160px]">
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Fecha inicio"
            />
          </div>
          <div className="w-[160px]">
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="Fecha fin"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[12px] text-[#7d7d87] hover:text-[#0f0f12]"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              Limpiar
            </Button>
          )}
        </div>

        <EntityTable<CashClose>
          columns={columns}
          fetcher={fetcher}
          queryKeyBase="cash-close-history"
          enableSearch={false}
          showPageSizeSelect
          tableLayout="ledger"
          paginationVariant="figma"
          extraFilters={extraFilters}
        />
      </div>
    </PageLayout>
  );
};

export default CashRegisterHistory;
