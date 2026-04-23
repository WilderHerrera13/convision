import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, RefreshCw, Download, Check, X } from 'lucide-react';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LAB_ORDER_MAIN_FLOW,
  LAB_ORDER_PRIORITY_LABELS,
  LAB_ORDER_PRIORITY_TOKENS,
  LAB_ORDER_STATUS_LABELS,
  LAB_ORDER_STATUS_TOKENS,
  LabOrderPriority,
  LabOrderStatus,
} from '@/constants/laboratoryOrderStatus';

const ACTION_CONFIG: Record<string, { title: string; desc: string; btnLabel: string; nextStatus?: LabOrderStatus }> = {
  pending: {
    title: 'Enviar al laboratorio',
    desc: 'Revisa los datos de la orden y envíala al laboratorio externo para iniciar el proceso de fabricación.',
    btnLabel: 'Enviar a laboratorio',
    nextStatus: 'sent_to_lab',
  },
  in_process: {
    title: 'Despachar al laboratorio externo',
    desc: 'Empaca el producto y entrega la guía al mensajero. Registra el envío cuando salga.',
    btnLabel: 'Registrar envío',
    nextStatus: 'sent_to_lab',
  },
  in_progress: {
    title: 'Despachar al laboratorio externo',
    desc: 'Empaca el producto y entrega la guía al mensajero. Registra el envío cuando salga.',
    btnLabel: 'Registrar envío',
    nextStatus: 'sent_to_lab',
  },
  sent_to_lab: {
    title: 'Esperando producto desde laboratorio',
    desc: 'El laboratorio está fabricando. Marca como recibido cuando llegue el producto a la sede.',
    btnLabel: 'Confirmar recepción en sede',
    nextStatus: 'in_transit',
  },
  in_transit: {
    title: 'Producto en tránsito hacia la sede',
    desc: 'El producto fue enviado por el laboratorio. Confirma cuando lo hayas recibido físicamente en la sede.',
    btnLabel: 'Confirmar llegada a sede',
    nextStatus: 'received_from_lab',
  },
  received_from_lab: {
    title: 'Producto recibido — Enviar a calidad',
    desc: 'El producto llegó a la sede. Envíalo al especialista para la revisión de calidad antes de entregarlo al paciente.',
    btnLabel: 'Enviar a control de calidad',
    nextStatus: 'in_quality',
  },
  in_quality: {
    title: 'En revisión de calidad',
    desc: 'El especialista está revisando el producto. Esta etapa la completa el especialista desde su vista de órdenes de laboratorio.',
    btnLabel: 'Esperando al especialista',
  },
  ready_for_delivery: {
    title: 'Coordinar entrega al paciente',
    desc: 'La orden está lista en el laboratorio. Marca como entregada cuando el paciente confirme la recepción.',
    btnLabel: 'Marcar como entregada',
    nextStatus: 'delivered',
  },
  delivered: {
    title: 'Orden entregada al paciente',
    desc: 'La entrega fue confirmada y firmada. No hay acciones pendientes para esta orden.',
    btnLabel: 'Descargar comprobante',
  },
  cancelled: {
    title: 'Orden cancelada',
    desc: 'La orden fue cancelada. Revisa el motivo en el histórico de seguimiento.',
    btnLabel: 'Ver motivo de cancelación',
  },
};

function formatElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins}min`;
}

function formatDatetime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  return {
    date: format(d, 'dd/MM/yyyy', { locale: es }),
    time: format(d, 'hh:mm a', { locale: es }),
  };
}

interface OrderHeaderStripProps {
  order: LaboratoryOrder;
}

function OrderHeaderStrip({ order }: OrderHeaderStripProps) {
  const created = formatDatetime(order.created_at);
  const creatorName = order.createdBy?.name ?? '—';
  const statusToken = LAB_ORDER_STATUS_TOKENS[order.status as LabOrderStatus] ?? { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' };
  const statusLabel = LAB_ORDER_STATUS_LABELS[order.status as LabOrderStatus] ?? order.status;
  const priorityToken = LAB_ORDER_PRIORITY_TOKENS[order.priority as LabOrderPriority] ?? { bg: '#f1f2f6', text: '#5d5d67', dot: '#5d5d67' };
  const priorityLabel = LAB_ORDER_PRIORITY_LABELS[order.priority as LabOrderPriority] ?? order.priority;

  return (
    <div className="bg-white border border-[#ebebee] rounded-[10px] flex items-stretch overflow-hidden">
      <div className="px-6 py-5 w-[300px] shrink-0">
        <p className="text-[22px] font-semibold text-[#0f0f12] leading-tight">{order.order_number}</p>
        <p className="text-[12px] text-[#7d7d87] mt-2 leading-snug">
          Creada el {created.date} · {created.time} · por {creatorName}
        </p>
      </div>
      <div className="w-px bg-[#ebebee] my-5 shrink-0" />
      <div className="px-6 py-5 w-[180px] shrink-0">
        <p className="text-[10px] font-semibold text-[#7d7d87] tracking-[0.8px] uppercase">ESTADO ACTUAL</p>
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px]" style={{ backgroundColor: statusToken.bg }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: statusToken.dot }} />
          <span className="text-[12px] font-semibold" style={{ color: statusToken.text }}>{statusLabel}</span>
        </div>
      </div>
      <div className="w-px bg-[#ebebee] my-5 shrink-0" />
      <div className="px-6 py-5 flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-[#7d7d87] tracking-[0.8px] uppercase">TIEMPO TOTAL</p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <p className="text-[18px] font-semibold text-[#0f0f12] whitespace-nowrap">{formatElapsed(order.created_at)}</p>
          <p className="text-[11px] text-[#7d7d87] whitespace-nowrap">desde la creación</p>
        </div>
      </div>
      <div className="w-px bg-[#ebebee] my-5 shrink-0" />
      <div className="px-6 py-5 flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-[#7d7d87] tracking-[0.8px] uppercase">ENTREGA ESTIMADA</p>
        {order.estimated_completion_date ? (
          <>
            <p className="text-[16px] font-semibold text-[#0f0f12] mt-2 whitespace-nowrap">{formatDate(order.estimated_completion_date)}</p>
            <p className="text-[11px] text-[#7d7d87] mt-0.5 whitespace-nowrap">en {daysUntil(order.estimated_completion_date)} días</p>
          </>
        ) : (
          <p className="text-[16px] text-[#7d7d87] mt-2">—</p>
        )}
      </div>
      <div className="px-6 py-5 flex flex-col items-end justify-center gap-2 w-[130px] shrink-0">
        <p className="text-[10px] font-semibold text-[#7d7d87] tracking-[0.8px] uppercase">PRIORIDAD</p>
        <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: priorityToken.bg }}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: priorityToken.dot }} />
          <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: priorityToken.text }}>{priorityLabel}</span>
        </div>
      </div>
    </div>
  );
}

interface OrderTimelineProps {
  order: LaboratoryOrder;
  timelineRef: React.RefObject<HTMLDivElement>;
}

function OrderTimeline({ order, timelineRef }: OrderTimelineProps) {
  const history = order.statusHistory ?? [];
  const status = order.status as LabOrderStatus;
  const isCancelled = status === 'cancelled';
  const stepIndex = isCancelled ? -1 : LAB_ORDER_MAIN_FLOW.indexOf(status);
  const completedSteps = stepIndex === -1 ? 0 : stepIndex;
  const totalSteps = LAB_ORDER_MAIN_FLOW.length;
  const isDelivered = status === 'delivered';
  const progressPercent = isDelivered ? 100 : isCancelled ? Math.max(10, (history.length / totalSteps) * 100) : (completedSteps / (totalSteps - 1)) * 100;

  let stepLabel: string;
  if (isCancelled) {
    stepLabel = `Cancelada en etapa ${history.length || 1}`;
  } else if (isDelivered) {
    stepLabel = `${totalSteps} de ${totalSteps} etapas completadas`;
  } else {
    stepLabel = `${Math.max(1, completedSteps + 1)} de ${totalSteps} etapas en curso`;
  }

  return (
    <div ref={timelineRef} className="bg-white border border-[#ebebee] rounded-[10px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0f0f12]">Seguimiento de la orden</h2>
          <p className="text-[12px] text-[#7d7d87] mt-1">
            Trazabilidad de cada estado por el que ha pasado y el tiempo que lleva en cada uno
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-[5px] rounded-[6px] text-[11px] font-semibold whitespace-nowrap shrink-0',
            isCancelled ? 'bg-[#ffeeed] text-[#b82626]' : 'bg-[#f5f5f6] text-[#7d7d87]',
          )}
        >
          {stepLabel}
        </span>
      </div>

      <div className="mt-5 mb-4 h-px bg-[#f0f0f2]" />

      <div className="relative h-1 bg-[#f0f0f2] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progressPercent}%`, backgroundColor: isCancelled ? '#b82626' : '#0f8f64' }}
        />
      </div>

      <div className="relative mt-8 ml-3">
        {history.map((entry, idx) => {
          const entryStatus = entry.status as LabOrderStatus;
          const isLast = idx === history.length - 1;
          const isTerminalDelivered = entryStatus === 'delivered';
          const isTerminalCancelled = entryStatus === 'cancelled';
          const isCurrent = isLast && !isTerminalDelivered && !isTerminalCancelled;
          const durationMs = isLast
            ? Date.now() - new Date(entry.created_at).getTime()
            : new Date(history[idx + 1].created_at).getTime() - new Date(entry.created_at).getTime();
          const dt = formatDatetime(entry.created_at);
          const token = LAB_ORDER_STATUS_TOKENS[entryStatus] ?? { bg: '#f5f5f6', text: '#7d7d87', dot: '#7d7d87' };
          const label = LAB_ORDER_STATUS_LABELS[entryStatus] ?? entry.status;

          let rightLabel = '';
          let rightChipBg = '#f5f5f6';
          let rightChipText = '#7d7d87';
          let rightChipDot = '#7d7d87';
          let rightChipBorder: string | undefined;
          if (isLast) {
            if (isTerminalDelivered) {
              rightLabel = 'Completada · hoy';
              rightChipBg = 'white';
              rightChipText = '#0f8f64';
              rightChipDot = '#0f8f64';
              rightChipBorder = '#a3d9b8';
            } else if (isTerminalCancelled) {
              rightLabel = 'Cancelada aquí';
              rightChipBg = '#ffeeed';
              rightChipText = '#b82626';
              rightChipDot = '#b82626';
            } else {
              rightLabel = 'Etapa actual';
              rightChipBg = '#eff1ff';
              rightChipText = '#3a71f7';
              rightChipDot = '#3a71f7';
            }
          } else {
            rightLabel = `${formatDuration(durationMs)} en este estado`;
          }

          let icon: React.ReactNode;
          if (isTerminalCancelled) {
            icon = (
              <span className="size-5 rounded-full bg-[#ffeeed] border-2 border-[#b82626] flex items-center justify-center">
                <X className="size-3 text-[#b82626]" strokeWidth={3} />
              </span>
            );
          } else if (isCurrent) {
            icon = (
              <span className="size-5 rounded-full bg-white border-2 border-[#3a71f7] flex items-center justify-center">
                <span className="size-2 rounded-full bg-[#3a71f7]" />
              </span>
            );
          } else {
            icon = (
              <span className="size-5 rounded-full bg-[#0f8f64] flex items-center justify-center">
                <Check className="size-3 text-white" strokeWidth={3} />
              </span>
            );
          }

          const isHighlighted = isCurrent;
          const connectorColor = (isTerminalCancelled || isCancelled)
            ? '#e5e5e9'
            : (!isLast ? '#0f8f64' : '#e5e5e9');

          return (
            <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[9px] top-6 bottom-0 w-[2px] opacity-40"
                  style={{ backgroundColor: connectorColor }}
                />
              )}
              <div className="shrink-0 z-10 mt-0.5">{icon}</div>
              <div
                className={cn(
                  'flex-1 min-w-0 rounded-[8px]',
                  isHighlighted && 'border border-[#3a71f7] bg-[#eff1ff] px-3 py-3',
                )}
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: token.bg }}
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: token.dot }} />
                    <span className="text-[11px] font-semibold" style={{ color: token.text }}>{label}</span>
                  </span>
                  <span className="text-[12px] text-[#7d7d87] font-medium">{dt.date} · {dt.time}</span>
                  <span
                    className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold"
                    style={{
                      backgroundColor: rightChipBg,
                      color: rightChipText,
                      border: rightChipBorder ? `1px solid ${rightChipBorder}` : undefined,
                    }}
                  >
                    <span className="size-[11px] rounded-full shrink-0" style={{ backgroundColor: rightChipDot }} />
                    {rightLabel}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-[13px] font-semibold text-[#0f0f12] mt-2">{entry.notes}</p>
                )}
                {entry.user?.name && (
                  <p className="text-[12px] text-[#7d7d87] mt-1">{entry.user.name}</p>
                )}
              </div>
            </div>
          );
        })}

        {!isCancelled && !isDelivered && stepIndex < totalSteps - 1 && (
          <PendingFutureSteps history={history} currentStatus={status} order={order} />
        )}
      </div>
    </div>
  );
}

