import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import type { Appointment } from '@/services/appointmentsService';

function toLocalDate(dateStr: string): Date {
  return parseISO(dateStr);
}

function formatAppointmentDate(dateStr: string) {
  const d = toLocalDate(dateStr);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  return format(d, "EEE d", { locale: es });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled:  { label: 'Pendiente',  className: 'bg-[#fff6e3] text-[#b57218]' },
  in_progress: { label: 'En curso',  className: 'bg-[#e5f6ef] text-[#0f8f64]' },
  paused:     { label: 'Pausada',    className: 'bg-[#f5f5f6] text-[#7d7d87]' },
  completed:  { label: 'Completada', className: 'bg-[#e5f6ef] text-[#228b52]' },
  cancelled:  { label: 'Cancelada',  className: 'bg-[#fff0f0] text-red-500'   },
};

type ColActions = {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function buildAppointmentColumns({ onView, onEdit, onDelete }: ColActions): DataTableColumnDef<Appointment>[] {
  return [
    {
      id: 'date',
      header: 'Fecha',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] text-[#7d7d87]">{formatAppointmentDate(row.scheduled_at)}</span>
      ),
    },
    {
      id: 'time',
      header: 'Hora',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] text-[#7d7d87]">{format(toLocalDate(row.scheduled_at), 'HH:mm')}</span>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] font-semibold text-[#121215]">
          {row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : '—'}
        </span>
      ),
    },
    {
      id: 'identification',
      header: 'Identificación',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] text-[#7d7d87]">{row.patient?.identification || '—'}</span>
      ),
    },
    {
      id: 'reason',
      header: 'Motivo',
      type: 'text',
      cell: (row) => (
        <span className="text-[13px] text-[#7d7d87]">{row.reason || '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.scheduled;
        return (
          <span className={cn('inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold', cfg.className)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onView(row.id); }}
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#eff4ff] border border-[#c5d3f8] text-[#4f74e0] hover:opacity-80 transition-opacity"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(row.id); }}
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#f5f5f7] border border-[#e0e0e4] text-[#7d7d87] hover:opacity-80 transition-opacity"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#fff0f0] border border-[#f5baba] text-red-400 hover:opacity-80 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
}
