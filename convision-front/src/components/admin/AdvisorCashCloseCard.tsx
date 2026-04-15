import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdvisorPendingGroup } from '@/services/cashRegisterCloseService';
import { formatCOP } from '@/pages/admin/cashClosesConfig';

interface Props {
  advisor: AdvisorPendingGroup;
  onReview: (advisor: AdvisorPendingGroup) => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-[#7d7d87]',
  submitted: 'text-[#b57218]',
  approved: 'text-[#228b52]',
};

const formatDate = (d: string) => {
  try {
    return format(new Date(d + 'T12:00:00'), 'dd MMM', { locale: es });
  } catch {
    return d;
  }
};

const VarianceChip: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) {
    return <span className="text-[13px] text-[#7d7d87]">Sin cruzar</span>;
  }
  if (value === 0) {
    return <span className="text-[13px] font-semibold text-[#228b52]">$0</span>;
  }
  if (value > 0) {
    return (
      <span className="text-[13px] font-semibold text-[#228b52]">
        +{formatCOP(value)}
      </span>
    );
  }
  return (
    <span className="text-[13px] font-semibold text-[#b82626]">
      -{formatCOP(Math.abs(value))}
    </span>
  );
};

const URGENCY = {
  warning: {
    badge: 'border-[#f4c678] bg-[#fff6e3] text-[#b57218]',
    cardBorder: 'border-[#f4c678]',
  },
  critical: {
    badge: 'border-[#f5baba] bg-[#ffeeed] text-[#b82626]',
    cardBorder: 'border-[#f5baba]',
  },
};

const AdvisorCashCloseCard: React.FC<Props> = ({ advisor, onReview }) => {
  const hasMultiple = advisor.pending_count > 1;
  const reviewLabel = hasMultiple ? 'Revisar cierres' : 'Revisar cierre';
  const pendingLabel = `${advisor.pending_count} día${advisor.pending_count > 1 ? 's' : ''} pendiente${advisor.pending_count > 1 ? 's' : ''}`;
  const urgency = hasMultiple ? URGENCY.critical : URGENCY.warning;

  return (
    <div className={`flex flex-col rounded-[12px] border bg-white overflow-hidden ${urgency.cardBorder}`}>
      <div className="flex items-center gap-3 border-b border-[#f0f0f2] px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7d7d87]">
            Asesor Comercial
          </span>
          <Badge
            variant="outline"
            className={`rounded-full text-[10px] font-semibold shrink-0 ${urgency.badge}`}
          >
            {pendingLabel}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff1ff] text-[14px] font-bold text-[#3a71f7]">
          {initials(advisor.user_name)}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#0f0f12] truncate">{advisor.user_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-0 px-4 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-semibold mb-1">
            Total hoy
          </p>
          <p className="text-[13px] font-bold text-[#3a71f7]">{formatCOP(advisor.total_today)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-semibold mb-1">
            Total ayer
          </p>
          <p className="text-[13px] font-semibold text-[#0f0f12]">
            {advisor.total_yesterday !== null ? formatCOP(advisor.total_yesterday) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-semibold mb-1">
            Diferencia acum.
          </p>
          <VarianceChip value={advisor.accumulated_variance} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#7d7d87] font-semibold mb-1">
            Estado
          </p>
          <span className={`text-[13px] font-semibold ${STATUS_COLORS[advisor.latest_status] ?? 'text-[#0f0f12]'}`}>
            {STATUS_LABELS[advisor.latest_status] ?? advisor.latest_status}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#f0f0f2] px-4 py-3 gap-2">
        <div className="flex flex-wrap gap-1.5">
          {advisor.close_dates.slice(0, 4).map((d) => (
            <span
              key={d}
              className="rounded-[6px] bg-[#f7f7f8] border border-[#e5e5e9] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f0f12]"
            >
              {formatDate(d)}
            </span>
          ))}
          {advisor.close_dates.length > 4 && (
            <span className="rounded-[6px] bg-[#f7f7f8] border border-[#e5e5e9] px-2.5 py-0.5 text-[11px] font-semibold text-[#7d7d87]">
              +{advisor.close_dates.length - 4}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-[#e5e5e9] text-[12px] font-semibold text-[#0f0f12] hover:bg-[#f7f7f8]"
          onClick={() => onReview(advisor)}
        >
          {reviewLabel}
        </Button>
      </div>
    </div>
  );
};

export default AdvisorCashCloseCard;
