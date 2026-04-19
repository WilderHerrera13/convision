import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageLayout from '@/components/layouts/PageLayout';
import CashClosesFiltersBar from '@/components/admin/CashClosesFiltersBar';
import AdvisorCashCloseCard from '@/components/admin/AdvisorCashCloseCard';
import CashClosesConsolidated from '@/components/admin/CashClosesConsolidated';
import { formatCurrency } from '@/lib/utils';
import cashRegisterCloseService, { type AdvisorPendingGroup } from '@/services/cashRegisterCloseService';
import { userService, User } from '@/services/userService';
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

type ViewMode = 'consolidated' | 'all' | 'by_advisor';

interface PeriodStats {
  totalCount: number;
  pendingCount: number;
  accumulatedVariance: number | null;
  periodLabel: string;
  totalAdvisorSum: number;
}

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  shadowColor: string;
}> = ({ label, value, sub, accentColor, bgColor, borderColor, shadowColor }) => (
  <div
    className="relative overflow-hidden rounded-[12px] border-[1.5px] min-h-[100px] flex-1"
    style={{
      backgroundColor: bgColor,
      borderColor,
      boxShadow: `0px 4px 16px 0px ${shadowColor}`,
    }}
  >
    <div
      className="absolute left-[-1.5px] top-[-1.5px] w-[4px] h-[calc(100%+3px)] rounded-[2px]"
      style={{ backgroundColor: accentColor }}
    />
    <div className="pl-[14px] pt-[12px] pr-4">
      <p className="text-[11px] text-[#7d7d87] font-normal">{label}</p>
      <div className="mt-[8px] text-[26px] font-bold leading-none" style={{ color: accentColor }}>
        {value}
      </div>
      <p className="mt-[10px] text-[11px] text-[#7d7d87] font-normal">{sub}</p>
    </div>
  </div>
);

