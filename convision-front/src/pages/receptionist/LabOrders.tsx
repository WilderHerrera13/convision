import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

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
  const meta = data?.meta ?? {};
  const total: number = meta.total ?? 0;
  const lastPage: number = meta.last_page ?? 1;
  const fromItem: number = meta.from ?? 0;
  const toItem: number = meta.to ?? 0;

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

        <Card className="border border-[#e5e5e9] rounded-lg overflow-hidden shadow-none">
          <div className="bg-white border-b border-[#e5e5e9] px-5 h-[52px] flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-[#121215]">Órdenes de laboratorio</p>
              <p className="text-[11px] text-[#7d7d87]">{total} {total === 1 ? 'orden' : 'órdenes'}</p>
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

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f5f6] hover:bg-[#f5f5f6] border-0">
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-4 py-2"># Orden</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-4 py-2">Paciente</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-4 py-2">Sede</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-4 py-2">Estado</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-4 py-2 w-[90px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[#e5e5e9]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[#7d7d87] text-sm">
                      <FlaskConical className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No hay órdenes para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="border-b border-[#e5e5e9] hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => navigate(`/receptionist/lab-orders/${order.id}`)}
                    >
                      <TableCell className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-[#121215]">{order.order_number}</p>
                        <p className="text-[11px] text-[#7d7d87]">{formatDate(order.created_at)}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-[#7d7d87]">
                        {order.patient
                          ? `${order.patient.first_name} ${order.patient.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-[#7d7d87]">
                        Sede Principal
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
                            STATUS_BADGE_CLASS[order.status] ?? 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="flex items-center justify-center size-8 rounded-[6px] bg-[#f1edff] border border-[#8753ef]/30 text-[#8753ef] hover:opacity-80 transition-colors"
                          onClick={() => navigate(`/receptionist/lab-orders/${order.id}`)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {total > 0 && (
              <div className="bg-white border-t border-[#e5e5e9] px-5 h-[48px] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12px] text-[#7d7d87]">
                  <span>Mostrando</span>
                  <span className="bg-[#f1edff] px-1.5 py-0.5 rounded text-[#8753ef] font-semibold text-[12px]">
                    {fromItem}–{toItem}
                  </span>
                  <span>de {total} resultados</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-[#e5e5e9] bg-white text-[#7d7d87] hover:bg-[#f5f5f8] disabled:opacity-40 transition-colors"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {getPaginationPages(page, lastPage).map((p, idx) =>
                    p === '...' ? (
                      <span
                        key={`dot-${idx}`}
                        className="h-8 w-8 flex items-center justify-center text-[13px] text-[#7d7d87]"
                      >
                        ···
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={cn(
                          'h-8 w-8 flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-colors',
                          page === p
                            ? 'bg-[#121212] text-white'
                            : 'border border-[#e5e5e9] bg-white text-[#7d7d87] hover:bg-[#f5f5f8]',
                        )}
                        onClick={() => setPage(Number(p))}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-[#e5e5e9] bg-white text-[#7d7d87] hover:bg-[#f5f5f8] disabled:opacity-40 transition-colors"
                    disabled={page === lastPage}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default LabOrders;
