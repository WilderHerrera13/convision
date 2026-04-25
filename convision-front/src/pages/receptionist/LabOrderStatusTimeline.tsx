import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDateTime12h } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'En laboratorio',
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
      <div className="flex gap-3 mb-3 pb-2 border-b border-[#f0f0f2]">
        <div className="w-2.5 shrink-0" />
        <div className="flex-1 grid grid-cols-[140px_1fr_1fr] gap-x-4">
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Fecha</p>
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Estado</p>
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Observación</p>
        </div>
      </div>
      {sorted.map((entry: HistoryEntry, index: number) => {
        const isLast = index === sorted.length - 1;
        return (
          <div key={`${entry.id ?? ''}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`size-2.5 rounded-full mt-1.5 shrink-0 ${
                  isLast ? 'bg-[#8753ef]' : 'bg-[#d1d1d6]'
                }`}
              />
              {!isLast && <div className="w-0.5 bg-[#e5e5e9] flex-1 my-1 min-h-[28px]" />}
            </div>

            <div className={`flex-1 grid grid-cols-[140px_1fr_1fr] gap-x-4 items-start ${isLast ? 'pb-0' : 'pb-5'}`}>
              <p className="text-xs text-[#7d7d87] leading-[1.6]">
                {formatDateTime12h(entry.created_at)}
              </p>
              <div>
                <Badge variant={getStatusVariant(entry.status)}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </Badge>
              </div>
              <div>
                {entry.notes && (
                  <p className="text-sm text-[#0f0f12] leading-[1.5]">{entry.notes}</p>
                )}
                <p className="text-xs text-[#7d7d87] mt-0.5">
                  {entry.user
                    ? [entry.user.name, entry.user.last_name].filter(Boolean).join(' ')
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LabOrderStatusTimeline;
