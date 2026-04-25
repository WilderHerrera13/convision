import { format, parseISO, isValid } from 'date-fns';
import type { DailyActivityReport } from '@/services/dailyActivityReportService';
import { sumRecepcionesDinero } from '@/services/dailyActivityReportService';
import { formatTime12h } from '@/lib/utils';

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  specialist: 'Especialista',
  receptionist: 'Recepción',
};

function sumAttention(r: DailyActivityReport): number {
  const ca = r.customer_attention;
  return (
    (ca.questions_men ?? 0) +
    (ca.questions_women ?? 0) +
    (ca.questions_children ?? 0) +
    (ca.quotes_men ?? 0) +
    (ca.quotes_women ?? 0) +
    (ca.quotes_children ?? 0) +
    (ca.effective_consultations_men ?? 0) +
    (ca.effective_consultations_women ?? 0) +
    (ca.effective_consultations_children ?? 0) +
    (ca.formula_sale_consultations_men ?? 0) +
    (ca.formula_sale_consultations_women ?? 0) +
    (ca.formula_sale_consultations_children ?? 0) +
    (ca.non_effective_consultations_men ?? 0) +
    (ca.non_effective_consultations_women ?? 0) +
    (ca.non_effective_consultations_children ?? 0)
  );
}

function sumOps(r: DailyActivityReport): number {
  const o = r.operations;
  return (
    (o.bonos_entregados ?? 0) +
    (o.bonos_redimidos ?? 0) +
    (o.sistecreditos_realizados ?? 0) +
    (o.addi_realizados ?? 0) +
    (o.control_seguimiento ?? 0) +
    (o.seguimiento_garantias ?? 0) +
    (o.ordenes ?? 0) +
    (o.plan_separe ?? 0) +
    (o.otras_ventas ?? 0) +
    (o.entregas ?? 0) +
    (o.sistecreditos_abonos ?? 0)
  );
}

function sumSocial(r: DailyActivityReport): number {
  const s = r.social_media;
  return (
    (s.publicaciones_fb ?? 0) +
    (s.publicaciones_ig ?? 0) +
    (s.mensajes_fb ?? 0) +
    (s.mensajes_ig ?? 0) +
    (s.publicaciones_wa ?? 0) +
    (s.tiktoks ?? 0) +
    (s.bonos_regalo ?? 0) +
    (s.bonos_fidelizacion ?? 0)
  );
}

/** Indica si el reporte tiene datos distintos de un formulario vacío. */
export function hasReportData(r: DailyActivityReport): boolean {
  if ((r.observations ?? '').trim().length > 0) return true;
  if ((r.operations?.valor_ordenes ?? 0) > 0) return true;
  if (sumRecepcionesDinero(r.recepciones_dinero ?? {}) > 0) return true;
  return sumAttention(r) + sumOps(r) + sumSocial(r) > 0;
}

/** Derives the status label for the admin table using the actual report status. */
export function deriveEstado(r: DailyActivityReport): { label: string; className: string } {
  if (r.status === 'closed') {
    return { label: 'Cerrado', className: 'bg-[#ebf5ef] text-[#228b52] border-0' };
  }
  if (!hasReportData(r)) {
    return { label: 'Borrador', className: 'bg-[#f5f5f6] text-[#7d7d87] border-0' };
  }
  return { label: 'Pendiente', className: 'bg-[#fff6e3] text-[#b57218] border-0' };
}

export function formatDetalle(r: DailyActivityReport): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const rd = r.report_date;
  if (rd < today) return 'Día anterior';
  if (!r.updated_at) return '—';
  const updated = parseISO(r.updated_at);
  if (!isValid(updated)) return '—';
  if (format(updated, 'yyyy-MM-dd') === rd) {
    if (rd === today) return 'Última edición hoy';
    return `Última edición ${formatTime12h(updated)}`;
  }
  return '—';
}

export function formatFechaHora(r: DailyActivityReport): string {
  const datePart = format(new Date(r.report_date + 'T12:00:00'), 'dd/MM/yyyy');
  if (!r.updated_at) return `${datePart} · —`;
  const d = parseISO(r.updated_at);
  if (!isValid(d)) return `${datePart} · —`;
  return `${datePart} · ${formatTime12h(d)}`;
}
