import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus, Eye, Pencil, Trash2, FileDown } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  laboratoryOrderService,
  LaboratoryOrder,
  LaboratoryOrderStats,
} from '@/services/laboratoryOrderService';
import { laboratoryService } from '@/services/laboratoryService';
import { formatDate } from '@/lib/utils';
import { AdminBranchFilter } from '@/components/admin/AdminBranchFilter';
import { cn } from '@/lib/utils';
import PageLayout from '@/components/layouts/PageLayout';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import {
  LABORATORY_ORDER_STATUS_LABELS,
  LAB_ORDER_STATUS_TOKENS,
  LAB_ORDER_PRIORITY_LABELS,
  LAB_ORDER_PRIORITY_TOKENS,
} from '@/constants/laboratoryOrderStatus';

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  normal: 'bg-gray-100 text-gray-600',
  high: 'bg-[#fff6e3] text-[#b57218]',
  urgent: 'bg-red-100 text-red-700',
};

interface StatCardProps {
  label: string;
  count: number;
  colorClass: string;
}

function StatCard({ label, count, colorClass }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e5e5e9] rounded-xl p-5">
      <p className="text-[12px] text-[#7d7d87]">{label}</p>
      <p className={`text-[32px] font-bold mt-1 leading-none ${colorClass}`}>{count}</p>
    </div>
  );
}

