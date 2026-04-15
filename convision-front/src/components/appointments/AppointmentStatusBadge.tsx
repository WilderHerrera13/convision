import React from 'react';

type Status = 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'Pendiente', bg: 'bg-[#fff6e3]', text: 'text-[#b57218]' },
  in_progress: { label: 'En curso', bg: 'bg-[#eff1ff]', text: 'text-[#3a71f7]' },
  paused: { label: 'Pausada', bg: 'bg-orange-100', text: 'text-orange-700' },
  completed: { label: 'Atendido', bg: 'bg-[#ebf5ef]', text: 'text-[#228b52]' },
  cancelled: { label: 'Cancelado', bg: 'bg-[#fee]', text: 'text-[#b82626]' },
};

type Props = { status: Status };

export default function AppointmentStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
export type { Status };
