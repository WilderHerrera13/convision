import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDate, formatDateTime12h } from '@/lib/utils';
import PageLayout from '@/components/layouts/PageLayout';
import AdminLabOrderTracker from './AdminLabOrderTracker';
import AdminLabOrderSidebar from './AdminLabOrderSidebar';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  received_from_lab: 'Recibido del lab.',
  in_quality: 'En calidad',
  ready_for_delivery: 'Listo para entregar',
  portfolio: 'Cartera',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const getStatusVariant = (status: string): BadgeVariant => {
  if (status === 'pending') return 'warning';
  if (['in_process', 'in_progress', 'sent_to_lab', 'in_transit', 'received_from_lab'].includes(status)) return 'secondary';
  if (status === 'in_quality') return 'outline';
  if (['ready_for_delivery', 'delivered'].includes(status)) return 'success';
  if (['portfolio', 'cancelled'].includes(status)) return 'destructive';
  return 'default';
};

function calcTimeInProcess(createdAt: string): string {
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return '—';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  return `${totalHours}h`;
}

function calcRelativeDelivery(estimatedDate: string | null): string {
  if (!estimatedDate) return '';
  const target = new Date(estimatedDate);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'vencida';
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'en 1 día';
  return `en ${diffDays} días`;
}

function extractTime(dateStr: string): string {
  const parts = formatDateTime12h(dateStr).split(' ');
  return parts.slice(1).join(' ');
}

const LaboratoryOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) { setError('ID inválido'); setLoading(false); return; }
      const data = await laboratoryOrderService.getLaboratoryOrder(Number(id));
      setOrder(data);
    } catch {
      setError('No se pudo cargar la orden de laboratorio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleDownloadPdf = () => {
    if (!order?.id) return;
    window.open(`/print/lab-orders/${order.id}`, '_blank');
  };

  const openStatusModal = () => {
    if (!order) return;
    setNewStatus(order.status);
    setStatusNotes('');
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!order || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(order.id, {
        status: newStatus,
        notes: statusNotes,
      });
      toast({ title: 'Estado actualizado', description: 'El estado de la orden fue actualizado con éxito.' });
      setStatusModalOpen(false);
      fetchOrder();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const timeInProcess = order ? calcTimeInProcess(order.created_at) : '—';
  const relativeDelivery = order ? calcRelativeDelivery(order.estimated_completion_date) : '';
  const isUrgent = order?.priority === 'urgent';

  const topActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate('/admin/laboratory-orders')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      {order && (
        <>
          <Button variant="outline" size="sm" onClick={openStatusModal}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualizar estado
          </Button>
          <Button
            className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-9 px-4 text-[13px]"
            size="sm"
            onClick={handleDownloadPdf}
          >
            <Download className="h-4 w-4 mr-1" /> Descargar PDF
          </Button>
        </>
      )}
    </div>
  );

  return (
    <PageLayout
      title={order ? `Detalle de Orden ${order.order_number}` : 'Detalle de Orden'}
      subtitle="Órdenes de Laboratorio"
      actions={topActions}
    >
      {loading && <div className="py-16 text-center text-[#7d7d87]">Cargando...</div>}
      {error && <div className="py-16 text-center text-red-500">{error}</div>}
      {!loading && !error && order && (
        <div className="space-y-5 pb-6">
          <div className="bg-white border border-[#e5e5e9] rounded-xl px-6 py-5 flex flex-wrap items-center gap-0">
            <div className="flex-1 min-w-[200px] pr-6">
              <h2 className="text-[22px] font-bold text-[#121215]">{order.order_number}</h2>
              <p className="text-[12px] text-[#7d7d87] mt-1">
                Creada el {formatDate(order.created_at)} · {extractTime(order.created_at)}
                {order.createdBy && ` · por ${order.createdBy.name}`}
              </p>
            </div>

            <div className="w-px bg-[#e5e5e9] self-stretch mx-0 hidden sm:block" />

            <div className="flex flex-col gap-1 px-6">
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Estado actual</span>
              <Badge variant={getStatusVariant(order.status)}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>

            <div className="w-px bg-[#e5e5e9] self-stretch mx-0 hidden sm:block" />

            <div className="flex flex-col gap-0.5 px-6">
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Tiempo total</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[#121215] text-[22px] leading-[1]">{timeInProcess.split(' ')[0]}</span>
                {timeInProcess.includes(' ') && (
                  <span className="text-sm text-[#121215] font-medium">{timeInProcess.split(' ').slice(1).join(' ')}</span>
                )}
              </div>
              <span className="text-[11px] text-[#7d7d87]">desde la creación</span>
            </div>

            <div className="w-px bg-[#e5e5e9] self-stretch mx-0 hidden sm:block" />

            <div className="flex flex-col gap-0.5 px-6 flex-1">
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Entrega estimada</span>
              <span className="font-bold text-[#121215] text-base">
                {order.estimated_completion_date ? formatDate(order.estimated_completion_date) : '—'}
              </span>
              {relativeDelivery && (
                <span className="text-[11px] text-[#7d7d87]">{relativeDelivery}</span>
              )}
            </div>

            {isUrgent && (
              <div className="flex flex-col items-end gap-1 pl-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-500 inline-block" />
                  <span className="text-[13px] font-medium text-[#121215]">Urgente</span>
                </div>
                <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Prioridad</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
            <div className="space-y-5">
              <AdminLabOrderTracker order={order} primaryColor="#3a71f7" primaryBg="#eff1ff" />

              {order.order?.items && order.order.items.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[14px]">Ítems de la orden</CardTitle>
                        <p className="text-[12px] text-[#7d7d87] mt-0.5">
                          Productos asociados a esta orden de laboratorio
                        </p>
                      </div>
                      <span className="text-[11px] text-[#7d7d87] bg-[#f5f5f6] px-2.5 py-1 rounded-full">
                        {order.order.items.length} {order.order.items.length === 1 ? 'ítem' : 'ítems'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-5 text-[11px] uppercase tracking-wide text-[#7d7d87]">Descripción</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-[#7d7d87]">Marca</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-[#7d7d87]">Material</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wide text-[#7d7d87]">Tratamiento</TableHead>
                          <TableHead className="pr-5 text-[11px] uppercase tracking-wide text-[#7d7d87]">Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.order.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="pl-5 text-[13px]">{item.lens?.description || '—'}</TableCell>
                            <TableCell className="text-[13px]">{item.lens?.brand?.name || '—'}</TableCell>
                            <TableCell className="text-[13px]">{item.lens?.material?.name || '—'}</TableCell>
                            <TableCell className="text-[13px]">{item.lens?.treatment?.name || '—'}</TableCell>
                            <TableCell className="pr-5 text-[13px]">{item.lens?.lensType?.name || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="sticky top-4">
              <AdminLabOrderSidebar order={order} onStatusUpdate={fetchOrder} />
            </div>
          </div>
        </div>
      )}

      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado</DialogTitle>
            <DialogDescription>
              Cambia manualmente el estado de la orden {order?.order_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium">Estado</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_process">En proceso</SelectItem>
                  <SelectItem value="sent_to_lab">Enviado a laboratorio</SelectItem>
                  <SelectItem value="in_transit">En tránsito</SelectItem>
                  <SelectItem value="received_from_lab">Recibido del laboratorio</SelectItem>
                  <SelectItem value="in_quality">En calidad</SelectItem>
                  <SelectItem value="ready_for_delivery">Listo para entregar</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="portfolio">Cartera</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium">Notas</label>
              <Input
                placeholder="Observaciones del cambio de estado (opcional)"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)} disabled={updatingStatus}>
              Cancelar
            </Button>
            <Button
              className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white"
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default LaboratoryOrderDetail;
