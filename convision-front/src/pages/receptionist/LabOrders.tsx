import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Plus, Eye, Search, FlaskConical } from 'lucide-react';
import {
  laboratoryOrderService,
  LaboratoryOrder,
  LaboratoryOrderStats,
} from '@/services/laboratoryOrderService';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import PageLayout from '@/components/layouts/PageLayout';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  in_quality: 'En calidad',
  ready_for_delivery: 'Listo para entregar',
  portfolio: 'Cartera',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-[#fff6e3] text-[#b57218]',
  in_process: 'bg-[#fff6e3] text-[#b57218]',
  in_progress: 'bg-[#fff6e3] text-[#b57218]',
  sent_to_lab: 'bg-[#fff6e3] text-[#b57218]',
  in_transit: 'bg-[#e8f4f8] text-[#0e7490]',
  in_quality: 'bg-[#eef2ff] text-[#4338ca]',
  ready_for_delivery: 'bg-[#ebf5ef] text-[#228b52]',
  portfolio: 'bg-[#fff0f0] text-[#b82626]',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

interface MetricCardProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function MetricCard({ label, count, active, onClick }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer ${
        active
          ? 'border-[#8753ef] bg-[#f1edff]'
          : 'border-[#e5e5e9] bg-white hover:border-[#8753ef]/40'
      }`}
    >
      <p className="text-[12px] text-[#7d7d87]">{label}</p>
      <p className={`text-[28px] font-bold mt-1 leading-none ${active ? 'text-[#8753ef]' : 'text-[#121215]'}`}>
        {count}
      </p>
    </button>
  );
}

const PER_PAGE = 10;

const LabOrders: React.FC = () => {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: statsData } = useQuery<LaboratoryOrderStats>({
    queryKey: ['lab-orders-stats'],
    queryFn: () => laboratoryOrderService.getLaboratoryOrderStats(),
    onError: () =>
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas.',
        variant: 'destructive',
      }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['lab-orders', page, search, statusFilter],
    queryFn: () =>
      laboratoryOrderService.getLaboratoryOrders({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
        status: statusFilter || undefined,
        sort_field: 'created_at',
        sort_direction: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  const orders: LaboratoryOrder[] = data?.data ?? [];
  // Go API returns pagination fields at the top level (total, last_page, current_page).
  // Laravel API wraps them under "meta". Support both shapes.
  const total: number = (data?.total ?? data?.meta?.total ?? 0) as number;
  const lastPage: number = (data?.last_page ?? data?.meta?.last_page ?? 1) as number;
  const fromItem: number = (data?.from ?? data?.meta?.from ?? 0) as number;
  const toItem: number = (data?.to ?? data?.meta?.to ?? 0) as number;

  const inLabCount =
    (statsData?.sent_to_lab ?? 0) + (statsData?.in_transit ?? 0) + (statsData?.in_quality ?? 0);

  const handleMetricClick = (metric: string, status: string) => {
    if (activeMetric === metric) {
      setActiveMetric(null);
      setStatusFilter('');
    } else {
      setActiveMetric(metric);
      setStatusFilter(status);
    }
    setPage(1);
  };

  const columns: DataTableColumnDef<LaboratoryOrder>[] = [
    {
      id: 'order_number',
      header: '# Orden',
      type: 'text',
      accessorKey: 'order_number',
      cell: (order) => (
        <div>
          <p className="text-[13px] font-semibold text-[#121215]">{order.order_number}</p>
          <p className="text-[11px] text-[#7d7d87]">{formatDate(order.created_at)}</p>
        </div>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: (order) => (
        <span className="text-[13px] text-[#7d7d87]">
          {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
        </span>
      ),
    },
    {
      id: 'sede',
      header: 'Sede',
      type: 'text',
      cell: () => <span className="text-[13px] text-[#7d7d87]">Sede Principal</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: (order) => (
        <span
          className={cn(
            'inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
            STATUS_BADGE_CLASS[order.status] ?? 'bg-gray-100 text-gray-600',
          )}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (order) => (
        <button
          className="flex items-center justify-center size-8 rounded-[6px] bg-[#f1edff] border border-[#8753ef]/30 text-[#8753ef] hover:opacity-80 transition-colors"
          onClick={(e) => { e.stopPropagation(); navigate(`/receptionist/lab-orders/${order.id}`); }}
          title="Ver detalle"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Órdenes de Laboratorio"
      subtitle="Gestione y registre las órdenes de sus clientes"
      actions={
        <Button
          className="bg-[#8753ef] hover:bg-[#7040d6] text-white text-[13px] font-semibold h-9 px-4"
          onClick={() => navigate('/receptionist/lab-orders/new')}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nueva Orden
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-[11px] text-[#7d7d87]">
          Toca una métrica para filtrar la tabla por ese estado
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Pendiente envío"
            count={statsData?.pending ?? 0}
            active={activeMetric === 'pending'}
            onClick={() => handleMetricClick('pending', 'pending')}
          />
          <MetricCard
            label="En laboratorio"
            count={inLabCount}
            active={activeMetric === 'in_lab'}
            onClick={() => handleMetricClick('in_lab', '')}
          />
          <MetricCard
            label="Listo para entrega"
            count={statsData?.ready_for_delivery ?? 0}
            active={activeMetric === 'ready_for_delivery'}
            onClick={() => handleMetricClick('ready_for_delivery', 'ready_for_delivery')}
          />
          <MetricCard
            label="Cartera"
            count={statsData?.portfolio ?? 0}
            active={activeMetric === 'portfolio'}
            onClick={() => handleMetricClick('portfolio', 'portfolio')}
          />
        </div>

        <div className="bg-white rounded-xl border border-[#e5e5e9] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5e5e9]">
            <div>
              <h2 className="text-[15px] font-semibold text-[#121215]">Órdenes de laboratorio</h2>
              <p className="text-[12px] text-[#b4b5bc] mt-0.5">
                {total} {total === 1 ? 'orden' : 'órdenes'}
              </p>
            </div>
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#b4b5bc]" />
              <Input
                placeholder="Buscar por # o paciente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-[34px] text-[12px] border-[#e5e5e9] rounded-md"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={orders}
            loading={isLoading}
            onRowClick={(order) => navigate(`/receptionist/lab-orders/${order.id}`)}
            enablePagination={total > 0}
            currentPage={page}
            totalPages={lastPage}
            onPageChange={setPage}
            paginationSummary={total > 0 ? { from: fromItem, to: toItem, total } : null}
            paginationVariant="figma"
            tableLayout="ledger"
            ledgerBorderMode="figma"
            emptyStateContent={
              <div className="flex flex-col items-center justify-center py-12 text-[#7d7d87] text-sm">
                <FlaskConical className="h-8 w-8 mb-2 text-gray-300" />
                No hay órdenes para mostrar
              </div>
            }
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default LabOrders;
