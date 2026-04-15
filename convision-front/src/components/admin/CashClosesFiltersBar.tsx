import React from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const dateTriggerClass =
  '[&>div]:!space-y-0 [&_input]:h-7 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-[12px] [&_input]:text-[#7d7d87] [&_input]:shadow-none [&_input]:focus-visible:ring-0';

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
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Estado: Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'submitted', label: 'Enviado' },
  { value: 'approved', label: 'Aprobado' },
];

const selectTriggerClass =
  'h-[30px] rounded-[6px] border-[#dcdce0] bg-[#f5f5f7] px-[9px] text-[12px] text-[#7d7d87] shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:text-[12px]';

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
}) => (
  <div className="flex h-[44px] shrink-0 items-center gap-2 rounded-[8px] border border-[#e5e5e9] bg-white px-3">
    <div className="flex h-[30px] w-[160px] items-center gap-1 rounded-[6px] border border-[#dcdce0] bg-[#f5f5f7] px-[9px]">
      <span className="whitespace-nowrap text-[12px] text-[#7d7d87]">Desde:</span>
      <div className={`min-w-0 flex-1 ${dateTriggerClass}`}>
        <DatePicker value={dateFrom} onChange={onDateFromChange} placeholder="—" useInputTrigger />
      </div>
    </div>
    <div className="flex h-[30px] w-[160px] items-center gap-1 rounded-[6px] border border-[#dcdce0] bg-[#f5f5f7] px-[9px]">
      <span className="whitespace-nowrap text-[12px] text-[#7d7d87]">Hasta:</span>
      <div className={`min-w-0 flex-1 ${dateTriggerClass}`}>
        <DatePicker value={dateTo} onChange={onDateToChange} placeholder="—" useInputTrigger />
      </div>
    </div>
    {onAdvisorChange && (
      <Select value={selectedAdvisorId} onValueChange={onAdvisorChange}>
        <SelectTrigger className={`w-[140px] ${selectTriggerClass}`}>
          <SelectValue placeholder="Asesor: Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Asesor: Todos</SelectItem>
          {advisors.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.name} {u.last_name ?? ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
    {onStatusChange && (
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className={`w-[140px] ${selectTriggerClass}`}>
          <SelectValue placeholder="Estado: Todos" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
    {(dateFrom || dateTo || selectedAdvisorId !== 'all' || selectedStatus !== 'all') && (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs text-[#7d7d87] hover:text-[#0f0f12]"
        onClick={onClear}
      >
        Limpiar
      </Button>
    )}
  </div>
);

export default CashClosesFiltersBar;