const VarianceBadge: React.FC<{ value: number | null | undefined; recorded: boolean }> = ({
  value,
  recorded,
}) => {
  if (!recorded || value == null) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-[#dcdce0] bg-[#f7f7f8] text-[11px] font-normal text-[#7d7d87]"
      >
        Sin cruzar
      </Badge>
    );
  }
  if (value === 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-[#dcdce0] bg-[#f7f7f8] text-[11px] font-semibold text-[#7d7d87]"
      >
        $0
      </Badge>
    );
  }
  if (value > 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-[#a3d9b8] bg-[#ebf5ef] text-[11px] font-semibold text-[#228b52]"
      >
        + {formatCOP(value)}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-[#f5baba] bg-[#ffefef] text-[11px] font-semibold text-[#b82626]"
    >
      ↓ {formatCOP(value)}
    </Badge>
  );
};

const AdminCashCloses: React.FC = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [tableData, setTableData] = useState<CashCloseRow[]>([]);

  const { data: users = [], isPending: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
  });

  const advisors = useMemo(
    () => users.filter((u) => u.role === 'receptionist' || u.role === 'specialist'),
    [users],
  );

  const { data: advisorGroups = [], isLoading: isLoadingAdvisors } = useQuery<AdvisorPendingGroup[]>({
    queryKey: ['advisors-pending-closes'],
    queryFn: () => cashRegisterCloseService.listAdvisorsWithPending(),
    enabled: viewMode === 'by_advisor',
  });

  const mergedAdvisors = useMemo((): AdvisorPendingGroup[] => {
    const byId = new Map(advisorGroups.map((g) => [g.user_id, g]));
    const rows = advisors.map((u) => {
      const hit = byId.get(u.id);
      if (hit) {
        return hit;
      }
      const lastName = (u as { last_name?: string | null }).last_name ?? '';
      return {
        user_id: u.id,
        user_name: `${u.name} ${lastName}`.trim(),
        pending_count: 0,
        close_dates: [],
        total_today: 0,
        total_yesterday: null,
        accumulated_variance: null,
        latest_status: 'approved',
        closes: [],
      };
    });
    return [...rows].sort((a, b) => a.user_name.localeCompare(b.user_name, 'es'));
  }, [advisors, advisorGroups]);

  const filteredAdvisors = useMemo(() => {
    let rows = mergedAdvisors;
    if (selectedAdvisorId !== 'all') {
      rows = rows.filter((g) => String(g.user_id) === selectedAdvisorId);
    }
    if (selectedStatus !== 'all') {
      rows = rows.filter((g) => g.closes.some((c) => c.status === selectedStatus));
    }
    if (dateFrom || dateTo) {
      const fromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null;
      const toStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : null;
      rows = rows.filter((g) => {
        if (g.pending_count === 0) {
          return !fromStr && !toStr;
        }
        return g.close_dates.some((d) => {
          if (fromStr && d < fromStr) return false;
          if (toStr && d > toStr) return false;
          return true;
        });
      });
    }
    return rows;
  }, [mergedAdvisors, selectedAdvisorId, selectedStatus, dateFrom, dateTo]);

  const periodLabel = useMemo(() => {
    if (dateFrom) {
      return format(dateFrom, 'MMMM yyyy', { locale: es });
    }
    return format(new Date(), 'MMMM yyyy', { locale: es });
  }, [dateFrom]);

  const stats = useMemo<PeriodStats>(() => {
    const label = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
    const pendingFromTable = tableData.filter(
      (r) => r.status === 'submitted' || r.status === 'draft',
    ).length;
    const pendingFromAdvisors = filteredAdvisors.reduce((acc, g) => acc + g.pending_count, 0);

    if (viewMode === 'by_advisor') {
      const variance = filteredAdvisors
        .filter((g) => g.accumulated_variance != null)
        .reduce((acc, g) => acc + Number(g.accumulated_variance), 0);
      const hasAnyVariance = filteredAdvisors.some((g) => g.accumulated_variance != null);
      const totalAdvisorSum = filteredAdvisors.reduce(
        (acc, g) => acc + (g.pending_count > 0 ? Number(g.total_today) : 0),
        0,
      );
      return {
        totalCount: filteredAdvisors.length,
        pendingCount: pendingFromAdvisors,
        accumulatedVariance: hasAnyVariance ? variance : null,
        periodLabel: label,
        totalAdvisorSum,
      };
    }

    const variance = tableData
      .filter((r) => r.admin_actuals_recorded_at != null && r.reconciliation?.totals?.variance_total != null)
      .reduce((acc, r) => acc + Number(r.reconciliation!.totals!.variance_total!), 0);
    const hasAnyVariance = tableData.some(
      (r) => r.admin_actuals_recorded_at != null && r.reconciliation?.totals?.variance_total != null,
    );
    const totalAdvisorSum = tableData.reduce((acc, r) => acc + Number(r.total_counted), 0);

    return {
      totalCount: tableData.length,
      pendingCount: pendingFromTable,
      accumulatedVariance: hasAnyVariance ? variance : null,
      periodLabel: label,
      totalAdvisorSum,
    };
  }, [tableData, periodLabel, viewMode, filteredAdvisors]);

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
      id: 'user',
      header: 'Asesor',
      type: 'text',
      enableSorting: false,
      cell: (item) => {
        const u = item.user;
        if (!u) return <span className="text-[#7d7d87]">—</span>;
        return (
          <span className="text-[13px] font-semibold text-[#0f0f12]">
            {u.name} {(u as { last_name?: string }).last_name ?? ''}
          </span>
        );
      },
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
      id: 'variance_total',
      header: 'Diferencia',
      type: 'text',
      enableSorting: false,
      cell: (item) => (
        <VarianceBadge
          value={
            item.reconciliation?.totals?.variance_total != null
              ? Number(item.reconciliation.totals.variance_total)
              : null
          }
          recorded={item.admin_actuals_recorded_at != null}
        />
      ),
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
            const userId = item.user?.id;
            if (userId) {
              navigate(`/admin/cash-closes/advisor/${userId}?date=${item.close_date}`);
            } else {
              navigate(`/admin/cash-closes/${item.id}`);
            }
          }}
          aria-label={`Ver cierres de ${item.user?.name ?? 'asesor'} del ${item.close_date}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const extraFilters = {
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    user_id: selectedAdvisorId !== 'all' ? selectedAdvisorId : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  };

  const fetcher = async ({ page, per_page }: { page: number; per_page: number }) => {
    const params: Record<string, unknown> = { page, per_page };
    if (extraFilters.date_from) params.date_from = extraFilters.date_from;
    if (extraFilters.date_to) params.date_to = extraFilters.date_to;
    if (extraFilters.user_id) params.user_id = extraFilters.user_id;
    if (extraFilters.status) params.status = extraFilters.status;
    const resp = await cashRegisterCloseService.list(params);
    const rows: CashCloseRow[] = resp?.data ?? (Array.isArray(resp) ? resp : []);
    setTableData(rows);
    return {
      data: rows,
      last_page: resp?.meta?.last_page ?? resp?.last_page ?? 1,
      total: resp?.meta?.total,
    };
  };

  const handleClear = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedAdvisorId('all');
    setSelectedStatus('all');
  };

  const handleAdvisorReview = (advisor: AdvisorPendingGroup) => {
    navigate(`/admin/cash-closes/advisor/${advisor.user_id}`);
  };

  const totalVarianceForPeriod = stats.accumulatedVariance ?? 0;
  const variancePositive = totalVarianceForPeriod >= 0;

  return (
    <PageLayout
      title="Cierres de Caja"
      subtitle="Revisión y aprobación de cierres diarios"
      contentClassName="bg-[#f5f5f6] p-0"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-[#e5e5e9] text-[13px] font-semibold text-[#121215]"
          onClick={() => toast.info('Exportación disponible próximamente')}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 overflow-hidden rounded-[8px] border border-[#dcdce0] bg-[#f7f7f8]">
            <button
              type="button"
              onClick={() => setViewMode('consolidated')}
              className={`flex h-full w-[120px] items-center justify-center rounded-[6px] px-3 text-[12px] whitespace-nowrap transition-colors ${
                viewMode === 'consolidated'
                  ? 'm-[3px] h-[calc(100%-6px)] bg-[#eff1ff] font-semibold text-[#3a71f7]'
                  : 'font-normal text-[#7d7d87]'
              }`}
            >
              Consolidado
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex h-full w-[140px] items-center justify-center rounded-[6px] px-3 text-[12px] whitespace-nowrap transition-colors ${
                viewMode === 'all'
                  ? 'm-[3px] h-[calc(100%-6px)] bg-white font-semibold text-[#0f0f12] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]'
                  : 'font-normal text-[#7d7d87]'
              }`}
            >
              Todos los cierres
            </button>
            <button
              type="button"
              onClick={() => setViewMode('by_advisor')}
              className={`flex h-full w-[120px] items-center justify-center rounded-[6px] px-3 text-[12px] transition-colors ${
                viewMode === 'by_advisor'
                  ? 'm-[3px] h-[calc(100%-6px)] bg-white font-semibold text-[#0f0f12] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]'
                  : 'font-normal text-[#7d7d87]'
              }`}
            >
              Por asesor
            </button>
          </div>
        </div>

        {viewMode === 'consolidated' && <CashClosesConsolidated />}

        {viewMode !== 'consolidated' && (
        <>
        <div className="flex gap-4">
          <StatCard
            label={viewMode === 'by_advisor' ? 'Asesores en vista' : 'Cierres del Período'}
            value={<span className="text-[#0f0f12]">{stats.totalCount}</span>}
            sub={viewMode === 'by_advisor' ? 'Lista actual' : stats.periodLabel}
            accentColor="#3a71f7"
            bgColor="white"
            borderColor="#e5e5e9"
            shadowColor="rgba(58,113,247,0.08)"
          />
          <StatCard
            label="Pendientes de Revisión"
            value={<span className="text-[#b57218]">{stats.pendingCount}</span>}
            sub="Requieren aprobación"
            accentColor="#b57218"
            bgColor="#fff6e3"
            borderColor="#f4c678"
            shadowColor="rgba(181,114,24,0.08)"
          />
          <StatCard
            label="Diferencia Acumulada"
            value={
              <span className={variancePositive ? 'text-[#0f0f12]' : 'text-[#b82626]'}>
                {totalVarianceForPeriod >= 0 ? '' : '-'}
                {formatCurrency(Math.abs(totalVarianceForPeriod), 'COP', copFmtOpts)}
              </span>
            }
            sub="Acumulado del período"
            accentColor="#b82626"
            bgColor="#ffeeed"
            borderColor="#f5baba"
            shadowColor="rgba(184,38,38,0.08)"
          />
        </div>

        <CashClosesFiltersBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={handleClear}
          advisors={advisors}
          selectedAdvisorId={selectedAdvisorId}
          onAdvisorChange={setSelectedAdvisorId}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        <div className="flex-1">
          {viewMode === 'all' ? (
            <>
              <EntityTable<CashCloseRow>
                columns={columns}
                fetcher={fetcher}
                queryKeyBase="admin-cash-closes"
                enableSearch={false}
                showPageSizeSelect={false}
                initialPerPage={10}
                perPageOptions={[10]}
                enableSorting={false}
                tableLayout="ledger"
                paginationVariant="figma"
                extraFilters={extraFilters}
              />
              {tableData.length > 0 && (
                <div className="mt-0 flex items-center gap-4 rounded-b-[8px] border border-t-0 border-[#e5e5e9] bg-[#eff1ff] px-3 py-3">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#3a71f7]">
                    Totales del período
                  </span>
                  <span className="ml-auto text-[13px] font-bold text-[#0f0f12]">
                    {formatCurrency(stats.totalAdvisorSum, 'COP', copFmtOpts)}
                  </span>
                  {totalVarianceForPeriod != null && (
                    <VarianceBadge value={totalVarianceForPeriod} recorded />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7d7d87]">
                Asesores comerciales
              </p>
              {isLoadingAdvisors || isLoadingUsers ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[180px] rounded-[12px]" />
                  ))}
                </div>
              ) : advisors.length === 0 ? (
                <div className="flex items-center justify-center rounded-[12px] border border-[#e5e5e9] bg-white py-16">
                  <p className="text-[13px] text-[#7d7d87]">No hay asesores comerciales registrados</p>
                </div>
              ) : filteredAdvisors.length === 0 ? (
                <div className="flex items-center justify-center rounded-[12px] border border-[#e5e5e9] bg-white py-16">
                  <p className="text-[13px] text-[#7d7d87]">Ningún asesor coincide con los filtros</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredAdvisors.map((advisor) => (
                      <AdvisorCashCloseCard
                        key={advisor.user_id}
                        advisor={advisor}
                        onReview={handleAdvisorReview}
                      />
                    ))}
                  </div>
                  <p className="text-[12px] text-[#7d7d87]">
                    {filteredAdvisors.length} {filteredAdvisors.length === 1 ? 'asesor' : 'asesores'} ·{' '}
                    {filteredAdvisors.filter((a) => a.pending_count > 1).length} con más de 1 día pendiente
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </PageLayout>
  );
};

export default AdminCashCloses;


