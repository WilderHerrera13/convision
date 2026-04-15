import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, X, Calendar, Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { appointmentsService } from '@/services/appointmentsService';
import { format } from 'date-fns';

type Specialist = {
  id: number;
  name: string;
};

export type AppointmentFilters = {
  startDate: string;
  endDate: string;
  specialistIds: number[];
  statuses: string[];
  search: string;
};

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendada', color: '#3a71f7', bg: '#eff1ff', border: '#3a71f7', dot: '#3a71f7' },
  { value: 'in_progress', label: 'En consulta', color: '#228b52', bg: '#ebf5ef', border: '#228b52', dot: '#228b52' },
  { value: 'completed', label: 'Completada', color: '#228b52', bg: '#ebf5ef', border: '#228b52', dot: '#228b52' },
  { value: 'cancelled', label: 'Cancelada', color: '#b82626', bg: '#ffeeed', border: '#b82626', dot: '#b82626' },
  { value: 'paused', label: 'No presentó', color: '#b57218', bg: '#fff6e3', border: '#b57218', dot: '#b57218' },
];

const DATE_SHORTCUTS = [
  { label: 'Hoy', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
  {
    label: 'Esta semana',
    getDates: () => {
      const now = new Date();
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { start: format(mon, 'yyyy-MM-dd'), end: format(sun, 'yyyy-MM-dd') };
    },
  },
  {
    label: 'Este mes',
    getDates: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: format(first, 'yyyy-MM-dd'), end: format(last, 'yyyy-MM-dd') };
    },
  },
  {
    label: 'Últimos 30 días',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  initialFilters: AppointmentFilters;
  onApply: (filters: AppointmentFilters) => void;
};

