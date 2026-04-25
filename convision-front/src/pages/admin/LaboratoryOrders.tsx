import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus, Eye, Pencil, Trash2, FlaskConical, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  laboratoryOrderService,
  LaboratoryOrder,
  LaboratoryOrderStats,
} from '@/services/laboratoryOrderService';
import { laboratoryService } from '@/services/laboratoryService';
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
  in_process: 'bg-[#eff1ff] text-[#3a71f7]',
  in_progress: 'bg-[#eff1ff] text-[#3a71f7]',
  sent_to_lab: 'bg-[#eff1ff] text-[#3a71f7]',
  in_transit: 'bg-[#e8f4f8] text-[#0e7490]',
  in_quality: 'bg-[#eef2ff] text-[#4338ca]',
  ready_for_delivery: 'bg-[#ebf5ef] text-[#228b52]',
  portfolio: 'bg-[#fff0f0] text-[#b82626]',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  normal: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

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

const PER_PAGE = 10;

const LaboratoryOrders: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [laboratoryFilter, setLaboratoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-lab-orders', page, search, statusFilter, priorityFilter, laboratoryFilter],
    queryFn: () =>
      laboratoryOrderService.getLaboratoryOrders({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        laboratory_id: laboratoryFilter ? Number(laboratoryFilter) : undefined,
        sort_field: 'created_at',
        sort_direction: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  const orders: LaboratoryOrder[] = data?.data ?? [];
  const total: number = (data?.total ?? data?.meta?.total ?? 0) as number;
  const lastPage: number = (data?.last_page ?? data?.meta?.last_page ?? 1) as number;
  const fromItem: number = (data?.from || data?.meta?.from || (total > 0 ? (page - 1) * PER_PAGE + 1 : 0)) as number;
  const toItem: number = (data?.to || data?.meta?.to || (total > 0 ? Math.min(page * PER_PAGE, total) : 0)) as number;

  const inProcessCount = (statsData?.in_process ?? 0) + (statsData?.sent_to_lab ?? 0);
  const hasActiveFilters = !!(statusFilter || priorityFilter || laboratoryFilter || search);

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setLaboratoryFilter('');
    setSearch('');
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await laboratoryOrderService.deleteLaboratoryOrder(deleteTarget.id);
      toast({ title: 'Orden eliminada', description: `La orden ${deleteTarget.order_number} fue eliminada.` });
      refetch();
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
      id: 'priority',
      header: 'Prioridad',
      type: 'text',
      accessorKey: 'priority',
      cell: (order) => (
        <span
          className={cn(
            'inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
            PRIORITY_BADGE_CLASS[order.priority] ?? 'bg-gray-100 text-gray-600',
          )}
        >
          {PRIORITY_LABELS[order.priority] ?? order.priority}
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

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
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
              <SelectItem value="ready_for_delivery">Listo para entregar</SelectItem>
              <SelectItem value="delivered">Entregado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter || 'all'} onValueChange={(v) => { setPriorityFilter(v === 'all' ? '' : v); setPage(1); }}>
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

          <Select value={laboratoryFilter || 'all'} onValueChange={(v) => { setLaboratoryFilter(v === 'all' ? '' : v); setPage(1); }}>
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

          {hasActiveFilters && (
            <button
              className="text-[12px] text-[#7d7d87] hover:text-[#3a71f7] transition-colors"
              onClick={clearFilters}
            >
              × Limpiar filtros
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#e5e5e9] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5e5e9]">
            <div>
              <h2 className="text-[15px] font-semibold text-[#121215]">Órdenes de laboratorio</h2>
              <p className="text-[12px] text-[#b4b5bc] mt-0.5">
                {total} {total === 1 ? 'orden' : 'órdenes'}
                {hasActiveFilters && ` (${[statusFilter, priorityFilter, laboratoryFilter, search].filter(Boolean).length} filtros activos)`}
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
            onRowClick={(order) => navigate(`/admin/laboratory-orders/${order.id}`)}
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
                {hasActiveFilters
                  ? 'Ninguna orden coincide con los filtros aplicados.'
                  : 'Aún no has registrado órdenes de laboratorio.'}
              </div>
            }
          />
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden {deleteTarget?.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La orden quedará eliminada permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default LaboratoryOrders;
