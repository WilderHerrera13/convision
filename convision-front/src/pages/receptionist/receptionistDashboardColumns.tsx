import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { DataTableColumnDef } from '@/components/ui/data-table/DataTable';
import type { Appointment } from '@/services/appointmentsService';
import { Button } from '@/components/ui/button';
import { parseLocalDatetime, formatTime12h } from '@/lib/utils';

function queueStatusPill(status: Appointment['status']) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center rounded-full bg-convision-success-light px-2.5 py-0.5 text-[11px] font-semibold leading-none text-convision-success">
        Lista
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center rounded-full bg-convision-warning-light px-2.5 py-0.5 text-[11px] font-semibold leading-none text-convision-warning">
        En sala
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#eff4ff] px-2.5 py-0.5 text-[11px] font-semibold leading-none text-[#3a71f7]">
      Pendiente
    </span>
  );
}

export function buildReceptionistSalesQueueColumns(
  navigate: NavigateFunction,
): DataTableColumnDef<Appointment>[] {
  return [
    {
      id: 'time',
      header: 'Hora',
      type: 'custom',
      accessorFn: (row) => row.scheduled_at,
      enableSorting: false,
      className: 'w-[72px]',
      headerClassName: 'w-[72px]',
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
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-convision-text">
            {row.patient.first_name} {row.patient.last_name}
          </p>
          <p className="text-[11px] text-convision-text-muted">
            {row.patient.identification ? `ID ${row.patient.identification}` : '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'specialist',
      header: 'Especialista',
      type: 'custom',
      enableSorting: false,
      className: 'min-w-[160px]',
      cell: (row) => (
        <span className="text-[13px] text-convision-text-secondary">{row.specialist?.name ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'custom',
      enableSorting: false,
      className: 'w-[120px]',
      cell: (row) => queueStatusPill(row.status),
    },
    {
      id: 'action',
      header: 'Acción',
      type: 'custom',
      enableSorting: false,
      className: 'w-[200px]',
      headerClassName: 'text-right',
      cell: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {row.status === 'completed' ? (
            <Button
              type="button"
              className="h-[34px] gap-1.5 rounded-md bg-[#8753ef] px-3 text-[12px] font-semibold text-white hover:bg-[#6a3cc4]"
              onClick={() => navigate(`/receptionist/appointments/${row.id}`)}
            >
              <ShoppingBag className="size-3.5 shrink-0" />
              Iniciar venta
            </Button>
          ) : (
            <span className="pr-1 text-[11px] text-convision-text-muted">En consulta</span>
          )}
        </div>
      ),
    },
  ];
}
