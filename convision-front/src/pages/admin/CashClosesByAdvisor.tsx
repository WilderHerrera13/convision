import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageLayout from '@/components/layouts/PageLayout';
import { formatCurrency } from '@/lib/utils';
import cashRegisterCloseService, { type AdvisorPendingGroup } from '@/services/cashRegisterCloseService';
import { type CashCloseRow, STATUS_CONFIG, formatCOP } from './cashClosesConfig';

const copMoneyCol = {
  currency: 'COP' as const,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

const copFmtOpts = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

const CashClosesByAdvisor: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<CashCloseRow[]>([]);

  const { data: advisorGroups = [], isLoading } = useQuery<AdvisorPendingGroup[]>({
    queryKey: ['advisors-pending-closes'],
    queryFn: () => cashRegisterCloseService.listAdvisorsWithPending(),
  });

  const advisor = useMemo(
    () => advisorGroups.find((a) => String(a.user_id) === userId),
    [advisorGroups, userId],
  );

  const extraFilters = useMemo(
    () => ({
      user_id: userId,
      status: 'submitted,draft',
    }),
    [userId],
  );

  const fetcher = async ({ page, per_page }: { page: number; per_page: number }) => {
    const params: Record<string, unknown> = {
      page,
      per_page,
      user_id: userId,
    };
    const resp = await cashRegisterCloseService.list(params);
    const rows: CashCloseRow[] = resp?.data ?? (Array.isArray(resp) ? resp : []);
    const pendingRows = rows.filter((r) => r.status === 'submitted' || r.status === 'draft');
    setTableData(pendingRows);
    return {
      data: pendingRows,
      last_page: resp?.meta?.last_page ?? resp?.last_page ?? 1,
      total: resp?.meta?.total,
    };
  };

  const totalSum = useMemo(() => tableData.reduce((acc, r) => acc + Number(r.total_counted), 0), [tableData]);

  const columns: DataTableColumnDef<CashCloseRow>[] = [
    {
      id: 'close_date',
      header: 'Fecha',
      type: 'text',
      accessorKey: 'close_date',
      enableSorting: false,
      cell: (item) => (
        <span className="text-[12px] text-[#7d7d87]">
          {format(new Date(item.close_date + 'T12:00:00'), 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      id: 'total_counted',
      header: 'Total Asesor',
      type: 'money',
      accessorKey: 'total_counted',
      enableSorting: false,
      moneyFormat: copMoneyCol,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
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
      type: 'text',
      enableSorting: false,
      cell: (item) => (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 shrink-0 rounded-[8px] border-0 bg-[#eff1ff] text-[#3a71f7] hover:bg-blue-100"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/cash-closes/${item.id}`);
          }}
          aria-label="Ver detalle"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const advisorName = advisor?.user_name ?? (isLoading ? '...' : 'Asesor');

  return (
    <PageLayout
      title="Cierres de Caja"
      subtitle={`Cierres pendientes — ${advisorName}`}
      contentClassName="bg-[#f5f5f6] p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/cash-closes')}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#3a71f7] bg-[#eff1ff] border border-[#c5d3f8] rounded-md px-3 py-1.5 hover:bg-[#dce5ff] transition-colors shrink-0"
          >
            <ArrowLeft className="h-3 w-3" />
            Volver
          </button>
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <span className="text-[14px] font-semibold text-[#0f0f12]">{advisorName}</span>
          )}
          {advisor && (
            <Badge
              variant="outline"
              className="rounded-full border-[#f4c678] bg-[#fff6e3] text-[11px] font-semibold text-[#b57218]"
            >
              {advisor.pending_count} pendiente{advisor.pending_count !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex-1">
          <EntityTable<CashCloseRow>
            columns={columns}
            fetcher={fetcher}
            queryKeyBase={`admin-cash-closes-advisor-${userId}`}
            enableSearch={false}
            showPageSizeSelect={false}
            initialPerPage={10}
            perPageOptions={[10]}
            tableLayout="ledger"
            paginationVariant="figma"
            extraFilters={extraFilters}
          />
          {tableData.length > 0 && (
            <div className="mt-0 flex items-center gap-4 rounded-b-[8px] border border-t-0 border-[#e5e5e9] bg-[#eff1ff] px-3 py-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#3a71f7]">
                Total pendiente
              </span>
              <span className="ml-auto text-[13px] font-bold text-[#0f0f12]">
                {formatCurrency(totalSum, 'COP', copFmtOpts)}
              </span>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default CashClosesByAdvisor;
