import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, X } from 'lucide-react';
import { LaboratoryOrder, LaboratoryOrderEvidence, laboratoryOrderService } from '@/services/laboratoryOrderService';
import { formatDateTime12h } from '@/lib/utils';
import { cn } from '@/lib/utils';

function resolveEvidenceUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  in_progress: 'En proceso',
  sent_to_lab: 'Enviado a laboratorio',
  in_transit: 'En tránsito',
  received_from_lab: 'Recibido del lab.',
  returned_to_lab: 'Retornado al lab.',
  in_quality: 'En calidad',
  quality_approved: 'Calidad aprobada',
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
  returned_to_lab: 'bg-[#ffeeed] text-[#b82626]',
  in_quality: 'bg-[#eef2ff] text-[#4338ca]',
  quality_approved: 'bg-[#f0faf5] text-[#0a6b4a]',
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

const STATUS_TO_EVIDENCE_TYPE: Partial<Record<string, 'sent_to_lab' | 'received_from_lab' | 'returned_to_lab' | 'notify_client'>> = {
  sent_to_lab: 'sent_to_lab',
  received_from_lab: 'received_from_lab',
  returned_to_lab: 'returned_to_lab',
  ready_for_delivery: 'notify_client',
};

const NOTES_LABEL: Record<string, string> = {
  sent_to_lab: 'Guía de envío',
  in_transit: 'Referencia de tránsito',
  in_quality: 'Médico asignado para revisión',
  quality_approved: 'Notas del especialista',
  returned_to_lab: 'Motivo de devolución',
};

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    in_process: 1,
    in_progress: 1,
    sent_to_lab: 2,
    in_transit: 2,
    received_from_lab: 2,
    in_quality: 2,
    quality_approved: 2,
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
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());
  const [evidenceByType, setEvidenceByType] = useState<Record<string, LaboratoryOrderEvidence[]>>({});
  const [loadingTypes, setLoadingTypes] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  const fetchEvidenceIfNeeded = async (status: string) => {
    const evidenceType = STATUS_TO_EVIDENCE_TYPE[status];
    if (!evidenceType) return;
    if (evidenceByType[evidenceType] !== undefined) return;
    if (loadingTypes.has(evidenceType)) return;

    setLoadingTypes((prev) => new Set([...prev, evidenceType]));
    try {
      const evidence = await laboratoryOrderService.getLaboratoryOrderEvidence(order.id, evidenceType);
      setEvidenceByType((prev) => ({ ...prev, [evidenceType]: evidence }));
    } catch {
      setEvidenceByType((prev) => ({ ...prev, [evidenceType]: [] }));
    } finally {
      setLoadingTypes((prev) => {
        const next = new Set(prev);
        next.delete(evidenceType);
        return next;
      });
    }
  };

  const toggleEntry = (index: number, status: string) => {
    const isExpanding = !expandedIndexes.has(index);
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    if (isExpanding) {
      fetchEvidenceIfNeeded(status);
    }
  };

  const renderEntryDetails = (entry: HistoryEntry) => {
    const evidenceType = STATUS_TO_EVIDENCE_TYPE[entry.status];
    const evidence = evidenceType ? (evidenceByType[evidenceType] ?? []) : [];
    const isLoadingEvidence = evidenceType ? loadingTypes.has(evidenceType) : false;
    const notesLabel = NOTES_LABEL[entry.status] ?? 'Observación';

    return (
      <div className="mt-3 pt-3 border-t border-[#f0f0f2] space-y-3">
        {entry.notes && (
          <div>
            <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-1">
              {notesLabel}
            </p>
            <p className="text-[13px] text-[#121215] leading-snug">{entry.notes}</p>
          </div>
        )}

        {entry.status === 'received_from_lab' && order.drawer_number && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#f1edff] border border-[#d4c4ff] rounded-lg px-3 py-2">
              <span className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide">Cajón asignado</span>
              <span className="text-[14px] font-bold text-[#8753ef]">#{order.drawer_number}</span>
            </div>
          </div>
        )}

        {evidenceType && (
          <div>
            <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-2">
              Evidencias fotográficas
            </p>
            {isLoadingEvidence ? (
              <div className="flex items-center gap-2 py-1">
                <div className="size-3 rounded-full bg-[#e5e5e9] animate-pulse" />
                <span className="text-[12px] text-[#7d7d87]">Cargando evidencias...</span>
              </div>
            ) : evidence.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {evidence.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className="relative aspect-square rounded-lg overflow-hidden border border-[#e5e5e9] hover:border-[#8753ef] transition-colors group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxUrl(resolveEvidenceUrl(ev.image_url));
                    }}
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
              <p className="text-[12px] text-[#b4b5bc] italic">Sin evidencias fotográficas registradas</p>
            )}
          </div>
        )}

        {!entry.notes && !evidenceType && (
          <p className="text-[12px] text-[#b4b5bc] italic">Sin detalles adicionales para esta etapa</p>
        )}
      </div>
    );
  };

  return (
    <>
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
            const isExpanded = expandedIndexes.has(index);

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
                  className={cn(
                    'flex-1 rounded-lg px-4 py-3 mb-2 cursor-pointer select-none transition-colors',
                    isExpanded && !isActive ? 'hover:bg-[#fafafa]' : '',
                  )}
                  style={
                    isActive && !isCancelledStep
                      ? { border: `1px solid ${primaryColor}20`, backgroundColor: `${primaryBg}60` }
                      : { border: '1px solid #f0f0f2', backgroundColor: isExpanded ? '#fafafa' : 'transparent' }
                  }
                  onClick={() => toggleEntry(index, entry.status)}
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

                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && timeInState !== '—' && (
                        <span className="text-[11px] text-[#7d7d87] flex items-center gap-1">
                          <Circle className="size-2 fill-current" />
                          {timeInState} en este estado
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          'size-4 text-[#b4b5bc] transition-transform duration-200 shrink-0',
                          isExpanded && 'rotate-180',
                        )}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#7d7d87] mt-0.5">
                    {entry.user
                      ? [entry.user.name, entry.user.last_name].filter(Boolean).join(' ')
                      : '—'}
                  </p>

                  {isExpanded && renderEntryDetails(entry)}
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

export default LabOrderTracker;