const LaboratoryOrders: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [laboratoryFilter, setLaboratoryFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<LaboratoryOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: statsData } = useQuery<LaboratoryOrderStats>({
    queryKey: ['admin-lab-orders-stats'],
    queryFn: () => laboratoryOrderService.getLaboratoryOrderStats(),
    onError: () =>
      toast({ title: 'Error', description: 'No se pudieron cargar las estadísticas.', variant: 'destructive' }),
  });

  const { data: labsData } = useQuery({
    queryKey: ['laboratories-list'],
    queryFn: () => laboratoryService.getLaboratories(),
  });

  const inProcessCount = (statsData?.in_process ?? 0) + (statsData?.sent_to_lab ?? 0);
  const hasActiveFilters = !!(
    statusFilter ||
    priorityFilter ||
    laboratoryFilter ||
    branchFilter !== 'all'
  );

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setLaboratoryFilter('');
    setBranchFilter('all');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await laboratoryOrderService.deleteLaboratoryOrder(deleteTarget.id);
      toast({ title: 'Orden eliminada', description: `La orden ${deleteTarget.order_number} fue eliminada.` });
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la orden.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
      id: 'laboratory',
      header: 'Laboratorio',
      type: 'text',
      cell: (order) => (
        <span className="text-[13px] text-[#7d7d87]">{order.laboratory?.name || '—'}</span>
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
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: (order) => {
        const token = LAB_ORDER_STATUS_TOKENS[order.status as keyof typeof LAB_ORDER_STATUS_TOKENS];
        return (
          <span
            style={token ? { backgroundColor: token.bg, color: token.text } : undefined}
            className={cn(
              'inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
              !token && 'bg-gray-100 text-gray-600',
            )}
          >
            {LABORATORY_ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        );
      },
    },
    {
      id: 'priority',
      header: 'Prioridad',
      type: 'text',
      accessorKey: 'priority',
      cell: (order) => {
        const token = LAB_ORDER_PRIORITY_TOKENS[order.priority as keyof typeof LAB_ORDER_PRIORITY_TOKENS];
        return (
          <span
            style={token ? { backgroundColor: token.bg, color: token.text } : undefined}
            className={cn(
              'inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
              !token && PRIORITY_BADGE_CLASS[order.priority],
              !token && !PRIORITY_BADGE_CLASS[order.priority] && 'bg-gray-100 text-gray-600',
            )}
          >
            {LAB_ORDER_PRIORITY_LABELS[order.priority as keyof typeof LAB_ORDER_PRIORITY_LABELS] ?? order.priority}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (order) => (
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#eff1ff] border border-[#3a71f7]/30 text-[#3a71f7] hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/laboratory-orders/${order.id}`); }}
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#f5f5f6] border border-[#e5e5e9] text-[#7d7d87] hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/laboratory-orders/${order.id}`); }}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
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
            title="Descargar PDF"
          >
            <FileDown className="h-4 w-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-red-50 border border-red-200 text-red-500 hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(order); }}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Órdenes de Laboratorio"
      actions={
        <Button
          className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] font-semibold h-9 px-4"
          onClick={() => navigate('/admin/laboratory-orders/new')}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nueva Orden
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" count={statsData?.total ?? 0} colorClass="text-[#121215]" />
          <StatCard label="Pendientes" count={statsData?.pending ?? 0} colorClass="text-[#b57218]" />
          <StatCard label="En Proceso" count={inProcessCount} colorClass="text-[#3a71f7]" />
          <StatCard label="Listos" count={statsData?.ready_for_delivery ?? 0} colorClass="text-[#228b52]" />
        </div>

        <div className="flex min-h-[44px] shrink-0 flex-wrap items-center gap-y-2 overflow-hidden rounded-[8px] border border-[#e0e0e4] bg-white py-1">
          <div className="flex min-h-[36px] flex-wrap items-center gap-2 border-r border-[#f0f0f2] px-[14px] py-1">
            <span className="text-[11px] font-semibold text-[#7d7d87]">Filtros</span>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-[12px] w-[160px] border-[#e5e5e9]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_process">En proceso</SelectItem>
                <SelectItem value="sent_to_lab">Enviado a laboratorio</SelectItem>
                <SelectItem value="in_transit">En tránsito</SelectItem>
                <SelectItem value="in_quality">En calidad</SelectItem>
                <SelectItem value="quality_approved">Calidad aprobada</SelectItem>
                <SelectItem value="ready_for_delivery">Listo para entregar</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter || 'all'} onValueChange={(v) => setPriorityFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-[12px] w-[140px] border-[#e5e5e9]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="normal">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={laboratoryFilter || 'all'} onValueChange={(v) => setLaboratoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-[12px] w-[180px] border-[#e5e5e9]">
                <SelectValue placeholder="Laboratorio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los laboratorios</SelectItem>
                {(labsData?.data ?? []).map((lab: { id: number; name: string }) => (
                  <SelectItem key={lab.id} value={String(lab.id)}>{lab.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-h-[36px] min-w-[130px] items-center border-r border-[#f0f0f2] px-[12px] py-1">
            <AdminBranchFilter
              value={branchFilter}
              onChange={setBranchFilter}
              className="[&>span]:mb-0 [&>span]:text-[10px] [&>span]:font-medium [&>span]:normal-case [&>span]:tracking-[0.4px]"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-center px-[12px] py-1">
              <button
                type="button"
                className="text-[12px] font-medium text-[#7d7d87] underline-offset-2 hover:text-[#0f0f12] hover:underline"
                onClick={clearFilters}
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>

        <EntityTable<LaboratoryOrder>
          columns={columns}
          queryKeyBase="admin-lab-orders"
          fetcher={({ page, per_page, search }) =>
            laboratoryOrderService.getLaboratoryOrders({
              page,
              per_page,
              search: search || undefined,
              status: statusFilter || undefined,
              priority: priorityFilter || undefined,
              laboratory_id: laboratoryFilter ? Number(laboratoryFilter) : undefined,
              branchIdQuery: branchFilter === 'all' ? '0' : branchFilter,
              sort_field: 'created_at',
              sort_direction: 'desc',
            })
          }
          extraFilters={{
            status: statusFilter,
            priority: priorityFilter,
            laboratory_id: laboratoryFilter,
            branch: branchFilter,
          }}
          searchPlaceholder="Buscar por # o paciente..."
          showPageSizeSelect={false}
          onRowClick={(order) => navigate(`/admin/laboratory-orders/${order.id}`)}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar orden ${deleteTarget?.order_number ?? ''}`}
        description="Esta accion no se puede deshacer. La orden quedara eliminada permanentemente del sistema."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </PageLayout>
  );
};

export default LaboratoryOrders;
