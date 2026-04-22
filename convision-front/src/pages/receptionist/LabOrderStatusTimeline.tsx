import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDateTime12h } from '@/lib/utils';

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

type HistoryEntry = NonNullable<LaboratoryOrder['statusHistory']>[number];

interface LabOrderStatusTimelineProps {
  history: NonNullable<LaboratoryOrder['statusHistory']>;
}

const LabOrderStatusTimeline: React.FC<LabOrderStatusTimelineProps> = ({ history }) => {
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex flex-col">
      {sorted.map((entry: HistoryEntry, index: number) => {
        const isLast = index === sorted.length - 1;
        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`size-3 rounded-full mt-1 shrink-0 ${
                  isLast ? 'bg-[#8753ef]' : 'bg-gray-300'
                }`}
              />
              {!isLast && <div className="w-0.5 bg-gray-200 flex-1 my-1 min-h-[20px]" />}
            </div>
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
              <p className="text-xs text-muted-foreground">{formatDateTime12h(entry.created_at)}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusVariant(entry.status)}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </Badge>
              </div>
              {entry.notes && (
                <p className="text-sm text-[#0f0f12] mt-1">{entry.notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{entry.user?.name || '—'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LabOrderStatusTimeline;
