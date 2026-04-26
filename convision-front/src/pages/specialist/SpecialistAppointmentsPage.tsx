import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EntityTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import PageLayout from '@/components/layouts/PageLayout';
import { appointmentsService, type Appointment } from '@/services/appointmentsService';
import { buildAppointmentColumns } from './specialistAppointmentsColumns';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

const STATUS_OPTIONS = [
  { value: 'all',        label: 'Todos los estados' },
  { value: 'scheduled',  label: 'Pendiente'   },
  { value: 'in_progress',label: 'En curso'    },
  { value: 'paused',     label: 'Pausada'     },
  { value: 'completed',  label: 'Completada'  },
  { value: 'cancelled',  label: 'Cancelada'   },
];

function getPeriodDates(period: Period) {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  if (period === 'today') return { startDate: fmt(today), endDate: fmt(today) };
  if (period === 'week')  return { startDate: fmt(startOfWeek(today, { weekStartsOn: 1 })), endDate: fmt(endOfWeek(today, { weekStartsOn: 1 })) };
  return { startDate: fmt(startOfMonth(today)), endDate: fmt(endOfMonth(today)) };
}

function MetricCard({ label, value, green }: { label: string; value?: number; green?: boolean }) {
  return (
    <div className="bg-white border border-[#e5e5e9] rounded-[8px] px-5 py-4 flex flex-col gap-[5px]">
      <p className="text-[11px] font-normal text-[#7d7d87]">{label}</p>
      <p className={`text-[24px] font-semibold ${green ? 'text-[#228b52]' : 'text-[#0f0f12]'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function SpecialistAppointmentsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('today');
  const [status, setStatus] = useState('all');

  const { startDate, endDate } = getPeriodDates(period);
  const todayStr    = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const weekDates   = getPeriodDates('week');
  const monthDates  = getPeriodDates('month');

  const { data: todayData } = useQuery({
    queryKey: ['appt-metric-today', todayStr],
    queryFn: () => appointmentsService.getSpecialistAgendaTable({ page: 1, per_page: 1, startDate: todayStr, endDate: todayStr }),
  });
  const { data: tomorrowData } = useQuery({
    queryKey: ['appt-metric-tomorrow', tomorrowStr],
    queryFn: () => appointmentsService.getSpecialistAgendaTable({ page: 1, per_page: 1, startDate: tomorrowStr, endDate: tomorrowStr }),
  });
  const { data: weekData } = useQuery({
    queryKey: ['appt-metric-week', weekDates.startDate],
    queryFn: () => appointmentsService.getSpecialistAgendaTable({ page: 1, per_page: 1, startDate: weekDates.startDate, endDate: weekDates.endDate }),
  });
  const { data: completedMonthData } = useQuery({
    queryKey: ['appt-metric-completed-month', monthDates.startDate],
    queryFn: () => appointmentsService.getSpecialistAgendaTable({ page: 1, per_page: 1, startDate: monthDates.startDate, endDate: monthDates.endDate, status: 'completed' }),
  });

  const activeStatus = status === 'all' ? undefined : status;
  const hasFilters   = status !== 'all';

  const extraFilters = useMemo(
    () => ({ startDate, endDate, status: activeStatus }),
    [startDate, endDate, activeStatus],
  );

  const columns = useMemo(
    () => buildAppointmentColumns({
      onView:   (id) => navigate(`/specialist/appointments/${id}`),
      onEdit:   (id) => navigate(`/specialist/appointments/${id}`),
      onDelete: (_id) => {},
    }),
    [navigate],
  );

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const subtitle   = period === 'today'
    ? todayLabel
    : `${todayLabel}${hasFilters ? ` · filtro: '${STATUS_OPTIONS.find(o => o.value === status)?.label}'` : ''}`;

  return (
    <PageLayout
      title={period === 'today' ? 'Mi agenda de hoy' : `Mi agenda · ${PERIOD_LABELS[period]}`}
      subtitle={subtitle}
      topbarClassName="min-h-[60px] h-auto py-3"
      titleStackClassName="gap-[2px]"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-[36px] rounded-[6px] border-[#e5e5e9] text-[13px] font-semibold text-[#121215]"
            onClick={() => setPeriod('week')}
          >
            Ver semana
          </Button>
          <Button
            size="sm"
            className="h-[36px] rounded-[6px] bg-[#0f8f64] text-[13px] font-semibold text-white hover:bg-[#0c7a56]"
          >
            <Plus className="h-4 w-4 mr-1" /> Nueva cita
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Citas hoy"       value={todayData?.total} />
          <MetricCard label="Citas mañana"    value={tomorrowData?.total} />
          <MetricCard label="Esta semana"     value={weekData?.total} />
          <MetricCard label="Completadas mes" value={completedMonthData?.total} green />
        </div>

        <div className="bg-white border border-[#ebebee] rounded-[8px] flex items-center gap-3 px-5 h-[64px]">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-[36px] w-[180px] rounded-[6px] border-[#e5e5e9] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-[36px] w-[200px] rounded-[6px] border-[#e5e5e9] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([val, lbl]) => (
                <SelectItem key={val} value={val}>{lbl}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <span className="bg-[#e5f6ef] text-[#0f8f64] text-[11px] font-semibold px-[10px] py-[3px] rounded-full">
              Filtros activos
            </span>
          )}
        </div>

        <EntityTable<Appointment>
          columns={columns}
          fetcher={async ({ page, per_page, search, filters }) => {
            const f = filters as { startDate: string; endDate: string; status?: string };
            return appointmentsService.getSpecialistAgendaTable({ page, per_page, search, startDate: f.startDate, endDate: f.endDate, status: f.status });
          }}
          queryKeyBase="specialist-appointments-table"
          extraFilters={extraFilters}
          tableLayout="ledger"
          paginationVariant="figma"
          enableSearch
          searchPlaceholder="Buscar paciente o motivo..."
          showPageSizeSelect={false}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Agenda</span>
              <span className="text-[11px] text-[#7d7d87]">
                {PERIOD_LABELS[period]}{hasFilters ? ` · filtro: '${STATUS_OPTIONS.find(o => o.value === status)?.label}'` : ''}
              </span>
            </div>
          }
          emptyStateNode={
            <EmptyState
              variant="appointments"
              title="No tienes citas programadas para hoy"
              description="Disfruta de un día tranquilo o consulta tu agenda de los próximos días para prepararte"
              actionLabel="+ Nueva cita"
              onAction={() => {}}
              secondaryLabel="Ver agenda semanal"
              onSecondary={() => setPeriod('week')}
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
          onRowClick={(row) => navigate(`/specialist/appointments/${row.id}`)}
        />
      </div>
    </PageLayout>
  );
}