const AppointmentFilterModal: React.FC<Props> = ({ open, onClose, initialFilters, onApply }) => {
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);

  useEffect(() => {
    if (open) {
      setFilters(initialFilters);
      appointmentsService.getSpecialists().then(setSpecialists).catch(() => setSpecialists([]));
    }
  }, [open, initialFilters]);

  const activeCount = [
    filters.startDate || filters.endDate,
    filters.specialistIds.length > 0,
    filters.statuses.length > 0,
    filters.search.trim().length > 0,
  ].filter(Boolean).length;

  const toggleStatus = (val: string) => {
    setFilters((f) => ({
      ...f,
      statuses: f.statuses.includes(val) ? f.statuses.filter((s) => s !== val) : [...f.statuses, val],
    }));
  };

  const toggleSpecialist = (id: number) => {
    setFilters((f) => ({
      ...f,
      specialistIds: f.specialistIds.includes(id)
        ? f.specialistIds.filter((s) => s !== id)
        : [...f.specialistIds, id],
    }));
  };

  const applyShortcut = (shortcut: typeof DATE_SHORTCUTS[0]) => {
    const { start, end } = shortcut.getDates();
    setFilters((f) => ({ ...f, startDate: start, endDate: end }));
  };

  const clearAll = () => {
    setFilters({ startDate: '', endDate: '', specialistIds: [], statuses: [], search: '' });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-[640px] rounded-[12px] overflow-hidden border border-[#e0e0e4] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.2)] [&>button:last-child]:hidden">
        {/* Header */}
        <div className="bg-[#fafbff] border-b border-[#e8e8ec] flex items-center gap-3 px-5 h-[68px] relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-convision-primary" />
          <SlidersHorizontal className="size-5 text-convision-primary ml-1 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-semibold text-[#0f0f12]">Filtrar citas</span>
            <span className="text-[12px] text-[#7d7d87]">Selecciona criterios para encontrar citas específicas</span>
          </div>
          <button
            onClick={onClose}
            className="ml-auto size-7 flex items-center justify-center rounded-[6px] bg-[#f0f0f3] hover:bg-convision-border transition-colors shrink-0"
          >
            <X className="size-[10px] text-convision-text-secondary" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[560px]">
          {/* FECHA */}
          <div className="px-6 pt-5 pb-4 border-b border-[#e8e8ec]">
            <p className="text-[10px] font-semibold text-[#a0a0ac] mb-3">FECHA</p>
            <div className="flex items-center gap-3">
              <label className="flex-1 border border-[#dcdce0] rounded-[8px] px-3 py-2 cursor-pointer flex items-center justify-between bg-white hover:border-convision-primary transition-colors">
                <div>
                  <p className="text-[10px] font-medium text-[#a0a0ac]">Desde</p>
                  {filters.startDate ? (
                    <p className="text-[13px] font-medium text-[#0f0f12]">
                      {format(new Date(filters.startDate + 'T00:00:00'), 'd MMM yyyy')}
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#a0a0ac]">Seleccionar...</p>
                  )}
                </div>
                <Calendar className="size-3.5 text-[#a0a0ac]" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                  className="sr-only"
                />
              </label>
              <span className="text-[14px] text-[#b0b0bc]">→</span>
              <label className={cn(
                'flex-1 border-2 rounded-[8px] px-3 py-2 cursor-pointer flex items-center justify-between',
                filters.endDate ? 'border-convision-primary bg-white' : 'border-convision-primary bg-white',
              )}>
                <div>
                  <p className="text-[10px] font-medium text-[#a0a0ac]">Hasta</p>
                  {filters.endDate ? (
                    <p className="text-[13px] font-medium text-[#0f0f12]">
                      {format(new Date(filters.endDate + 'T00:00:00'), 'd MMM yyyy')}
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#a0a0ac]">Seleccionar...</p>
                  )}
                </div>
                <Calendar className="size-3.5 text-[#a0a0ac]" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {DATE_SHORTCUTS.map((s) => {
                const { start, end } = s.getDates();
                const active = filters.startDate === start && filters.endDate === end;
                return (
                  <button
                    key={s.label}
                    onClick={() => applyShortcut(s)}
                    className={cn(
                      'h-[26px] px-3 rounded-full text-[11px] border transition-colors',
                      active
                        ? 'bg-[#eff1ff] border-[#c5d3f8] text-convision-primary font-semibold'
                        : 'bg-[#f5f5f7] border-[#e0e0e4] text-[#7d7d87]',
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ESPECIALISTA */}
          <div className="px-6 pt-4 pb-4 border-b border-[#e8e8ec]">
            <p className="text-[10px] font-semibold text-[#a0a0ac] mb-3">ESPECIALISTA</p>
            {specialists.length === 0 ? (
              <p className="text-[12px] text-[#a0a0ac]">Cargando especialistas...</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {specialists.map((sp) => {
                  const selected = filters.specialistIds.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      onClick={() => toggleSpecialist(sp.id)}
                      className={cn(
                        'h-8 flex items-center gap-2 px-2 rounded-[8px] border text-[12px] transition-colors',
                        selected
                          ? 'bg-[#eff1ff] border-[#c5d3f8] text-convision-primary font-semibold'
                          : 'bg-[#f7f7f9] border-[#e0e0e4] text-[#52525c]',
                      )}
                    >
                      <div className={cn(
                        'size-4 rounded-[4px] flex items-center justify-center border shrink-0',
                        selected ? 'bg-convision-primary border-convision-primary' : 'bg-white border-[#dcdce0]',
                      )}>
                        {selected && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate">{sp.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ESTADO DE CITA */}
          <div className="px-6 pt-4 pb-4 border-b border-[#e8e8ec]">
            <p className="text-[10px] font-semibold text-[#a0a0ac] mb-3">ESTADO DE CITA</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => {
                const selected = filters.statuses.includes(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleStatus(s.value)}
                    className={cn(
                      'h-[30px] flex items-center gap-2 px-3 rounded-full border text-[11px] transition-colors',
                    )}
                    style={{
                      backgroundColor: selected ? s.bg : '#f5f5f7',
                      borderColor: selected ? s.border : '#e0e0e4',
                      color: selected ? s.color : '#52525c',
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: selected ? s.dot : '#b0b0bc' }}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BUSCAR PACIENTE */}
          <div className="px-6 pt-4 pb-5">
            <p className="text-[10px] font-semibold text-[#a0a0ac] mb-3">BUSCAR PACIENTE</p>
            <div className="flex items-center gap-2 border-[1.5px] border-[#dcdce0] rounded-[8px] px-3 h-[38px] bg-white">
              <Search className="size-3.5 text-[#b0b0bc] shrink-0" />
              <input
                className="flex-1 text-[12px] text-[#0f0f12] placeholder:text-[#b0b0bc] outline-none bg-transparent"
                placeholder="Nombre o número de documento..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#dcdce0] bg-[#fafafa] flex items-center justify-between px-5 h-16">
          <button
            onClick={clearAll}
            className="h-9 px-4 rounded-[8px] border border-[#e0e0e4] bg-white text-[12px] font-medium text-[#7d7d87] hover:bg-convision-background transition-colors"
          >
            Limpiar todo
          </button>

          {activeCount > 0 && (
            <div className="h-9 px-4 rounded-[8px] bg-[#eff1ff] flex items-center">
              <span className="text-[12px] font-semibold text-convision-primary">
                {activeCount} {activeCount === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
            </div>
          )}

          <button
            onClick={handleApply}
            className="h-9 px-5 rounded-[8px] bg-convision-primary text-white text-[13px] font-semibold shadow-[0px_4px_14px_0px_rgba(58,113,247,0.35)] hover:bg-convision-primary-dark transition-colors ml-auto"
          >
            Aplicar filtros →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentFilterModal;
