import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarPlus, RefreshCw, UserPlus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function ReceptionistDashboardHeader(props: {
  /** Nombre para mostrar (opcional); el rol se muestra siempre en español. */
  userName?: string;
  dateLabel: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const lead =
    props.userName && !/^\s*receptionist\s*$/i.test(props.userName.trim())
      ? props.userName.trim()
      : null;
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-convision-border-subtle bg-white px-6">
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold leading-tight text-convision-text">Panel de recepción</h1>
        <p className="mt-0.5 truncate text-[12px] text-convision-text-secondary">
          {lead ? `${lead} · ` : ''}Recepcionista · Prioriza ventas tras consulta y mantén el flujo de sala en orden.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="max-w-[min(42vw,200px)] truncate text-[12px] text-convision-text-secondary sm:max-w-none">
          {props.dateLabel}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-9 min-w-[148px] rounded-md border-convision-border-subtle text-[12px] font-semibold text-convision-text"
          onClick={props.onRefresh}
          disabled={props.isRefreshing}
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${props.isRefreshing ? 'animate-spin' : ''}`} />
          {props.isRefreshing ? 'Actualizando…' : 'Actualizar lista'}
        </Button>
      </div>
    </header>
  );
}

export function ReceptionistMetricStrip(props: {
  loading: boolean;
  todayTotal: number;
  todayPending: number;
  queueTotal: number;
  salesTotal: number;
  salesTxCount: number;
}) {
  if (props.loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative h-[88px] animate-pulse overflow-hidden rounded-lg border border-convision-border-subtle bg-white"
          >
            <span className="absolute left-0 top-0 h-full w-1 bg-convision-border-subtle" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="relative flex h-[88px] flex-col justify-between overflow-hidden rounded-lg border border-convision-border-subtle bg-white py-4 pl-5 pr-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
        <span className="absolute left-0 top-0 h-full w-1 bg-[#8753ef]" aria-hidden />
        <p className="text-[13px] font-medium text-convision-text-secondary">Citas hoy</p>
        <p className="text-[28px] font-semibold leading-none tracking-tight text-convision-text">{props.todayTotal}</p>
        <p className="text-[11px] text-convision-text-muted">
          {props.todayPending === 0
            ? 'Sin pendientes de atención'
            : props.todayPending === 1
              ? '1 pendiente de atención'
              : `${props.todayPending} pendientes de atención`}
        </p>
      </div>
      <div className="relative flex h-[88px] flex-col justify-between overflow-hidden rounded-lg border border-convision-border-subtle bg-white py-4 pl-5 pr-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
        <span className="absolute left-0 top-0 h-full w-1 bg-convision-warning" aria-hidden />
        <div className="flex items-start justify-between gap-2 pr-0">
          <p className="text-[13px] font-medium text-convision-text-secondary">Listas para venta</p>
          {props.queueTotal > 0 ? (
            <span className="shrink-0 rounded-full bg-convision-warning-light px-2.5 py-0.5 text-[12px] font-semibold text-convision-warning">
              Requieren acción
            </span>
          ) : null}
        </div>
        <p className="text-[28px] font-semibold leading-none tracking-tight text-convision-text">{props.queueTotal}</p>
        <p className="text-[11px] text-convision-text-muted">Consultas completadas</p>
      </div>
      <div className="relative flex h-[88px] flex-col justify-between overflow-hidden rounded-lg border border-convision-border-subtle bg-white py-4 pl-5 pr-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
        <span className="absolute left-0 top-0 h-full w-1 bg-convision-success" aria-hidden />
        <p className="text-[13px] font-medium text-convision-text-secondary">Ventas del día</p>
        <p className="text-[22px] font-semibold leading-none tracking-tight text-convision-text sm:text-[24px]">
          {formatCurrency(props.salesTotal)}
        </p>
        <p className="text-[11px] text-convision-text-muted">
          {props.salesTxCount === 1 ? '1 transacción' : `${props.salesTxCount} transacciones`}
        </p>
      </div>
    </div>
  );
}

export function ReceptionistQuickActionsStrip() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[52px] w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-convision-border-subtle bg-white px-5 py-2 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)] sm:py-0">
      <p className="min-w-0 flex-1 text-[13px] text-convision-text-secondary sm:flex-none">¿Nuevo paciente en sala?</p>
      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 rounded-md border-convision-border-subtle text-[12px] font-semibold text-convision-text"
          onClick={() => navigate('/receptionist/appointments')}
        >
          <CalendarPlus className="size-3.5" />
          Nueva cita
        </Button>
        <Button
          type="button"
          className="h-9 gap-1.5 rounded-md bg-[#8753ef] px-3 text-[12px] font-semibold text-white hover:bg-[#6a3cc4]"
          onClick={() => navigate('/receptionist/patients/new')}
        >
          <UserPlus className="size-3.5" />
          Registrar paciente
        </Button>
      </div>
    </div>
  );
}
