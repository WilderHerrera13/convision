import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { User } from '@/services/userService';

function fullName(u: User): string {
  return `${u.name} ${u.last_name ?? ''}`.trim();
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** Listado de usuarios; solo se muestran los de rol recepción. */
  users: User[];
  className?: string;
  triggerClassName?: string;
};

/**
 * Selector buscable de asesores (usuarios recepción) para filtros admin.
 */
const ReceptionistAdvisorCombobox: React.FC<Props> = ({
  value,
  onChange,
  users,
  className,
  triggerClassName,
}) => {
  const [open, setOpen] = React.useState(false);

  const receptionists = React.useMemo(
    () =>
      [...users.filter((u) => u.role === 'receptionist')].sort((a, b) =>
        fullName(a).localeCompare(fullName(b), 'es'),
      ),
    [users],
  );

  const selectedLabel = React.useMemo(() => {
    if (value === 'all') return 'Todos los asesores';
    const id = Number.parseInt(value, 10);
    if (!Number.isFinite(id)) return 'Todos los asesores';
    const u = receptionists.find((x) => x.id === id);
    return u ? fullName(u) : 'Todos los asesores';
  }, [value, receptionists]);

  return (
    <div className={cn('min-w-0', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Filtrar por asesor de recepción"
            className={cn(
              'h-9 w-[240px] justify-between rounded-[7px] border-[#dcdce0] bg-white px-3 font-normal text-[#121215]',
              triggerClassName,
            )}
          >
            <span className="truncate text-left text-[12px]">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="end">
          <Command>
            <CommandInput placeholder="Buscar por nombre…" className="h-9 text-[13px]" />
            <CommandList>
              <CommandEmpty>No hay coincidencias.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="todos los asesores recepcion"
                  onSelect={() => {
                    onChange('all');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', value === 'all' ? 'opacity-100' : 'opacity-0')} />
                  Todos los asesores
                </CommandItem>
                {receptionists.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${fullName(u)} ${u.id}`}
                    onSelect={() => {
                      onChange(String(u.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === String(u.id) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {fullName(u)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ReceptionistAdvisorCombobox;
