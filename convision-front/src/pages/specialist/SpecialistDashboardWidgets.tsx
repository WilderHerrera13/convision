import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDatetime, formatDate, formatTime12h } from '@/lib/utils';
import type { Appointment } from '@/services/appointmentsService';

type MetricStats = {
  todayCompleted: number;
  weekScheduled: number;
  totalPatients: number;
  pendingPrescriptions: number;
};

export function SpecialistDashboardHeader(props: {
  userName?: string;
  todayCount: number;
}) {
  const navigate = useNavigate();
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-convision-border-subtle bg-white px-6">
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold leading-tight text-convision-text">
          Panel del especialista
        </h1>
        <p className="mt-0.5 truncate text-[12px] text-convision-text-secondary">
          {props.userName ?? 'Especialista'} · Especialista oftalmológico
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="rounded-full bg-convision-light px-3 py-1.5">
          <span className="text-[12px] font-medium text-convision-primary">
            {props.todayCount} citas programadas hoy
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 min-w-[160px] rounded-md border-convision-border-subtle text-[12px] font-semibold text-convision-text"
          onClick={() => navigate('/specialist/appointments')}
        >
          Ver agenda
        </Button>
      </div>
    </header>
  );
}

export function SpecialistMetricStrip(props: {
  todayTotal: number;
  todayCompleted: number;
  weekScheduled: number;
  totalPatients: number;
  pendingPrescriptions: number;
}) {
  const cards = [
    {
      title: 'Citas de hoy',
      value: props.todayTotal,
      hint: `${props.todayCompleted} completadas aún`,
      accent: 'bg-convision-success',
    },
    {
      title: 'Próxima semana',
      value: props.weekScheduled,
      hint: 'Citas ya programadas',
      accent: 'bg-[#dcdce0]',
    },
    {
      title: 'Pacientes vistos',
      value: props.totalPatients,
      hint: 'Únicos en el período',
      accent: 'bg-[#dcdce0]',
    },
    {
      title: 'Prescripciones',
      value: props.pendingPrescriptions,
      hint: 'Pendientes de registrar',
      accent: 'bg-[#dcdce0]',
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="relative flex h-[104px] flex-col justify-between overflow-hidden rounded-lg border border-convision-border-subtle bg-white py-4 pl-5 pr-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]"
        >
          <span className={`absolute left-0 top-0 h-full w-1 ${c.accent}`} aria-hidden />
          <p className="text-[13px] font-medium text-convision-text-secondary">{c.title}</p>
          <p className="text-[28px] font-semibold leading-none tracking-tight text-convision-text">{c.value}</p>
          <p className="text-[11px] text-convision-text-muted">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function SpecialistActiveVisitBanner(props: {
  appointment: Appointment;
  onGo: () => void;
}) {
  const { appointment: a } = props;
  const start = parseLocalDatetime(a.scheduled_at) ?? new Date(a.scheduled_at);
  const detail = `${formatTime12h(start)} · ${(a.reason || a.notes || 'Consulta').toString().slice(0, 80)}`;
  return (
    <div className="relative flex min-h-[80px] items-center gap-3 overflow-hidden rounded-lg border border-convision-border-subtle bg-convision-success-light/80 px-5 py-4 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
      <span className="absolute left-0 top-0 h-full w-1 bg-convision-success" aria-hidden />
      <span className="relative mt-0.5 size-2 shrink-0 rounded-full bg-convision-success shadow-[0_0_0_3px_rgba(34,139,82,0.25)]" />
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-convision-success">
        <span>En curso</span>
      </div>
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-[15px] font-semibold text-convision-text">
          {a.patient.first_name} {a.patient.last_name}
        </p>
        <p className="truncate text-[12px] text-convision-text-secondary">{detail}</p>
      </div>
      <Button
        type="button"
        className="h-9 shrink-0 rounded-md bg-convision-primary px-4 text-[12px] font-semibold text-white hover:bg-convision-dark"
        onClick={(e) => {
          e.stopPropagation();
          props.onGo();
        }}
      >
        Ir a la cita
      </Button>
    </div>
  );
}

export function SpecialistQuickAccessRow() {
  const navigate = useNavigate();
  const items = [
    { title: 'Citas', hint: 'Agenda y estados de sala.', path: '/specialist/appointments' },
    { title: 'Lentes', hint: 'Catálogo clínico de productos.', path: '/specialist/catalog' },
    { title: 'Historias', hint: 'Expediente y evolución.', path: '/specialist/appointments' },
    { title: 'Perfil', hint: 'Firma y datos de contacto.', path: '/specialist/profile' },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.title}
          type="button"
          onClick={() => navigate(item.path)}
          className="group relative flex h-[124px] flex-col overflow-hidden rounded-lg border border-convision-border-subtle bg-white px-5 py-4 text-left shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
        >
          <span className="absolute left-0 top-0 h-full w-1 bg-[#dcdce0] group-hover:bg-convision-primary" aria-hidden />
          <p className="text-[14px] font-semibold text-convision-text">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-[12px] text-convision-text-secondary">{item.hint}</p>
          <div className="mt-auto border-t border-convision-border-subtle pt-2">
            <span className="text-[12px] font-semibold text-convision-primary">Abrir →</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function SpecialistPausedStrip(props: {
  appointments: Appointment[];
  onOpen: (id: number) => void;
}) {
  if (props.appointments.length === 0) return null;
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3">
      <p className="text-[13px] font-semibold text-amber-900">
        Citas pausadas ({props.appointments.length})
      </p>
      <ul className="mt-2 space-y-2">
        {props.appointments.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-white/80 px-3 py-2">
            <span className="truncate text-[13px] text-convision-text">
              {a.patient.first_name} {a.patient.last_name} ·{' '}
              {formatDate(a.scheduled_at)}
            </span>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => props.onOpen(a.id)}>
              Reanudar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
