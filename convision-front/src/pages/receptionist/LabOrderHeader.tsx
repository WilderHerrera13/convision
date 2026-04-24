import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDate, formatDateTime12h } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  in_quality: 'En calidad',
  ready_for_delivery: 'Listo para entrega',
  portfolio: 'Cartera',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const getStatusVariant = (status: string): BadgeVariant => {
  if (status === 'pending') return 'warning';
  if (['in_process', 'in_progress', 'sent_to_lab', 'in_transit'].includes(status)) return 'secondary';
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
  return `${hours}h`;
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

interface LabOrderHeaderProps {
  order: LaboratoryOrder;
}

const LabOrderHeader: React.FC<LabOrderHeaderProps> = ({ order }) => {
  const timeInProcess = calcTimeInProcess(order.created_at);
  const relativeDelivery = calcRelativeDelivery(order.estimated_completion_date);
  const isUrgent = order.priority === 'urgent';

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 flex flex-wrap items-start gap-x-8 gap-y-4">
      <div className="flex-1 min-w-[220px]">
        <h2 className="text-xl font-bold text-[#0f0f12]">{order.order_number}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Creada el {formatDate(order.created_at)} · {extractTime(order.created_at)} · por {order.createdBy?.name || '—'}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Estado actual</span>
        <Badge variant={getStatusVariant(order.status)}>
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Tiempo en proceso</span>
        <span className="font-bold text-[#0f0f12] text-sm">{timeInProcess}</span>
        <span className="text-xs text-muted-foreground">desde envío al lab.</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Entrega estimada</span>
        <span className="font-bold text-[#0f0f12] text-sm">
          {order.estimated_completion_date ? formatDate(order.estimated_completion_date) : '—'}
        </span>
        {relativeDelivery && (
          <span className="text-xs text-muted-foreground">{relativeDelivery}</span>
        )}
      </div>

      {isUrgent && (
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Prioridad</span>
          <Badge variant="destructive">Urgente</Badge>
        </div>
      )}
    </div>
  );
};

export default LabOrderHeader;
