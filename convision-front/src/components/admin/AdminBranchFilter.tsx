import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import { branchService } from '@/services/branchService';

interface AdminBranchFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function AdminBranchFilter({ value, onChange, className }: AdminBranchFilterProps) {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listAll(),
  });

  const sedeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: `Todas (${branches.length})` },
      ...branches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [branches],
  );

  if (branches.length <= 1) return null;

  return (
    <div className={`flex flex-col leading-none shrink-0 w-[130px] ${className ?? ''}`}>
      <span className="text-[10px] font-medium text-[#7d7d87] tracking-[0.4px] mb-0.5">
        SEDES
      </span>
      <SearchableCombobox
        options={sedeOptions}
        value={value}
        onChange={onChange}
        placeholder="Todas"
        searchPlaceholder="Buscar sede..."
        className="h-[22px] border-0 bg-transparent rounded-none px-0 text-[11px] shadow-none hover:border-transparent focus:border-transparent focus:ring-0 [&>span]:text-left"
      />
    </div>
  );
}
