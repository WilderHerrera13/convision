import * as React from 'react';
import { cn } from '@/lib/utils';
import type { User } from '@/services/userService';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';

function fullName(u: User): string {
  return `${u.name} ${u.last_name ?? ''}`.trim();
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  users: User[];
  className?: string;
  triggerClassName?: string;
};

const ReceptionistAdvisorCombobox: React.FC<Props> = ({
  value,
  onChange,
  users,
  className,
  triggerClassName,
}) => {
  const receptionists = React.useMemo(
    () =>
      [...users.filter((u) => u.role === 'receptionist')].sort((a, b) =>
        fullName(a).localeCompare(fullName(b), 'es'),
      ),
    [users],
  );

  const options = React.useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: 'Todos los asesores' },
      ...receptionists.map((u) => ({
        value: String(u.id),
        label: fullName(u),
      })),
    ],
    [receptionists],
  );

  return (
    <div className={cn('min-w-0', className)}>
      <SearchableCombobox
        options={options}
        value={value}
        onChange={onChange}
        placeholder="Todos los asesores"
        searchPlaceholder="Buscar por nombre..."
        className={cn(
          'h-9 w-[240px] rounded-[7px] border-[#dcdce0] bg-white px-3 font-normal text-[#121215]',
          triggerClassName,
        )}
      />
    </div>
  );
};

export default ReceptionistAdvisorCombobox;
