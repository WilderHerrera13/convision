import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Check, Download, Pencil, Stethoscope, X } from 'lucide-react';
import { laboratoryOrderService, LaboratoryOrder, LaboratoryOrderEvidence } from '@/services/laboratoryOrderService';
import { formatDate, formatDateTime12h } from '@/lib/utils';
import PageLayout from '@/components/layouts/PageLayout';
import LabOrderSidebar from './LabOrderSidebar';
import LabOrderTracker from '@/components/lab-orders/LabOrderTracker';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  received_from_lab: 'Recibido del lab.',
  in_quality: 'En calidad',
  quality_approved: 'Calidad aprobada',
  ready_for_delivery: 'Listo para entregar',
  portfolio: 'Cartera',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const getStatusVariant = (status: string): BadgeVariant => {
  if (status === 'pending') return 'warning';
  if (['in_process', 'in_progress', 'sent_to_lab', 'in_transit', 'received_from_lab'].includes(status)) return 'secondary';
  if (status === 'in_quality') return 'outline';
  if (['quality_approved', 'ready_for_delivery', 'delivered'].includes(status)) return 'success';
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

function resolveEvidenceUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

type EvidenceTransition = 'sent_to_lab' | 'received_from_lab' | 'returned_to_lab' | 'notify_client';

const STATUS_TO_EVIDENCE_TRANSITION: Partial<Record<string, EvidenceTransition>> = {
  sent_to_lab: 'sent_to_lab',
  in_transit: 'sent_to_lab',
  received_from_lab: 'received_from_lab',
  in_quality: 'received_from_lab',
  quality_approved: 'received_from_lab',
  returned_to_lab: 'returned_to_lab',
  ready_for_delivery: 'notify_client',
  portfolio: 'notify_client',
};

const STATES_WITH_DRAWER = new Set(['received_from_lab', 'in_quality', 'quality_approved', 'ready_for_delivery', 'portfolio']);

const STATE_DESCRIPTION: Record<string, string> = {
  pending: 'La orden está en espera de ser procesada.',
  in_process: 'La orden está siendo procesada en la óptica.',
  in_progress: 'La orden está siendo procesada en la óptica.',
  sent_to_lab: 'La orden fue enviada al laboratorio.',
  in_transit: 'La orden está en camino de regreso desde el laboratorio.',
  received_from_lab: 'Los lentes fueron recibidos del laboratorio y están almacenados en cajón.',
  returned_to_lab: 'La recepción fue inconformeEl pedido fue retornado al laboratorio para corrección.',
  in_quality: 'Los lentes están siendo revisados por el médico especialista asignado.',
  quality_approved: 'El médico especialista aprobó los lentes. Recibe y asigna cajón para entregar al cliente.',
  ready_for_delivery: 'La orden está lista para ser entregada al cliente.',
  portfolio: 'La orden está en cartera pendiente de cobro.',
  delivered: 'La orden fue entregada al cliente exitosamente.',
  cancelled: 'La orden fue cancelada.',
};

interface CurrentStateCardProps {
  order: LaboratoryOrder;
  onUpdate: () => void;
}

const CurrentStateCard: React.FC<CurrentStateCardProps> = ({ order, onUpdate }) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [evidence, setEvidence] = useState<LaboratoryOrderEvidence[] | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [editingDrawer, setEditingDrawer] = useState(false);
  const [drawerInput, setDrawerInput] = useState('');
  const [savingDrawer, setSavingDrawer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const latestEntry = [...(order.statusHistory ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((e) => e.status === order.status);

  const evidenceTransition = STATUS_TO_EVIDENCE_TRANSITION[order.status];
  const showDrawer = STATES_WITH_DRAWER.has(order.status);
  const description = STATE_DESCRIPTION[order.status] ?? '';

  useEffect(() => {
    if (!evidenceTransition) return;
    setLoadingEvidence(true);
    laboratoryOrderService
      .getLaboratoryOrderEvidence(order.id, evidenceTransition)
      .then(setEvidence)
      .catch(() => setEvidence([]))
      .finally(() => setLoadingEvidence(false));
  }, [order.id, evidenceTransition]);

  useEffect(() => {
    if (editingDrawer) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editingDrawer]);

  const handleStartEditDrawer = () => {
    setDrawerInput(order.drawer_number ?? '');
    setEditingDrawer(true);
  };

  const handleCancelEditDrawer = () => {
    setEditingDrawer(false);
    setDrawerInput('');
  };

  const handleSaveDrawer = async () => {
    const value = drawerInput.trim();
    if (!value) return;
    setSavingDrawer(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrder(order.id, { drawer_number: value });
      toast({ title: 'Cajón actualizado', description: `Cajón #${value} asignado correctamente.` });
      setEditingDrawer(false);
      onUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el cajón.', variant: 'destructive' });
    } finally {
      setSavingDrawer(false);
    }
  };

  const canEditDrawer =
    order.status === 'received_from_lab'
      ? true
      : isAdmin() && STATES_WITH_DRAWER.has(order.status);

  const isReturned = order.status === 'returned_to_lab';
  const borderColor = isReturned ? '#fecaca' : '#e5e5e9';
  const headerBg = isReturned ? '#fff5f5' : '#fafafa';

  return (
    <>
      <Card style={{ borderColor }}>
        <CardHeader className="pb-3" style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-[14px]">Estado actual</CardTitle>
              <p className="text-[12px] text-[#7d7d87] mt-0.5">{description}</p>
            </div>
            <Badge variant={getStatusVariant(order.status)}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className={`grid gap-3 ${showDrawer || latestEntry?.notes || order.status === 'in_quality' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {showDrawer && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide">Cajón de almacenamiento</span>
                  {canEditDrawer && !editingDrawer && (
                    <button
                      type="button"
                      className="text-[#7d7d87] hover:text-[#8753ef] transition-colors"
                      onClick={handleStartEditDrawer}
                      title="Editar cajón"
                    >
                      <Pencil className="size-3" />
                    </button>
                  )}
                </div>

                {editingDrawer ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      value={drawerInput}
                      onChange={(e) => setDrawerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDrawer();
                        if (e.key === 'Escape') handleCancelEditDrawer();
                      }}
                      placeholder="Ej: 3"
                      className="h-8 w-24 text-[13px]"
                      disabled={savingDrawer}
                    />
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 px-2 bg-[#8753ef] hover:bg-[#7040d0]"
                      onClick={handleSaveDrawer}
                      disabled={savingDrawer || !drawerInput.trim()}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={handleCancelEditDrawer}
                      disabled={savingDrawer}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : order.drawer_number ? (
                  <div className="inline-flex items-center gap-2 bg-[#f1edff] border border-[#d4c4ff] rounded-lg px-4 py-3 self-start">
                    <div className="size-8 rounded-md bg-[#8753ef] flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-[13px]">{order.drawer_number}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#121215]">Cajón #{order.drawer_number}</p>
                      <p className="text-[11px] text-[#7d7d87]">Ubicación física asignada</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-[13px] text-[#b4b5bc] italic">Sin cajón asignado</span>
                )}
              </div>
            )}

            {order.status === 'in_quality' ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide">Médico a cargo de la revisión</span>
                {latestEntry?.notes ? (
                  <div className="inline-flex items-center gap-3 bg-[#f0faf5] border border-[#a6d9bd] rounded-lg px-4 py-3 self-start">
                    <div className="size-8 rounded-full bg-[#0f8f64] flex items-center justify-center shrink-0">
                      <Stethoscope className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#121215]">
                        {latestEntry.notes.replace(/^Médico asignado:\s*/i, '')}
                      </p>
                      <p className="text-[11px] text-[#7d7d87]">Especialista asignado</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-[13px] text-[#b4b5bc] italic">Sin médico asignado</span>
                )}
              </div>
            ) : latestEntry?.notes ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide">
                  {order.status === 'returned_to_lab' ? 'Motivo de devolución' : 'Observaciones del estado'}
                </span>
                <p className="text-[13px] text-[#121215] leading-snug bg-[#f9f9fb] border border-[#e5e5e9] rounded-lg px-3 py-2.5">
                  {latestEntry.notes}
                </p>
              </div>
            ) : null}
          </div>

          {latestEntry && (
            <div className="flex items-center gap-3 text-[11px] text-[#7d7d87] border-t border-[#f0f0f2] pt-3">
              <span>
                Registrado el {formatDateTime12h(latestEntry.created_at)}
              </span>
              {latestEntry.user && (
                <>
                  <span className="size-1 rounded-full bg-[#d1d1d6] inline-block" />
                  <span>por {[latestEntry.user.name, latestEntry.user.last_name].filter(Boolean).join(' ')}</span>
                </>
              )}
            </div>
          )}

          {evidenceTransition && (
            <div className="border-t border-[#f0f0f2] pt-3">
              <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-2">
                Evidencias fotográficas
              </p>
              {loadingEvidence ? (
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-[#f0f0f2] animate-pulse" />
                  ))}
                </div>
              ) : evidence && evidence.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {evidence.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#e5e5e9] hover:border-[#8753ef] transition-colors group"
                      onClick={() => setLightboxUrl(resolveEvidenceUrl(ev.image_url))}
                    >
                      <img
                        src={resolveEvidenceUrl(ev.image_url)}
                        alt="Evidencia"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#b4b5bc] italic">Sin evidencias fotográficas para este estado</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="size-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Evidencia"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

const LabOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownloadPdf = async () => {
    if (!order?.id) return;
    try {
      const { pdf_token } = await laboratoryOrderService.getLaboratoryOrderPdfToken(order.id);
      const url = laboratoryOrderService.getLaboratoryOrderPdfUrl(order.id, pdf_token);
      window.open(url, '_blank');
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    }
  };

  const timeInProcess = order ? calcTimeInProcess(order.created_at) : '—';
  const relativeDelivery = order ? calcRelativeDelivery(order.estimated_completion_date) : '';
  const isUrgent = order?.priority === 'urgent';

  const topActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate('/receptionist/lab-orders')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      {order && (
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-1" /> Imprimir / PDF
        </Button>
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
        <div className="space-y-5 pb-28">
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
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[1px]">Tiempo en proceso</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[#121215] text-[22px] leading-[1]">{timeInProcess.split(' ')[0]}</span>
                {timeInProcess.includes(' ') && (
                  <span className="text-sm text-[#121215] font-medium">{timeInProcess.split(' ').slice(1).join(' ')}</span>
                )}
              </div>
              <span className="text-[11px] text-[#7d7d87]">desde envío al lab.</span>
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
              <CurrentStateCard order={order} onUpdate={fetchOrder} />

              <LabOrderTracker order={order} primaryColor="#8753ef" primaryBg="#f1edff" />

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
              <LabOrderSidebar order={order} onStatusUpdate={fetchOrder} />
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#e5e5e9] px-6 py-4 z-10">
        <p className="text-[12px] text-[#7d7d87]">
          Las acciones cambian el estado de la orden y quedan registradas en el historial.
        </p>
      </div>
    </PageLayout>
  );
};

export default LabOrderDetail;
