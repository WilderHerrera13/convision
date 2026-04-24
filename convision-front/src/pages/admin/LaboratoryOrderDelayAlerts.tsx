import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Pencil, Trash2, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { laboratoryOrderService, LaboratoryOrder, LaboratoryOrderStats } from '@/services/laboratoryOrderService';
import { laboratoryService, Laboratory } from '@/services/laboratoryService';
import { cn, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  LAB_ORDER_PRIORITY_LABELS,
  LAB_ORDER_PRIORITY_TOKENS,
  LAB_ORDER_STATUS_LABELS,
  LAB_ORDER_STATUS_TOKENS,
  LabOrderPriority,
  LabOrderStatus,
} from '@/constants/laboratoryOrderStatus';

function daysLate(estimatedDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(estimatedDate).getTime()) / 86400000));
}

interface DelayAlertsFiltersProps {
  statusFilter: string;
  priorityFilter: string;
  laboratoryFilter: number | undefined;
  sedeFilter: string;
  periodoFilter: string;
  laboratories: Laboratory[];
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onLaboratoryChange: (v: number | undefined) => void;
  onSedeChange: (v: string) => void;
  onPeriodoChange: (v: string) => void;
  onClear: () => void;
  activeFilterCount: number;
}

function FilterSelect({
  label,
  value,
  display,
  onValueChange,
  children,
  width = 'w-44',
  active = false,
}: {
  label: string;
  value: string;
  display: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  width?: string;
  active?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          width,
          'h-[52px] flex flex-col items-start justify-center gap-0.5 px-3 py-1.5 bg-white border-[#e5e5e9] text-left',
          active && 'border-[#3a71f7]',
        )}
      >
        <span className="text-[10px] text-[#7d7d87] leading-none font-medium">{label}</span>
        <span
          className={cn(
            'text-[13px] font-semibold leading-none truncate w-full',
            active ? 'text-[#3a71f7]' : 'text-[#0f0f12]',
          )}
        >
          {display}
        </span>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function DelayAlertsFilters({
  statusFilter,
  priorityFilter,
  laboratoryFilter,
  sedeFilter,
  periodoFilter,
  laboratories,
  onStatusChange,
  onPriorityChange,
  onLaboratoryChange,
  onSedeChange,
  onPeriodoChange,
  onClear,
  activeFilterCount,
}: DelayAlertsFiltersProps) {
  const sedeDisplay = sedeFilter || 'Todas las sedes';
  const statusDisplay = statusFilter
    ? LAB_ORDER_STATUS_LABELS[statusFilter as LabOrderStatus] ?? statusFilter
    : 'Con retraso';
  const priorityDisplay = priorityFilter
    ? LAB_ORDER_PRIORITY_LABELS[priorityFilter as LabOrderPriority] ?? priorityFilter
    : 'Todas';
  const labDisplay = laboratoryFilter
    ? laboratories.find((l) => l.id === laboratoryFilter)?.name ?? '—'
    : 'Todos';
  const periodoDisplay = (() => {
    if (!periodoFilter) return 'Últimos 30 días';
    const map: Record<string, string> = {
      today: 'Hoy',
      week: 'Esta semana',
      month: 'Este mes',
      last_month: 'Mes anterior',
    };
    return map[periodoFilter] ?? periodoFilter;
  })();

  return (
    <div className="flex flex-wrap gap-3 items-center bg-white rounded-[10px] border border-[#ebebee] px-4 py-3">
      <FilterSelect
        label="Sede"
        value={sedeFilter || 'all'}
        display={sedeDisplay}
        onValueChange={(v) => onSedeChange(v === 'all' ? '' : v)}
        width="w-44"
        active={!!sedeFilter}
      >
        <SelectItem value="all">Todas las sedes</SelectItem>
        <SelectItem value="Sede Principal">Sede Principal</SelectItem>
        <SelectItem value="Sede Norte">Sede Norte</SelectItem>
        <SelectItem value="Sede Sur">Sede Sur</SelectItem>
      </FilterSelect>

      <FilterSelect
        label="Estado"
        value={statusFilter || 'all'}
        display={statusDisplay}
        onValueChange={(v) => onStatusChange(v === 'all' ? '' : v)}
        width="w-48"
        active
      >
        <SelectItem value="all">Con retraso</SelectItem>
        {(Object.keys(LAB_ORDER_STATUS_LABELS) as LabOrderStatus[])
          .filter((s) => s !== 'delivered' && s !== 'cancelled')
          .map((s) => (
            <SelectItem key={s} value={s}>
              {LAB_ORDER_STATUS_LABELS[s]}
            </SelectItem>
          ))}
      </FilterSelect>

      <FilterSelect
        label="Prioridad"
        value={priorityFilter || 'all'}
        display={priorityDisplay}
        onValueChange={(v) => onPriorityChange(v === 'all' ? '' : v)}
        width="w-40"
        active={!!priorityFilter}
      >
        <SelectItem value="all">Todas</SelectItem>
        {(Object.keys(LAB_ORDER_PRIORITY_LABELS) as LabOrderPriority[]).map((p) => (
          <SelectItem key={p} value={p}>
            {LAB_ORDER_PRIORITY_LABELS[p]}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Laboratorio"
        value={laboratoryFilter ? String(laboratoryFilter) : 'all'}
        display={labDisplay}
        onValueChange={(v) => onLaboratoryChange(v === 'all' ? undefined : Number(v))}
        width="w-52"
        active={!!laboratoryFilter}
      >
        <SelectItem value="all">Todos</SelectItem>
        {laboratories.map((lab) => (
          <SelectItem key={lab.id} value={String(lab.id)}>
            {lab.name}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Periodo"
        value={periodoFilter || 'all'}
        display={periodoDisplay}
        onValueChange={(v) => onPeriodoChange(v === 'all' ? '' : v)}
        width="w-44"
        active={!!periodoFilter}
      >
        <SelectItem value="all">Últimos 30 días</SelectItem>
        <SelectItem value="today">Hoy</SelectItem>
        <SelectItem value="week">Esta semana</SelectItem>
        <SelectItem value="month">Este mes</SelectItem>
        <SelectItem value="last_month">Mes anterior</SelectItem>
      </FilterSelect>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-[#7d7d87] hover:text-[#0f0f12] h-9 ml-auto"
          onClick={onClear}
        >
          × Limpiar filtros
        </Button>
      )}
    </div>
  );
}

const LaboratoryOrderDelayAlerts: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LaboratoryOrder[]>([]);
  const [stats, setStats] = useState<LaboratoryOrderStats | null>(null);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [laboratoryFilter, setLaboratoryFilter] = useState<number | undefined>(undefined);
  const [sedeFilter, setSedeFilter] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const activeFilterCount = [
    statusFilter,
    priorityFilter,
    laboratoryFilter ? String(laboratoryFilter) : '',
    sedeFilter,
    periodoFilter,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setLaboratoryFilter(undefined);
    setSedeFilter('');
    setPeriodoFilter('');
    setCurrentPage(1);
  };

  useEffect(() => {
    laboratoryService.getActiveLaboratories().then(setLaboratories).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      laboratoryOrderService.getLaboratoryOrders({
        overdue: 'true',
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        laboratory_id: laboratoryFilter,
        page: currentPage,
        per_page: 10,
      }),
      laboratoryOrderService.getLaboratoryOrderStats(),
    ])
      .then(([ordersResp, statsData]) => {
        if (cancelled) return;
        setOrders(ordersResp.data ?? []);
        setTotalItems(ordersResp.total ?? ordersResp.meta?.total ?? 0);
        setTotalPages(ordersResp.last_page ?? ordersResp.meta?.last_page ?? 1);
        setStats(statsData);
      })
      .catch(() => {
        if (cancelled) return;
        toast({ title: 'Error', description: 'No se pudieron cargar las alertas.', variant: 'destructive' });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter, priorityFilter, laboratoryFilter, currentPage]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await laboratoryOrderService.deleteLaboratoryOrder(id);
      toast({ title: 'Orden eliminada', description: 'La orden fue eliminada exitosamente.' });
      setCurrentPage(1);
      setStatusFilter((s) => s);
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la orden.', variant: 'destructive' });
    }
  };

  const criticalCount = orders.filter(
    (o) => o.estimated_completion_date && daysLate(o.estimated_completion_date) > 5,
  ).length;

  const avgDays = orders.length > 0
    ? (orders.reduce((acc, o) => acc + (o.estimated_completion_date ? daysLate(o.estimated_completion_date) : 0), 0) / orders.length).toFixed(1)
    : '0';

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * 10 + 1;
  const endItem = Math.min(currentPage * 10, totalItems);

  const isEmpty = orders.length === 0 && !loading;

  return (
    <div className="p-6 space-y-5 bg-[#f5f5f6] min-h-full">
      <div>
        <p className="text-[12px] text-[#7d7d87] mb-1">
          Administración / <button
            type="button"
            onClick={() => navigate('/admin/laboratory-orders')}
            className="hover:text-[#3a71f7] hover:underline transition-colors"
          >
            Órdenes de Laboratorio
          </button> / <span className="text-[#0f0f12] font-medium">Alertas por Retraso</span>
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-[#0f0f12]">Alertas por Retraso</h1>
          <Button
            disabled={loading || totalItems === 0}
            className="bg-[#3a71f7] hover:bg-[#2558d4] text-white h-10 px-4"
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportar reporte
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-[10px] border border-[#ebebee] px-5 py-4">
          <p className="text-[12px] font-medium text-[#7d7d87]">Con retraso</p>
          <p className="text-[28px] font-bold leading-tight mt-1 text-[#b82626]">{stats?.overdue ?? 0}</p>
        </div>
        <div className="bg-white rounded-[10px] border border-[#ebebee] px-5 py-4">
          <p className="text-[12px] font-medium text-[#7d7d87]">Críticos (&gt;5 días)</p>
          <p className="text-[28px] font-bold leading-tight mt-1 text-[#b82626]">{loading ? '—' : criticalCount}</p>
        </div>
        <div className="bg-white rounded-[10px] border border-[#ebebee] px-5 py-4">
          <p className="text-[12px] font-medium text-[#7d7d87]">Días promedio de retraso</p>
          <p className="text-[28px] font-bold leading-tight mt-1 text-[#b57218]">{loading ? '—' : avgDays}</p>
        </div>
      </div>

      <DelayAlertsFilters
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        laboratoryFilter={laboratoryFilter}
        sedeFilter={sedeFilter}
        periodoFilter={periodoFilter}
        laboratories={laboratories}
        onStatusChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
        onPriorityChange={(v) => { setPriorityFilter(v); setCurrentPage(1); }}
        onLaboratoryChange={(v) => { setLaboratoryFilter(v); setCurrentPage(1); }}
        onSedeChange={(v) => { setSedeFilter(v); setCurrentPage(1); }}
        onPeriodoChange={(v) => { setPeriodoFilter(v); setCurrentPage(1); }}
        onClear={clearFilters}
        activeFilterCount={activeFilterCount}
      />

      <div className="bg-white rounded-[10px] border border-[#ebebee] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0f0f2]">
          <h2 className="text-[15px] font-semibold text-[#0f0f12]">Órdenes con retraso</h2>
          {!loading && (
            <p className="text-[12px] text-[#7d7d87] mt-0.5">
              {totalItems === 0
                ? 'No hay órdenes con retraso'
                : `${totalItems} ${totalItems === 1 ? 'orden superó' : 'órdenes superaron'} la fecha estimada`}
            </p>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-[#eff1ff] flex items-center justify-center mb-4 ring-4 ring-[#f5f7ff]">
              <Filter className="w-7 h-7 text-[#3a71f7]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#0f0f12] mb-1">Sin alertas activas</h3>
            <p className="text-[12px] text-[#7d7d87] max-w-sm">
              Todas las órdenes están dentro de la fecha estimada. ¡Buen trabajo!
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#f0f0f2]">
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                  # Orden
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                  Laboratorio
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                  Paciente
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase" style={{ width: 116 }}>
                  Sede
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                  Estado
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                  Prioridad
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-[#f5f5f6] rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : orders.map((row) => {
                    const ss = LAB_ORDER_STATUS_TOKENS[row.status as LabOrderStatus] ?? { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' };
                    const ps = LAB_ORDER_PRIORITY_TOKENS[row.priority as LabOrderPriority] ?? { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' };
                    const statusLabel = LAB_ORDER_STATUS_LABELS[row.status as LabOrderStatus] ?? row.status;
                    const priorityLabel = LAB_ORDER_PRIORITY_LABELS[row.priority as LabOrderPriority] ?? row.priority;
                    const lateDays = row.estimated_completion_date ? daysLate(row.estimated_completion_date) : 0;
                    return (
                      <TableRow
                        key={row.id}
                        className="hover:bg-[#fafafa] cursor-pointer border-b border-[#f5f5f6] last:border-0"
                        onClick={() => navigate(`/admin/laboratory-orders/${row.id}`)}
                      >
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-[#0f0f12]">{row.order_number}</span>
                            {row.estimated_completion_date && (
                              <span className="text-[11px] text-[#b82626] mt-0.5 font-medium">
                                Est. {formatDate(row.estimated_completion_date)} · +{lateDays}d
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-[#0f0f12]">{row.laboratory?.name ?? '—'}</TableCell>
                        <TableCell className="text-[13px] text-[#0f0f12]">
                          {row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : '—'}
                        </TableCell>
                        <TableCell className="text-[13px] text-[#7d7d87]">
                          {(row as LaboratoryOrder & { sede?: string }).sede ?? 'Sede Principal'}
                        </TableCell>
                        <TableCell>
                          <span
                            style={{ backgroundColor: ss.bg, color: ss.text }}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          >
                            {statusLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{ color: ps.text }}
                            className="text-[12px] font-semibold"
                          >
                            {priorityLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/laboratory-orders/${row.id}`)}
                              className="h-8 w-8 rounded-md bg-[#eff1ff] hover:bg-[#dbe3ff] flex items-center justify-center transition-colors"
                              aria-label="Ver detalle"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#3a71f7]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/laboratory-orders/${row.id}/edit`)}
                              className="h-8 w-8 rounded-md bg-[#f5f5f6] hover:bg-[#ebebee] flex items-center justify-center transition-colors"
                              aria-label="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#7d7d87]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row.id)}
                              className="h-8 w-8 rounded-md bg-[#ffeeed] hover:bg-[#ffd9d6] flex items-center justify-center transition-colors"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#b82626]" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        )}

        {!loading && totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#f0f0f2]">
            <p className="text-[12px] text-[#7d7d87]">
              Mostrando <span className="font-semibold text-[#0f0f12]">{startItem}–{endItem}</span> de {totalItems} resultados
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 w-8 rounded-md border border-[#e5e5e9] flex items-center justify-center text-[#7d7d87] hover:bg-[#f5f5f6] disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {(() => {
                  const pages: number[] = [];
                  const max = Math.min(totalPages, 5);
                  for (let i = 1; i <= max; i++) pages.push(i);
                  return pages.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'h-8 w-8 rounded-md text-[12px] font-semibold flex items-center justify-center',
                        page === currentPage
                          ? 'bg-[#0f0f12] text-white'
                          : 'border border-[#e5e5e9] text-[#0f0f12] hover:bg-[#f5f5f6]',
                      )}
                    >
                      {page}
                    </button>
                  ));
                })()}
                {totalPages > 5 && <span className="px-1 text-[12px] text-[#7d7d87]">...</span>}
                {totalPages > 5 && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className={cn(
                      'h-8 w-8 rounded-md text-[12px] font-semibold flex items-center justify-center',
                      totalPages === currentPage
                        ? 'bg-[#0f0f12] text-white'
                        : 'border border-[#e5e5e9] text-[#0f0f12] hover:bg-[#f5f5f6]',
                    )}
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 w-8 rounded-md border border-[#e5e5e9] flex items-center justify-center text-[#7d7d87] hover:bg-[#f5f5f6] disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar orden"
        description="Esta acción no se puede deshacer. ¿Estás seguro de eliminar esta orden de laboratorio?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default LaboratoryOrderDelayAlerts;
