import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDateTime12h } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-[#fff6e3] text-[#b57218]',
  in_process: 'bg-[#eff1ff] text-[#3a71f7]',
  in_progress: 'bg-[#eff1ff] text-[#3a71f7]',
  sent_to_lab: 'bg-[#eff1ff] text-[#3a71f7]',
  in_transit: 'bg-[#e8f4f8] text-[#0e7490]',
  received_from_lab: 'bg-[#e8f4f8] text-[#0e7490]',
  in_quality: 'bg-[#eef2ff] text-[#4338ca]',
  ready_for_delivery: 'bg-[#ebf5ef] text-[#228b52]',
  portfolio: 'bg-[#fff0f0] text-[#b82626]',
  delivered: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
};

const WORKFLOW_STEPS = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'in_process', label: 'En proceso' },
  { key: 'sent_to_lab', label: 'Enviado a laboratorio' },
  { key: 'ready_for_delivery', label: 'Listo para entregar' },
  { key: 'delivered', label: 'Entregada' },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    in_process: 1,
    in_progress: 1,
    sent_to_lab: 2,
    in_transit: 2,
    received_from_lab: 2,
    in_quality: 2,
    ready_for_delivery: 3,
    portfolio: 3,
    delivered: 4,
    cancelled: -1,
  };
  return map[status] ?? 0;
}

function calcTimeInState(start: string, end: string | null): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return '—';
  const totalMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${String(remHours).padStart(2, '0')}h`;
  }
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}min`;
  return `${totalMins}min`;
}

type HistoryEntry = NonNullable<LaboratoryOrder['statusHistory']>[number];

export interface LabOrderTrackerProps {
  order: LaboratoryOrder;
  primaryColor: string;
  primaryBg: string;
}

const LabOrderTracker: React.FC<LabOrderTrackerProps> = ({ order, primaryColor, primaryBg }) => {
  const currentStepIndex = order.status === 'cancelled' ? -1 : getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const totalSteps = WORKFLOW_STEPS.length;
  const progressPercent = isCancelled
    ? 0
    : Math.min(100, ((currentStepIndex + 1) / totalSteps) * 100);

  const history: HistoryEntry[] = [...(order.statusHistory ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const completedCount = isCancelled
    ? history.filter((h) => h.status !== 'cancelled').length
    : currentStepIndex + 1;

  const subtitle = isCancelled
    ? `Cancelada en etapa ${completedCount}`
    : `${completedCount} de ${totalSteps} etapas ${currentStepIndex >= totalSteps - 1 ? 'completadas' : 'en curso'}`;

  return (
    <div className="bg-white rounded-xl border border-[#e5e5e9] overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[#121215]">Seguimiento de la orden</h3>
          <p className="text-[12px] text-[#7d7d87] mt-0.5">
            Trazabilidad de cada estado por el que ha pasado y el tiempo que lleva en cada uno
          </p>
        </div>
        <span
          className={cn('text-[11px] font-medium px-2.5 py-1 rounded-full', isCancelled ? 'bg-red-50 text-red-600' : '')}
          style={!isCancelled ? { backgroundColor: primaryBg, color: primaryColor } : undefined}
        >
          {subtitle}
        </span>
      </div>

      <div className="px-5 pb-4">
        <div className="h-2 bg-[#f0f0f2] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, backgroundColor: isCancelled ? '#f87171' : primaryColor }}
          />
        </div>
      </div>

      <div className="px-5 pb-5 space-y-0">
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          const isCancelledStep = entry.status === 'cancelled';
          const nextEntry = history[index + 1] ?? null;
          const timeInState = calcTimeInState(entry.created_at, nextEntry?.created_at ?? null);
          const isActive = isLast && !isCancelledStep;

          return (
            <div key={`${entry.id ?? ''}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0 w-5">
                <div className="mt-1 shrink-0">
                  {isCancelledStep ? (
                    <div className="size-5 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-500 text-[10px] font-bold">✕</span>
                    </div>
                  ) : isActive ? (
                    <div
                      className="size-5 rounded-full border-2 bg-white flex items-center justify-center"
                      style={{ borderColor: primaryColor }}
                    >
                      <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    </div>
                  ) : (
                    <CheckCircle2 className="size-5 text-[#228b52]" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn('w-0.5 flex-1 my-1 min-h-[32px]', isCancelledStep ? 'bg-red-200' : 'bg-[#e5e5e9]')}
                  />
                )}
              </div>

              <div
                className="flex-1 rounded-lg px-4 py-3 mb-2"
                style={
                  isActive && !isCancelledStep
                    ? { border: `1px solid ${primaryColor}20`, backgroundColor: `${primaryBg}60` }
                    : { border: '1px solid transparent' }
                }
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        STATUS_BADGE_CLASS[entry.status] ?? 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    <span className="text-[11px] text-[#7d7d87]">
                      {formatDateTime12h(entry.created_at)}
                    </span>
                    {isActive && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: primaryColor, backgroundColor: primaryBg }}
                      >
                        Etapa actual
                      </span>
                    )}
                    {isCancelledStep && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        Cancelada aquí
                      </span>
                    )}
                  </div>
                  {!isActive && timeInState !== '—' && (
                    <span className="text-[11px] text-[#7d7d87] flex items-center gap-1">
                      <Circle className="size-2 fill-current" />
                      {timeInState} en este estado
                    </span>
                  )}
                </div>

                {entry.notes && (
                  <p className="text-[13px] text-[#121215] font-medium mt-1.5 leading-snug">{entry.notes}</p>
                )}
                <p className="text-[11px] text-[#7d7d87] mt-0.5">
                  {entry.user
                    ? [entry.user.name, entry.user.last_name].filter(Boolean).join(' ')
                    : '—'}
                </p>
              </div>
            </div>
          );
        })}

        {!isCancelled && currentStepIndex < WORKFLOW_STEPS.length - 1 && (
          <>
            {WORKFLOW_STEPS.slice(currentStepIndex + 1).map((step, i, arr) => {
              const isFinalStep = step.key === 'delivered';
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0 w-5">
                    <Circle className="mt-1 size-5 text-[#d1d1d6]" />
                    {i < arr.length - 1 && <div className="w-0.5 bg-[#e5e5e9] flex-1 my-1 min-h-[32px]" />}
                  </div>
                  <div className="flex-1 border border-transparent px-4 py-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400">
                        {step.label}
                      </span>
                      {isFinalStep && order.estimated_completion_date && (
                        <span className="text-[11px] text-[#7d7d87]">
                          Estimado{' '}
                          {new Date(order.estimated_completion_date).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#b4b5bc] mt-1">Pendiente de completar</p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default LabOrderTracker;
