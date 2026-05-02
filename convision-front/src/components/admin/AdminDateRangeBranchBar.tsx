import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfMonth, endOfMonth, startOfDay, isSameDay } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { AdminBranchFilter } from '@/components/admin/AdminBranchFilter';
import { branchService } from '@/services/branchService';

export type AggregatedPreset = 'today' | '7d' | '14d' | 'this_month' | 'custom';

const PRESET_KEYS: AggregatedPreset[] = ['today', '7d', '14d', 'this_month', 'custom'];

const PRESET_LABELS: Record<AggregatedPreset, string> = {
  today: 'Hoy',
  '7d': '7d',
  '14d': '14d',
  this_month: 'Mes',
  custom: 'Personalizado',
};

export function computeAggregatedPreset(preset: AggregatedPreset): { from: Date; to: Date } {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: subDays(today, 6), to: today };
    case '14d':
      return { from: subDays(today, 13), to: today };
    case 'this_month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    default:
      return { from: today, to: today };
  }
}

export function formatRangeYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function inferAggregatedPreset(from: Date, to: Date): AggregatedPreset | null {
  for (const key of ['today', '7d', '14d', 'this_month'] as const) {
    const r = computeAggregatedPreset(key);
    if (isSameDay(from, r.from) && isSameDay(to, r.to)) return key;
  }
  return null;
}

interface AdminDateRangeBranchBarProps {
  dateFrom: Date;
  dateTo: Date;
  onRangeChange: (from: Date, to: Date) => void;
  branchFilter?: string;
  onBranchChange?: (v: string) => void;
  statusRight?: string;
}

export const AdminDateRangeBranchBar: React.FC<AdminDateRangeBranchBarProps> = ({
  dateFrom,
  dateTo,
  onRangeChange,
  branchFilter = 'all',
  onBranchChange,
  statusRight,
}) => {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listAll(),
  });

  const highlightedPreset = useMemo(() => inferAggregatedPreset(dateFrom, dateTo), [dateFrom, dateTo]);

  const handlePreset = (key: AggregatedPreset) => {
    if (key === 'custom') return;
    const { from, to } = computeAggregatedPreset(key);
    onRangeChange(from, to);
  };

  const handleFromChange = (d: Date | undefined) => {
    if (!d) return;
    onRangeChange(startOfDay(d), dateTo);
  };

  const handleToChange = (d: Date | undefined) => {
    if (!d) return;
    onRangeChange(dateFrom, startOfDay(d));
  };

  return (
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
        {PRESET_KEYS.map((key) => {
          const isActive =
            key === 'custom'
              ? highlightedPreset === null
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
              {PRESET_LABELS[key]}
            </button>
          );
        })}
      </div>

      {onBranchChange && (
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
              <span className="pt-0.5 text-[11px] text-[#0f0f12]">{branches[0]?.name ?? '—'}</span>
            </div>
          )}
        </div>
      )}

      {statusRight && (
        <span className="min-w-0 flex-1 truncate px-[14px] text-right text-[10px] text-[#7d7d87]">
          {statusRight}
        </span>
      )}
    </div>
  );
};