function PendingFutureSteps({ history, currentStatus, order }: { history: NonNullable<LaboratoryOrder['statusHistory']>; currentStatus: LabOrderStatus; order: LaboratoryOrder }) {
  const visited = new Set(history.map((h) => h.status));
  const remaining = LAB_ORDER_MAIN_FLOW.slice(LAB_ORDER_MAIN_FLOW.indexOf(currentStatus) + 1);
  const future = remaining.filter((s) => !visited.has(s));

  if (future.length === 0) return null;

  const estimatedDate = order.estimated_completion_date
    ? format(new Date(order.estimated_completion_date), 'dd/MM/yyyy', { locale: es })
    : null;

  return (
    <>
      {future.map((step, idx) => {
        const token = LAB_ORDER_STATUS_TOKENS[step];
        const label = LAB_ORDER_STATUS_LABELS[step];
        const isLastFuture = idx === future.length - 1 && step === 'delivered';
        return (
          <div key={step} className="relative flex gap-4 pb-6 last:pb-0 opacity-45">
            {idx < future.length - 1 && (
              <span className="absolute left-[9px] top-6 bottom-0 w-[2px] bg-[#e5e5e9]" />
            )}
            <div className="shrink-0 z-10 mt-0.5">
              <span className="size-5 rounded-full border-2 border-[#e5e5e9] bg-white flex items-center justify-center" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 bg-[#f5f5f6]">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: token.dot }} />
                  <span className="text-[11px] font-semibold text-[#7d7d87]">{label}</span>
                </span>
                {isLastFuture && estimatedDate ? (
                  <span className="text-[12px] text-[#7d7d87] font-medium">Estimado {estimatedDate}</span>
                ) : (
                  <span className="text-[12px] text-[#7d7d87]">Pendiente</span>
                )}
              </div>
              {isLastFuture && (
                <p className="text-[13px] text-[#7d7d87] mt-2">
                  Pendiente: confirmar entrega al paciente y firmar recibo.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

interface OrderItemsCardProps {
  order: LaboratoryOrder;
}

function OrderItemsCard({ order }: OrderItemsCardProps) {
  const items = order.order?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="bg-white border border-[#ebebee] rounded-[10px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0f0f12]">Ítems de la orden</h2>
          <p className="text-[12px] text-[#7d7d87] mt-1">Productos asociados a esta orden de laboratorio</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f5f5f6] text-[#7d7d87]">
          {items.length} ítems
        </span>
      </div>
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#f0f0f2] hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                Descripción
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                Marca
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                Material
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                Tratamiento
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7d7d87] tracking-wider uppercase">
                Tipo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id} className="border-b border-[#f5f5f6] last:border-0 hover:bg-[#fafafa]">
                <TableCell className="text-[13px] font-semibold text-[#0f0f12]">
                  {it.lens?.description ?? '—'}
                </TableCell>
                <TableCell className="text-[13px] text-[#7d7d87]">{it.lens?.brand?.name ?? '—'}</TableCell>
                <TableCell className="text-[13px] text-[#7d7d87]">{it.lens?.material?.name ?? '—'}</TableCell>
                <TableCell className="text-[13px] text-[#7d7d87]">{it.lens?.treatment?.name ?? '—'}</TableCell>
                <TableCell className="text-[13px] text-[#7d7d87]">{it.lens?.lensType?.name ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface OrderActionPanelProps {
  order: LaboratoryOrder;
  onStatusUpdated: () => void;
  timelineRef: React.RefObject<HTMLDivElement>;
}

function OrderActionPanel({ order, onStatusUpdated, timelineRef }: OrderActionPanelProps) {
  const [updating, setUpdating] = useState(false);
  const config = ACTION_CONFIG[order.status] ?? ACTION_CONFIG['pending'];
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
  const created = formatDatetime(order.created_at);

  const handleAction = async () => {
    if (order.status === 'cancelled') {
      timelineRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (order.status === 'delivered') {
      if (order.pdf_token) {
        const url = laboratoryOrderService.getLaboratoryOrderPdfUrl(order.id, order.pdf_token);
        window.open(url, '_blank');
      } else {
        toast({ title: 'Sin comprobante', description: 'No hay comprobante disponible para esta orden.', variant: 'destructive' });
      }
      return;
    }
    if (!config.nextStatus) {
      toast({ title: 'Sin acción disponible', description: 'Esta etapa la gestiona el especialista desde su panel.' });
      return;
    }
    setUpdating(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(order.id, { status: config.nextStatus, notes: '' });
      toast({ title: 'Estado actualizado', description: `La orden pasó a "${LAB_ORDER_STATUS_LABELS[config.nextStatus]}"` });
      onStatusUpdated();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#ebebee] rounded-[10px] p-5">
        <p className="text-[10px] font-semibold text-[#7d7d87] tracking-[0.8px] uppercase">
          {isTerminal ? 'ESTADO FINAL' : 'PRÓXIMA ACCIÓN'}
        </p>
        <p className="text-[15px] font-semibold text-[#0f0f12] mt-2">{config.title}</p>
        <p className="text-[12px] text-[#7d7d87] mt-1.5 leading-relaxed">{config.desc}</p>
        <Button
          className="w-full mt-4 h-10 bg-[#3a71f7] hover:bg-[#2558d4] text-white text-[13px] font-semibold rounded-md disabled:opacity-60"
          onClick={handleAction}
          disabled={updating || order.status === 'in_quality'}
        >
          {config.btnLabel}
        </Button>
      </div>

      <div className="bg-white border border-[#ebebee] rounded-[10px] p-5">
        <h3 className="text-[14px] font-semibold text-[#0f0f12]">Resumen</h3>
        <p className="text-[11px] text-[#7d7d87] mt-1">Datos generales de la orden</p>
        <div className="h-px bg-[#f0f0f2] my-4" />
        <div className="space-y-3.5">
          <div>
            <p className="text-[11px] text-[#7d7d87]">Paciente</p>
            <p className="text-[13px] font-semibold text-[#0f0f12] mt-0.5">
              {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#7d7d87]">Laboratorio</p>
            <p className="text-[13px] font-semibold text-[#0f0f12] mt-0.5">{order.laboratory?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#7d7d87]">Fecha de creación</p>
            <p className="text-[13px] font-semibold text-[#0f0f12] mt-0.5">{created.date} · {created.time}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#7d7d87]">Sede</p>
            <p className="text-[13px] font-semibold text-[#0f0f12] mt-0.5">Sede Principal</p>
          </div>
        </div>
      </div>

      {order.laboratory && (
        <div className="bg-white border border-[#ebebee] rounded-[10px] p-5">
          <h3 className="text-[14px] font-semibold text-[#0f0f12]">Contacto del laboratorio</h3>
          <div className="mt-3">
            <p className="text-[13px] font-semibold text-[#0f0f12]">{order.laboratory.contact_person || '—'}</p>
            <p className="text-[11px] text-[#7d7d87] mt-0.5">Responsable · {order.laboratory.name}</p>
          </div>
          <div className="h-px bg-[#f0f0f2] my-4" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[#7d7d87]">Teléfono</p>
              <p className="text-[12px] font-semibold text-[#0f0f12] mt-0.5">{order.laboratory.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#7d7d87]">Correo</p>
              <p className="text-[12px] font-semibold text-[#0f0f12] mt-0.5 break-all">{order.laboratory.email || '—'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#eff1ff] border border-[#3a71f7] rounded-[10px] p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="size-2 rotate-45 bg-[#3a71f7]" />
          <p className="text-[13px] font-semibold text-[#3a71f7]">Trazabilidad completa</p>
        </div>
        <p className="text-[12px] text-[#3a71f7] leading-relaxed">
          Cada cambio de estado queda registrado con responsable, fecha y duración. Útil para auditoría y SLA.
        </p>
      </div>
    </div>
  );
}

interface StatusUpdateModalProps {
  open: boolean;
  orderNumber: string;
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
}

function StatusUpdateModal({ open, orderNumber, orderId, onClose, onUpdated }: StatusUpdateModalProps) {
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(orderId, { status: newStatus, notes: statusNotes });
      toast({ title: 'Estado actualizado', description: `La orden pasó a "${LAB_ORDER_STATUS_LABELS[newStatus as LabOrderStatus] ?? newStatus}"` });
      onUpdated();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Actualizar estado</DialogTitle>
          <DialogDescription>Cambiar el estado de la orden {orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Estado</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LAB_ORDER_STATUS_LABELS) as LabOrderStatus[]).map((val) => (
                  <SelectItem key={val} value={val}>{LAB_ORDER_STATUS_LABELS[val]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Input
              placeholder="Notas opcionales..."
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!newStatus || saving}
            className="bg-[#3a71f7] hover:bg-[#2558d4] text-white"
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const LaboratoryOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await laboratoryOrderService.getLaboratoryOrder(Number(id));
      setOrder(data);
    } catch {
      setError('No se pudo cargar la orden de laboratorio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleDownloadPdf = () => {
    if (!order?.id || !order?.pdf_token) return;
    const url = laboratoryOrderService.getLaboratoryOrderPdfUrl(order.id, order.pdf_token);
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="p-6 text-sm text-[#7d7d87]">Cargando orden...</div>;
  }

  if (error || !order) {
    return <div className="p-6 text-sm text-[#b82626]">{error ?? 'Orden no encontrada'}</div>;
  }

  return (
    <div className="bg-[#f5f5f6] min-h-full">
      <div className="bg-white border-b border-[#ebebee] px-6 h-[60px] flex items-center shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#7d7d87] whitespace-nowrap">
            <span>Administración</span>
            <span className="mx-1 text-[#d1d1d8]">/</span>
            <button
              type="button"
              onClick={() => navigate('/admin/laboratory-orders')}
              className="hover:text-[#3a71f7] hover:underline transition-colors"
            >
              Órdenes de Laboratorio
            </button>
            <span className="mx-1 text-[#d1d1d8]">/</span>
            <span className="text-[#0f0f12] font-semibold">{order.order_number}</span>
          </p>
          <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-tight mt-0.5">
            Detalle de Orden {order.order_number}
          </h1>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/laboratory-orders')}
            className="h-9 px-3.5 text-[13px] font-semibold border-[#e5e5e9] text-[#0f0f12] bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-9 px-3.5 text-[13px] font-semibold border-[#e5e5e9] text-[#0f0f12] bg-white"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar estado
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!order.pdf_token}
            className={cn(
              'h-9 px-3.5 text-white text-[13px] font-semibold',
              order.pdf_token
                ? 'bg-[#3a71f7] hover:bg-[#2558d4]'
                : 'bg-[#3a71f7]/40 cursor-not-allowed opacity-50',
            )}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Descargar PDF
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <OrderHeaderStrip order={order} />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_368px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <OrderTimeline order={order} timelineRef={timelineRef as React.RefObject<HTMLDivElement>} />
            <OrderItemsCard order={order} />
          </div>
          <div>
            <OrderActionPanel
              order={order}
              onStatusUpdated={fetchOrder}
              timelineRef={timelineRef as React.RefObject<HTMLDivElement>}
            />
          </div>
        </div>
      </div>

      <StatusUpdateModal
        open={modalOpen}
        orderNumber={order.order_number}
        orderId={order.id}
        onClose={() => setModalOpen(false)}
        onUpdated={fetchOrder}
      />
    </div>
  );
};

export default LaboratoryOrderDetail;
