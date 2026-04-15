import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ArrowRightLeft, XCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn, parseLocalDatetime } from '@/lib/utils';
import { appointmentsService } from '@/services/appointmentsService';
import { format } from 'date-fns';
import AppointmentFilterModal, { AppointmentFilters } from './AppointmentFilterModal';

type Appointment = {
  id: number;
  patient: { id: number; first_name: string; last_name: string };
  specialist: { id: number; name: string };
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'Pendiente', bg: 'bg-convision-warning-light', text: 'text-convision-warning' },
  in_progress: { label: 'En curso', bg: 'bg-convision-light', text: 'text-convision-primary' },
  paused: { label: 'Pendiente', bg: 'bg-convision-warning-light', text: 'text-convision-warning' },
  completed: { label: 'Atendido', bg: 'bg-convision-success-light', text: 'text-convision-success' },
  cancelled: { label: 'Cancelada', bg: 'bg-convision-error-light', text: 'text-convision-error' },
};

const COLUMNS = [
  { label: 'Hora', width: 'w-[68px]' },
  { label: 'Paciente', width: 'w-[200px]' },
  { label: 'Especialista', width: 'w-[160px]' },
  { label: 'Motivo', width: 'flex-1' },
  { label: 'Estado', width: 'w-[140px]' },
  { label: '', width: 'w-[120px]' },
];

const EMPTY_FILTERS: AppointmentFilters = {
  startDate: '',
  endDate: '',
  specialistIds: [],
  statuses: [],
  search: '',
};

type Props = { basePath?: string };

