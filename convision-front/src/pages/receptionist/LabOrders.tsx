import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus, Eye, FileDown } from 'lucide-react';
import {
  laboratoryOrderService,
  LaboratoryOrder,
  LaboratoryOrderStats,
} from '@/services/laboratoryOrderService';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import PageLayout from '@/components/layouts/PageLayout';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  received_from_lab: 'Recibido del lab.',
  returned_to_lab: 'Retornado al lab.',
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
  received_from_lab: 'bg-[#e8f4f8] text-[#0e7490]',
  returned_to_lab: 'bg-[#ffeeed] text-[#b82626]',
  in_quality: 'bg-[#eef2ff] text-[#4338ca]',
  ready_for_delivery: 'bg-[#ebf5ef] text-[#228b52]',
  portfolio: 'bg-[#fff0f0] text-[#b82626]',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

interface StatCardProps {
  label: string;
  count: number;
  colorClass: string;
  active: boolean;
  onClick: () => void;
}

function StatCard({ label, count, colorClass, active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-5 rounded-xl border transition-all cursor-pointer',
        active ? 'border-[#8753ef] bg-[#f1edff]' : 'border-[#e5e5e9] bg-white hover:border-[#8753ef]/40',
      )}
    >
      <p className="text-[12px] text-[#7d7d87]">{label}</p>
      <p className={cn('text-[32px] font-bold mt-1 leading-none', active ? 'text-[#8753ef]' : colorClass)}>
        {count}
      </p>
    </button>
  );
}

const LabOrders: React.FC = () => {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: statsData } = useQuery<LaboratoryOrderStats>({
    queryKey: ['lab-orders-stats'],
    queryFn: () => laboratoryOrderService.getLaboratoryOrderStats(),
    onError: () =>
      toast({ title: 'Error', description: 'No se pudieron cargar las estadísticas.', variant: 'destructive' }),
  });

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
  };

  const hasActiveFilters = !!statusFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setActiveMetric(null);
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
      id: 'laboratory',
      header: 'Laboratorio',
      type: 'text',
      cell: (order) => (
        <span className="text-[13px] text-[#7d7d87]">{order.laboratory?.name || '—'}</span>
      ),
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
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center justify-center size-8 rounded-[6px] border text-[#8753ef] hover:opacity-80 transition-colors"
            style={{ backgroundColor: '#f1edff', borderColor: '#8753ef4d' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/receptionist/lab-orders/${order.id}`); }}
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#edfaf3] border border-[#228b52]/30 text-[#228b52] hover:opacity-80 transition-colors"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const { pdf_token } = await laboratoryOrderService.getLaboratoryOrderPdfToken(order.id);
                const url = laboratoryOrderService.getLaboratoryOrderPdfUrl(order.id, pdf_token);
                window.open(url, '_blank');
              } catch {
                toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
              }
            }}
            title="Descargar PDF de la orden"
          >
            <FileDown className="h-4 w-4" />
          </button>
        </div>
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
        <p className="text-[11px] text-[#7d7d87]">Toca una métrica para filtrar la tabla por ese estado</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Pendiente envío"
            count={statsData?.pending ?? 0}
            colorClass="text-[#121215]"
            active={activeMetric === 'pending'}
            onClick={() => handleMetricClick('pending', 'pending')}
          />
          <StatCard
            label="En laboratorio"
            count={inLabCount}
            colorClass="text-[#121215]"
            active={activeMetric === 'in_lab'}
            onClick={() => handleMetricClick('in_lab', 'sent_to_lab')}
          />
          <StatCard
            label="Listo para entrega"
            count={statsData?.ready_for_delivery ?? 0}
            colorClass="text-[#121215]"
            active={activeMetric === 'ready_for_delivery'}
            onClick={() => handleMetricClick('ready_for_delivery', 'ready_for_delivery')}
          />
          <StatCard
            label="Cartera"
            count={statsData?.portfolio ?? 0}
            colorClass="text-[#121215]"
            active={activeMetric === 'portfolio'}
            onClick={() => handleMetricClick('portfolio', 'portfolio')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => {
              setStatusFilter(v === 'all' ? '' : v);
              setActiveMetric(null);
            }}
          >
            <SelectTrigger className="h-8 text-[12px] w-[180px] border-[#e5e5e9]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_process">En proceso</SelectItem>
              <SelectItem value="sent_to_lab">Enviado a laboratorio</SelectItem>
              <SelectItem value="in_transit">En tránsito</SelectItem>
              <SelectItem value="in_quality">En calidad</SelectItem>
              <SelectItem value="ready_for_delivery">Listo para entregar</SelectItem>
              <SelectItem value="delivered">Entregado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              className="text-[12px] text-[#7d7d87] hover:text-[#8753ef] transition-colors"
              onClick={clearFilters}
            >
              × Limpiar filtros
            </button>
          )}
        </div>

        <EntityTable<LaboratoryOrder>
          columns={columns}
          queryKeyBase="lab-orders"
          fetcher={({ page, per_page, search }) =>
            laboratoryOrderService.getLaboratoryOrders({
              page,
              per_page,
              search: search || undefined,
              status: statusFilter || undefined,
              sort_field: 'created_at',
              sort_direction: 'desc',
            })
          }
          extraFilters={{ status: statusFilter }}
          searchPlaceholder="Buscar por # o paciente..."
          showPageSizeSelect={false}
          onRowClick={(order) => navigate(`/receptionist/lab-orders/${order.id}`)}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Órdenes de laboratorio</span>
              <span className="text-[11px] text-[#7d7d87]">Listado de órdenes</span>
            </div>
          }
          emptyStateNode={
            <EmptyState
              variant="default"
              title="Sin órdenes"
              description="Aún no has registrado órdenes de laboratorio."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />
      </div>
    </PageLayout>
  );
};

export default LabOrders;
