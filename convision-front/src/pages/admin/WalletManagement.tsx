import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Phone, Wallet, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { portfolioService, PortfolioOrderItem } from '@/services/portfolioService';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import PageLayout from '@/components/layouts/PageLayout';
import RegisterCallModal from '@/components/portfolio/RegisterCallModal';
import { EmptyState } from '@/components/ui/empty-state';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { cn } from '@/lib/utils';

const CALL_RESULT_LABELS: Record<string, string> = {
  contacted: 'Contactado — dice que viene',
  payment_promise: 'Promesa de pago',
  no_answer: 'No contestó',
  wrong_number: 'Número equivocado',
};

interface StatCardProps {
  label: string;
  count: number;
  colorClass?: string;
}

function StatCard({ label, count, colorClass = 'text-[#0f0f12]' }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e5e5e9] rounded-xl p-5 flex-1 min-w-0">
      <p className="text-[12px] text-[#7d7d87] leading-none">{label}</p>
      <p className={cn('text-[32px] font-bold mt-2 leading-none', colorClass)}>{count}</p>
    </div>
  );
}

function DaysBadge({ days }: { days: number }) {
  const colorClass =
    days > 7
      ? 'bg-[#ffeeed] text-[#b82626]'
      : days > 3
      ? 'bg-[#fff6e3] text-[#b57218]'
      : 'bg-[#ebf5ef] text-[#228b52]';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', colorClass)}>
      {days} días
    </span>
  );
}

function formatCurrencyCOP(value: number | null | undefined) {
  if (value == null) return '—';
  return `$ ${Math.round(value).toLocaleString('es-CO')}`;
}

interface WalletManagementProps {
  basePath?: string;
}

const WalletManagement: React.FC<WalletManagementProps> = ({ basePath = '/admin/portfolio' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<PortfolioOrderItem | null>(null);
  const roleTheme = useRoleTheme();

  const { data: stats } = useQuery({
    queryKey: ['portfolio-stats'],
    queryFn: portfolioService.getStats,
    refetchInterval: 30_000,
  });

  const columns: DataTableColumnDef<PortfolioOrderItem>[] = [
    {
      id: 'order_number',
      header: '# Orden',
      type: 'text',
      accessorKey: 'order_number',
      cell: (row) => (
        <span className="text-[13px] font-medium text-[#121215]">{row.order_number}</span>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: (row) => {
        const name = row.patient
          ? `${row.patient.first_name} ${row.patient.last_name}`
          : '—';
        return <span className="text-[13px] text-[#0f0f12]">{name}</span>;
      },
    },
    {
      id: 'phone',
      header: 'Teléfono',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] text-[#7d7d87]">{row.patient?.phone ?? '—'}</span>
      ),
    },
    {
      id: 'days_in_portfolio',
      header: 'Días en espera',
      type: 'custom',
      cell: (row) => <DaysBadge days={row.days_in_portfolio} />,
    },
    {
      id: 'drawer_number',
      header: 'Cajón',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] text-[#0f0f12]">
          {row.drawer_number ? `#${row.drawer_number}` : '—'}
        </span>
      ),
    },
    {
      id: 'balance',
      header: 'Saldo',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] font-medium text-[#0f0f12]">{formatCurrencyCOP(row.balance)}</span>
      ),
    },
    {
      id: 'last_call',
      header: 'Último resultado',
      type: 'text',
      cell: (row) => {
        if (!row.last_call) {
          return <span className="text-[13px] text-[#b4b5bc]">Sin intentos</span>;
        }
        return (
          <span className="text-[13px] text-[#7d7d87]">
            {CALL_RESULT_LABELS[row.last_call.result] ?? row.last_call.result}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#eff1ff] border border-[#3a71f7]/30 text-[#3a71f7] hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/${row.id}`); }}
            title="Ver detalle"
          >
            <Eye className="size-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] hover:opacity-80 transition-colors"
            style={{
              background: `${roleTheme.light}`,
              border: `1px solid ${roleTheme.primary}4d`,
              color: roleTheme.primary,
            }}
            onClick={(e) => { e.stopPropagation(); setSelectedOrder(row); }}
            title="Registrar llamada"
          >
            <Phone className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Gestión de Cartera"
      subtitle="Lentes listos sin recoger — seguimiento y llamadas de cobranza"
    >
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Sin recoger" count={stats?.total ?? 0} />
          <StatCard label="> 5 días espera" count={stats?.over_five_days ?? 0} colorClass="text-[#b57218]" />
          <StatCard label="Intentos fallidos" count={stats?.failed_attempts ?? 0} colorClass="text-[#b82626]" />
          <StatCard label="Promesas de pago" count={stats?.payment_promises ?? 0} colorClass="text-[#228b52]" />
        </div>

        <div className="bg-white border border-[#e5e5e9] rounded-xl overflow-hidden">
          <EntityTable<PortfolioOrderItem>
            columns={columns}
            queryKeyBase="portfolio-orders"
            fetcher={({ page, per_page, search }) =>
              portfolioService.getOrdersForTable({ page, per_page, search })
            }
            onRowClick={(row) => navigate(`${basePath}/${row.id}`)}
            searchPlaceholder="Buscar cliente..."
            paginationVariant="figma"
            ledgerBorderMode="figma"
            tableLayout="ledger"
            tableClassName="table-fixed min-w-[960px]"
            enableSorting={false}
            showPageSizeSelect={false}
            initialPerPage={10}
            tableAriaLabel="Cartera pendiente"
            toolbarLeading={
              <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
                <span className="text-[14px] font-semibold text-[#121215]">Cartera pendiente</span>
                <span className="text-[11px] text-[#7d7d87]">
                  {stats?.total ?? 0} {(stats?.total ?? 0) === 1 ? 'lente' : 'lentes'} sin recoger
                </span>
              </div>
            }
            toolbarTrailing={
              <Button variant="outline" size="sm" className="h-[34px] text-[12px] gap-1.5">
                <Filter className="size-3.5" />
                Filtrar
              </Button>
            }
            emptyStateNode={
              <EmptyState
                leadingIcon={Wallet}
                accentColor={roleTheme.primary}
                title="Sin órdenes en cartera"
                description="No hay lentes pendientes de recogida en este momento."
              />
            }
            filterEmptyStateNode={
              <EmptyState
                variant="table-filter"
              />
            }
          />
        </div>
      </div>

      {selectedOrder && (
        <RegisterCallModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['portfolio-orders'] })}
        />
      )}
    </PageLayout>
  );
};

export default WalletManagement;
