import React, { useMemo } from 'react';
import { startOfDay } from 'date-fns';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/ui/date-picker';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import { AdminBranchFilter } from '@/components/admin/AdminBranchFilter';
import {
  computeAggregatedPreset,
  inferAggregatedPreset,
  type AggregatedPreset,
} from '@/components/admin/AdminDateRangeBranchBar';
import { branchService } from '@/services/branchService';

type User = { id: number; name: string; last_name?: string | null };

type Props = {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onClear: () => void;
  advisors?: User[];
  selectedAdvisorId?: string;
  onAdvisorChange?: (id: string) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  branchFilter?: string;
  onBranchChange?: (v: string) => void;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'submitted', label: 'Enviado' },
  { value: 'approved', label: 'Aprobado' },
];

const PRESETS: { key: AggregatedPreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7d' },
  { key: '14d', label: '14d' },
  { key: 'this_month', label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
];

const CashClosesFiltersBar: React.FC<Props> = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  advisors = [],
  selectedAdvisorId = 'all',
  onAdvisorChange,
  selectedStatus = 'all',
  onStatusChange,
  branchFilter = 'all',
  onBranchChange,
}) => {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listAll(),
  });

  const highlightedPreset = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    return inferAggregatedPreset(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  const handlePreset = (key: AggregatedPreset) => {
    if (key === 'custom') return;
    const { from, to } = computeAggregatedPreset(key);
    onDateFromChange(from);
    onDateToChange(to);
  };

  const handleFromChange = (d: Date | undefined) => {
    onDateFromChange(d ? startOfDay(d) : undefined);
  };

  const handleToChange = (d: Date | undefined) => {
    onDateToChange(d ? startOfDay(d) : undefined);
  };

  const advisorOptions: ComboboxOption[] = [
    { value: 'all', label: `Todos (${advisors.length})` },
    ...advisors.map((u) => ({
      value: String(u.id),
      label: `${u.name} ${u.last_name ?? ''}`.trim(),
    })),
  ];

  const statusOptions: ComboboxOption[] = STATUS_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const activeAdvisor =
    selectedAdvisorId !== 'all' ? advisors.find((u) => String(u.id) === selectedAdvisorId) : null;

  const activeStatusLabel =
    selectedStatus !== 'all'
      ? STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label ?? selectedStatus
      : null;

  const activeBranch =
    branchFilter !== 'all' ? branches.find((b) => String(b.id) === branchFilter) : null;

  const hasActiveFilters =
    dateFrom != null ||
    dateTo != null ||
    selectedAdvisorId !== 'all' ||
    selectedStatus !== 'all' ||
    branchFilter !== 'all';

  const singleBranchLabel = branches.length === 1 ? branches[0]?.name : null;

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex min-h-[44px] shrink-0 flex-wrap items-center gap-y-2 overflow-hidden rounded-[8px] border border-[#e0e0e4] bg-white py-1">
        <div className="flex min-h-[36px] items-center gap-[6px] border-r border-[#f0f0f2] px-[14px] py-1">
          <span className="text-[11px] font-semibold text-[#7d7d87]">Rango</span>
          <div className="[&_button]:h-[32px] [&_button]:w-[120px] [&_button]:border-[#e0e0e4] [&_button]:text-[12px] [&_input]:h-[32px] [&_input]:w-[120px] [&_input]:border-[#e0e0e4] [&_input]:text-[12px] [&_input]:text-[#0f0f12]">
            <DatePicker value={dateFrom} onChange={handleFromChange} placeholder="Desde" useInputTrigger />
          </div>
          <span className="text-[12px] text-[#7d7d87]">—</span>
          <div className="[&_button]:h-[32px] [&_button]:w-[120px] [&_button]:border-[#e0e0e4] [&_button]:text-[12px] [&_input]:h-[32px] [&_input]:w-[120px] [&_input]:border-[#e0e0e4] [&_input]:text-[12px] [&_input]:text-[#0f0f12]">
            <DatePicker value={dateTo} onChange={handleToChange} placeholder="Hasta" useInputTrigger />
          </div>
        </div>

        <div className="flex min-h-[36px] items-center gap-[4px] border-r border-[#f0f0f2] px-[10px] py-1">
          {PRESETS.map(({ key, label }) => {
            const isActive =
              key === 'custom'
                ? highlightedPreset === null && !!dateFrom && !!dateTo
                : highlightedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePreset(key)}
                className={`h-[28px] rounded-[99px] border px-[10px] text-[11px] transition-colors ${
                  isActive
                    ? 'border-[#3a71f7] bg-[#eff1ff] font-semibold text-[#3a71f7]'
                    : 'border-[#e0e0e4] bg-[#f5f5f6] font-normal text-[#7d7d87] hover:bg-[#eeeef1]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {onAdvisorChange && (
          <div className="flex min-h-[36px] min-w-[150px] flex-col justify-center border-r border-[#f0f0f2] px-[12px] py-1">
            <span className="text-[10px] font-medium tracking-[0.4px] text-[#7d7d87]">ASESOR</span>
            <SearchableCombobox
              options={advisorOptions}
              value={selectedAdvisorId}
              onChange={onAdvisorChange}
              placeholder={`Todos (${advisors.length})`}
              searchPlaceholder="Buscar asesor..."
              className="h-[20px] border-0 bg-transparent px-0 text-[11px] shadow-none hover:border-transparent focus:border-transparent focus:ring-0 [&>span]:text-left"
            />
          </div>
        )}

        {onStatusChange && (
          <div className="flex min-h-[36px] min-w-[120px] flex-col justify-center border-r border-[#f0f0f2] px-[12px] py-1">
            <span className="text-[10px] font-medium tracking-[0.4px] text-[#7d7d87]">ESTADO</span>
            <SearchableCombobox
              options={statusOptions}
              value={selectedStatus}
              onChange={onStatusChange}
              placeholder="Todos"
              searchPlaceholder="Buscar estado..."
              className="h-[20px] border-0 bg-transparent px-0 text-[11px] shadow-none hover:border-transparent focus:border-transparent focus:ring-0 [&>span]:text-left"
            />
          </div>
        )}

        {onBranchChange && (
          <div className="flex min-h-[36px] min-w-[130px] items-center border-r border-[#f0f0f2] px-[12px] py-1">
            {branches.length > 1 ? (
              <AdminBranchFilter
                value={branchFilter}
                onChange={onBranchChange}
                className="[&>span]:mb-0 [&>span]:text-[10px] [&>span]:font-medium [&>span]:normal-case [&>span]:tracking-[0.4px]"
              />
            ) : (
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-medium tracking-[0.4px] text-[#7d7d87]">SEDES</span>
                <span className="pt-0.5 text-[11px] text-[#0f0f12]">{singleBranchLabel ?? '—'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-[6px]">
          <span className="text-[11px] font-medium text-[#7d7d87]">Filtros activos</span>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                onDateFromChange(undefined);
                onDateToChange(undefined);
              }}
              className="flex h-[22px] items-center gap-[4px] rounded-full bg-[#eff1ff] px-[8px] text-[11px] font-semibold text-[#3a71f7] hover:bg-[#dce5ff]"
            >
              {dateFrom && dateTo
                ? `${dateFrom.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} — ${dateTo.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : dateFrom
                  ? `Desde ${dateFrom.toLocaleDateString('es-CO')}`
                  : `Hasta ${dateTo!.toLocaleDateString('es-CO')}`}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeAdvisor && (
            <button
              type="button"
              onClick={() => onAdvisorChange?.('all')}
              className="flex h-[22px] items-center gap-[4px] rounded-full bg-[#eff1ff] px-[8px] text-[11px] font-semibold text-[#3a71f7] hover:bg-[#dce5ff]"
            >
              {`${activeAdvisor.name} ${activeAdvisor.last_name ?? ''}`.trim()}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeStatusLabel && (
            <button
              type="button"
              onClick={() => onStatusChange?.('all')}
              className="flex h-[22px] items-center gap-[4px] rounded-full bg-[#eff1ff] px-[8px] text-[11px] font-semibold text-[#3a71f7] hover:bg-[#dce5ff]"
            >
              {activeStatusLabel}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeBranch && (
            <button
              type="button"
              onClick={() => onBranchChange?.('all')}
              className="flex h-[22px] items-center gap-[4px] rounded-full bg-[#eff1ff] px-[8px] text-[11px] font-semibold text-[#3a71f7] hover:bg-[#dce5ff]"
            >
              {activeBranch.name}
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="ml-1 text-[11px] font-medium text-[#7d7d87] underline-offset-2 hover:text-[#0f0f12] hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
};

export default CashClosesFiltersBar;