const AppointmentsSection: React.FC<Props> = ({ basePath = '/admin' }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AppointmentFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const perPage = 10;

  const today = format(new Date(), 'yyyy-MM-dd');

  const hasActiveFilters =
    filters.startDate !== '' ||
    filters.endDate !== '' ||
    filters.specialistIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.search.trim() !== '';

  const activeFilterCount = [
    filters.startDate || filters.endDate,
    filters.specialistIds.length > 0,
    filters.statuses.length > 0,
    filters.search.trim().length > 0,
  ].filter(Boolean).length;

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const useFilters = hasActiveFilters;
      const startDate = useFilters && filters.startDate ? filters.startDate : today;
      const endDate = useFilters && filters.endDate ? filters.endDate : today;

      const extraFilters: Record<string, unknown> = {};
      if (filters.specialistIds.length > 0) {
        extraFilters.specialist_id = filters.specialistIds[0];
      }
      if (filters.statuses.length === 1) {
        extraFilters.status = filters.statuses[0];
      }

      const searchTerm = search || (useFilters ? filters.search : '');

      const res = await appointmentsService.getAppointments({
        perPage,
        page,
        startDate,
        endDate,
        search: searchTerm || undefined,
        filters: extraFilters,
      });

      let all = (res.data || []) as Appointment[];

      if (filters.statuses.length > 1) {
        all = all.filter((a) => filters.statuses.includes(a.status));
      }

      setTotal(all.length);
      setAppointments(all);
    } catch {
      setAppointments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [today, search, page, filters, hasActiveFilters]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleApplyFilters = (newFilters: AppointmentFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rangeFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeTo = Math.min(page * perPage, total);

  const dateLabel = hasActiveFilters && (filters.startDate || filters.endDate)
    ? `${filters.startDate || '...'} → ${filters.endDate || '...'}`
    : format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy");

  return (
    <>
      <div className="bg-white border border-convision-border rounded-[8px] overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-convision-border-subtle flex items-center justify-between px-5 h-[52px] shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-convision-text leading-none">
              {hasActiveFilters ? 'Citas filtradas' : 'Citas de hoy'}
            </span>
            <span className="text-[12px] text-convision-text-secondary leading-none capitalize">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 h-[34px] px-3 rounded-[6px] bg-convision-warning-light border border-convision-warning text-[12px] text-convision-warning font-medium hover:opacity-80 transition-opacity"
              >
                <X className="size-3" />
                Limpiar ({activeFilterCount})
              </button>
            )}
            <button
              onClick={() => setFilterOpen(true)}
              className={cn(
                'flex items-center gap-1.5 h-[34px] px-3 rounded-[6px] border text-[12px] font-medium transition-colors',
                hasActiveFilters
                  ? 'bg-[#eff1ff] border-[#c5d3f8] text-convision-primary'
                  : 'bg-convision-row-alt border-[#e0e0e5] text-convision-text-secondary hover:bg-convision-background',
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              Filtros
            </button>
            <div className="bg-convision-row-alt border border-[#e0e0e5] flex items-center h-[34px] px-3 rounded-[6px] w-[220px] gap-2">
              <Search className="size-3.5 text-convision-text-muted shrink-0" />
              <input
                className="bg-transparent text-[12px] text-convision-text placeholder:text-convision-text-muted outline-none flex-1"
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <button
              onClick={() => navigate(`${basePath}/appointments`)}
              className="bg-[#121212] text-white text-[12px] font-semibold h-[34px] px-4 rounded-[6px] whitespace-nowrap hover:bg-convision-text transition-colors"
            >
              + Nueva cita
            </button>
          </div>
        </div>

        {/* Col header */}
        <div className="bg-convision-row-alt border-b border-convision-border-subtle flex h-9">
          {COLUMNS.map((col) => (
            <div key={col.label} className={cn('flex items-center px-3', col.width)}>
              <span className="text-[12px] font-semibold text-convision-text-label leading-none">{col.label}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center h-24 text-convision-text-secondary text-sm">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-convision-text-secondary text-sm">
            {hasActiveFilters ? 'No hay citas con los filtros seleccionados' : 'No hay citas para hoy'}
          </div>
        ) : (
          appointments.map((a, idx) => {
            const status = statusConfig[a.status] ?? statusConfig.scheduled;
            const timeStr = format(parseLocalDatetime(a.scheduled_at) ?? new Date(), 'H:mm');
            const isOdd = idx % 2 === 0;
            return (
              <div key={a.id} className={cn('flex h-12 border-b border-[#ececef]', isOdd ? 'bg-white' : 'bg-convision-row-alt')}>
                <div className="flex items-center px-3 w-[68px]">
                  <span className="text-[12px] font-medium text-convision-text-secondary">{timeStr}</span>
                </div>
                <div className="flex items-center px-3 w-[200px]">
                  <span className="text-[13px] font-semibold text-[#121212] whitespace-nowrap truncate">
                    {a.patient.first_name} {a.patient.last_name}
                  </span>
                </div>
                <div className="flex items-center px-3 w-[160px]">
                  <span className="text-[12px] text-convision-text-secondary whitespace-nowrap truncate">{a.specialist.name}</span>
                </div>
                <div className="flex items-center px-3 flex-1">
                  <span className="text-[12px] text-[#3f3f47] truncate">{a.notes || '—'}</span>
                </div>
                <div className="flex items-center px-3 w-[140px]">
                  <span className={cn('text-[11px] font-semibold px-[10px] py-1 rounded-full', status.bg, status.text)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-end px-3 w-[120px] gap-1.5">
                  <button
                    onClick={() => navigate(`${basePath}/appointments/${a.id}`)}
                    className="size-8 flex items-center justify-center rounded-[6px] bg-[#eff4ff] border border-[#c5d3f8] hover:bg-convision-light transition-colors"
                    title="Ver"
                  >
                    <Eye className="size-4 text-convision-primary" />
                  </button>
                  <button
                    onClick={() => navigate(`${basePath}/appointments/${a.id}`)}
                    className="size-8 flex items-center justify-center rounded-[6px] bg-[#f5f5f7] border border-[#e0e0e4] hover:bg-convision-background transition-colors"
                    title="Mover"
                  >
                    <ArrowRightLeft className="size-4 text-convision-text-secondary" />
                  </button>
                  <button
                    className="size-8 flex items-center justify-center rounded-[6px] bg-[#fff0f0] border border-[#f5baba] hover:bg-convision-error-light transition-colors"
                    title="Cancelar"
                  >
                    <XCircle className="size-4 text-convision-error" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        <div className="bg-white border-t border-convision-border-subtle flex items-center justify-between px-5 h-12">
          <div className="flex items-center gap-1.5 text-[12px] text-convision-text-secondary">
            <span>Mostrando</span>
            <span className="bg-convision-light text-convision-primary font-semibold px-1.5 py-0.5 rounded-[4px]">
              {rangeFrom}–{rangeTo}
            </span>
            <span>de {total} resultados</span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { label: '←', action: () => setPage((p) => Math.max(1, p - 1)) },
              ...Array.from({ length: Math.min(totalPages, 5) }, (_, i) => ({
                label: String(i + 1),
                action: () => setPage(i + 1),
              })),
              { label: '→', action: () => setPage((p) => Math.min(totalPages, p + 1)) },
            ].map((btn, i) => {
              const isCurrentPage = !isNaN(Number(btn.label)) && Number(btn.label) === page;
              return (
                <button
                  key={i}
                  onClick={btn.action}
                  className={cn(
                    'size-8 flex items-center justify-center rounded-[6px] text-[12px] border transition-colors',
                    isCurrentPage
                      ? 'bg-convision-primary text-white border-convision-primary font-medium'
                      : 'bg-white text-convision-text-secondary border-[#e0e0e5] hover:bg-convision-background',
                  )}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AppointmentFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={filters}
        onApply={handleApplyFilters}
      />
    </>
  );
};

export default AppointmentsSection;
