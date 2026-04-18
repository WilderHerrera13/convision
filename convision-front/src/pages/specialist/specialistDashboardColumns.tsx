import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Eye, MoreHorizontal } from 'lucide-react';
import type { DataTableColumnDef } from '@/components/ui/data-table/DataTable';
import type { Appointment } from '@/services/appointmentsService';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseLocalDatetime, formatTime12h } from '@/lib/utils';

function statusPill(status: Appointment['status']) {
  const map: Record<
    Appointment['status'],
    { label: string; className: string }
  > = {
    completed: {
      label: 'Atendido',
      className: 'bg-[#ebf5ef] text-[#228b52]',
    },
    scheduled: {
      label: 'Pendiente',
      className: 'bg-[#fff6e3] text-[#b57218]',
    },
    in_progress: {
      label: 'En curso',
      className: 'bg-[#eff4ff] text-[#3a71f7]',
    },
    paused: {
      label: 'Pausada',
      className: 'bg-[#fff6e3] text-[#b57218]',
    },
    cancelled: {
      label: 'Cancelado',
      className: 'bg-[#ffeeee] text-[#b82626]',
    },
  };
  const cfg = map[status] ?? {
    label: status,
    className: 'bg-convision-row-alt text-convision-text-secondary',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function buildSpecialistTodayAgendaColumns(
  navigate: NavigateFunction,
): DataTableColumnDef<Appointment>[] {
  return [
    {
      id: 'time',
      header: 'Hora',
      type: 'custom',
      accessorFn: (row) => row.scheduled_at,
      enableSorting: false,
      className: 'min-w-[96px]',
      headerClassName: 'min-w-[96px]',
      cell: (row) => {
        const d = parseLocalDatetime(row.scheduled_at) ?? new Date(row.scheduled_at);
        return <span className="text-[13px] text-convision-text-secondary">{formatTime12h(d)}</span>;
      },
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'custom',
      enableSorting: false,
      className: 'min-w-[200px]',
      cell: (row) => (
        <span className="text-[13px] font-semibold text-convision-text">
          {row.patient.first_name} {row.patient.last_name}
        </span>
      ),
    },
    {
      id: 'room',
      header: 'Sala',
      type: 'custom',
      enableSorting: false,
      className: 'w-[120px]',
      cell: () => <span className="text-[13px] text-convision-text-secondary">—</span>,
    },
    {
      id: 'reason',
      header: 'Motivo',
      type: 'custom',
      enableSorting: false,
      className: 'min-w-[200px]',
      cell: (row) => {
        const text = (row.reason && row.reason.trim()) || (row.notes && row.notes.trim()) || '—';
        return <span className="line-clamp-2 text-[13px] text-convision-text-secondary">{text}</span>;
      },
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'custom',
      enableSorting: false,
      className: 'w-[136px]',
      cell: (row) => statusPill(row.status),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'custom',
      enableSorting: false,
      className: 'w-[120px]',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Ver cita"
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#c5d3f8] bg-[#eff4ff] text-[#3a71f7] hover:bg-[#e4ecfc]"
            onClick={() => navigate(`/specialist/appointments/${row.id}`)}
          >
            <Eye className="size-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0 border-[#e0e0e4] bg-[#f5f5f7] text-convision-text-secondary"
                title="Más"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/specialist/appointments/${row.id}`)}>
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/specialist/patients/${row.patient.id}/history?appointmentId=${row.id}`)
                }
              >
                Historia clínica
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
