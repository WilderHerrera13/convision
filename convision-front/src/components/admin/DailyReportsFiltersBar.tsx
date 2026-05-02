import React, { useMemo } from 'react';
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
import type { User } from '@/services/userService';

const PRESETS: { key: AggregatedPreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7d' },
  { key: '14d', label: '14d' },
  { key: 'this_month', label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
];

function fullName(u: User): string {
  return `${u.name} ${u.last_name ?? ''}`.trim();
}

interface Props {
  dateFrom: Date;
  dateTo: Date;
  onRangeChange: (from: Date, to: Date) => void;
  users: User[];
  selectedUserId: string;
  onUserChange: (id: string) => void;
  branchFilter: string;
  onBranchChange: (v: string) => void;
  statusRight?: string;
}

const DailyReportsFiltersBar: React.FC<Props> = ({
  dateFrom,
  dateTo,
  onRangeChange,
  users,
  selectedUserId,
  onUserChange,
  branchFilter,
  onBranchChange,
  statusRight,
}) => {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listAll(),
  });

  const inferredPreset = useMemo(() => inferAggregatedPreset(dateFrom, dateTo), [dateFrom, dateTo]);

  const handlePreset = (key: AggregatedPreset) => {
    if (key === 'custom') return;
    const { from, to } = computeAggregatedPreset(key);
    onRangeChange(from, to);
  };

  const handleFromChange = (d: Date | undefined) => {
    if (!d) return;
    onRangeChange(d, dateTo);
  };

  const handleToChange = (d: Date | undefined) => {
    if (!d) return;
    onRangeChange(dateFrom, d);
  };

  const receptionists = users.filter((u) => u.role === 'receptionist');

  const userOptions: ComboboxOption[] = [
    { value: 'all', label: `Todos (${receptionists.length})` },
    ...receptionists.map((u) => ({
      value: String(u.id),
      label: fullName(u),
    })),
  ];

  const activeUser =
    selectedUserId !== 'all' ? receptionists.find((u) => String(u.id) === selectedUserId) : null;

  const activeBranch =
    branchFilter !== 'all' ? branches.find((b) => String(b.id) === branchFilter) : null;

  const hasActiveFilters = selectedUserId !== 'all' || branchFilter !== 'all';

  const singleBranchLabel = branches.length === 1 ? branches[0]?.name : null;

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex h-[44px] shrink-0 items-center overflow-hidden rounded-[8px] border border-[#e0e0e4] bg-white">
        <div className="flex h-full items-center gap-[6px] border-r border-[#f0f0f2] px-[14px]">
          <span className="text-[11px] font-semibold text-[#7d7d87]">Rango</span>
          <div className="[&_button]:h-[32px] [&_button]:w-[120px] [&_button]:border-[#e0e0e4] [&_button]:text-[12px] [&_input]:h-[32px] [&_input]:w-[120px] [&_input]:border-[#e0e0e4] [&_input]:text-[12px] [&_input]:text-[#0f0f12]">
            <DatePicker value={dateFrom} onChange={handleFromChange} placeholder="Desde" useInputTrigger />
          </div>
          <span className="text-[12px] text-[#7d7d87]">—</span>
          <div className="[&_button]:h-[32px] [&_button]:w-[120px] [&_button]:border-[#e0e0e4] [&_button]:text-[12px] [&_input]:h-[32px] [&_input]:w-[120px] [&_input]:border-[#e0e0e4] [&_input]:text-[12px] [&_input]:text-[#0f0f12]">
            <DatePicker value={dateTo} onChange={handleToChange} placeholder="Hasta" useInputTrigger />
          </div>
        </div>

        <div className="flex h-full items-center gap-[4px] border-r border-[#f0f0f2] px-[10px]">
          {PRESETS.map(({ key, label }) => {
            const isActive =
              key === 'custom'
                ? inferredPreset === null
                : inferredPreset === key;
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

        <div className="flex h-full min-w-[150px] flex-col justify-center border-r border-[#f0f0f2] px-[12px]">
          <span className="text-[10px] font-medium tracking-[0.4px] text-[#7d7d87]">ASESOR</span>
          <SearchableCombobox
            options={userOptions}
            value={selectedUserId}
            onChange={onUserChange}
            placeholder={`Todos (${receptionists.length})`}
            searchPlaceholder="Buscar asesor..."
            className="h-[20px] border-0 bg-transparent px-0 text-[11px] shadow-none hover:border-transparent focus:border-transparent focus:ring-0 [&>span]:text-left"
          />
        </div>

        <div className="flex h-full min-w-[130px] items-center border-r border-[#f0f0f2] px-[12px]">
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

        {statusRight && (
          <span className="min-w-0 flex-1 truncate px-[14px] text-right text-[10px] text-[#7d7d87]">
            {statusRight}
          </span>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-[6px]">
          <span className="text-[11px] font-medium text-[#7d7d87]">Filtros activos</span>
          {activeUser && (
            <button
              type="button"
              onClick={() => onUserChange('all')}
              className="flex h-[22px] items-center gap-[4px] rounded-full bg-[#eff1ff] px-[8px] text-[11px] font-semibold text-[#3a71f7] hover:bg-[#dce5ff]"
            >
              {fullName(activeUser)}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeBranch && (
            <button
              type="button"
              onClick={() => onBranchChange('all')}
              className="flex h-[22px] items-center gap-[4px] rounded-full bg-[#eff1ff] px-[8px] text-[11px] font-semibold text-[#3a71f7] hover:bg-[#dce5ff]"
            >
              {activeBranch.name}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyReportsFiltersBar;
