import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Appointment } from '@/services/appointmentsService';
import { parseLocalDatetime, formatTime12h } from '@/lib/utils';

function agendaBadge(status: Appointment['status']) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center rounded-full bg-convision-success-light px-2 py-0.5 text-[12px] font-semibold text-convision-success">
        Completada
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center rounded-full bg-convision-warning-light px-2 py-0.5 text-[12px] font-semibold text-convision-warning">
        En sala
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#eff4ff] px-2 py-0.5 text-[12px] font-semibold text-[#3a71f7]">
      Pendiente
    </span>
  );
}

export function ReceptionistTodayAgendaAside(props: { appointments: Appointment[] }) {
  const navigate = useNavigate();
  const sorted = [...props.appointments].sort((a, b) => {
    const da = parseLocalDatetime(a.scheduled_at)?.getTime() ?? 0;
    const db = parseLocalDatetime(b.scheduled_at)?.getTime() ?? 0;
    return da - db;
  });

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-convision-border-subtle bg-white shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
      <div className="flex h-12 items-center gap-2 border-b border-convision-border-subtle px-5">
        <span className="text-[16px] font-semibold text-convision-text">Agenda de hoy</span>
        <span className="rounded-full bg-convision-light px-2.5 py-0.5 text-[12px] font-semibold text-convision-primary">
          {sorted.length}
        </span>
      </div>
      <div className="max-h-[415px] divide-y divide-convision-border-subtle overflow-y-auto overscroll-contain">
        {sorted.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-convision-text-secondary">Sin citas programadas hoy.</p>
        ) : (
          sorted.map((row) => {
            const start = parseLocalDatetime(row.scheduled_at) ?? new Date(row.scheduled_at);
            const motive = (row.reason || row.notes || 'Consulta').toString().slice(0, 48);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`/receptionist/appointments/${row.id}`)}
                className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-convision-background"
              >
                <span className="mt-0.5 inline-flex min-w-[52px] justify-center rounded bg-convision-background px-1.5 py-1 text-[12px] text-convision-text-secondary">
                  {formatTime12h(start)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-convision-text">
                    {row.patient.first_name} {row.patient.last_name}
                  </p>
                  <p className="truncate text-[13px] text-convision-text-secondary">{motive}</p>
                </div>
                <div className="shrink-0 pt-0.5">{agendaBadge(row.status)}</div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
