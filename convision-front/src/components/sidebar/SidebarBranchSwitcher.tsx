import React, { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const SidebarBranchSwitcher: React.FC = () => {
  const { branchId, branchName, setBranch } = useBranch();
  const { branches } = useAuth();
  const [open, setOpen] = useState(false);

  if (!branchName && !branchId) return null;

  const canSwitch = branches.length > 1;

  const handleSelect = (id: number, name: string) => {
    setBranch(id, name);
    setOpen(false);
  };

  if (!canSwitch) {
    return (
      <div className="mx-3 mb-1 flex items-center gap-2 rounded-[6px] border border-convision-border-subtle bg-white px-[10px] py-[7px]">
        <Building2 className="size-3.5 shrink-0 text-convision-text-muted" />
        <span className="truncate text-[11px] font-medium text-convision-text-secondary leading-none">
          {branchName}
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="mx-3 mb-1 flex w-[calc(100%-24px)] items-center gap-2 rounded-[6px] border border-convision-border-subtle bg-white px-[10px] py-[7px] transition-colors hover:bg-convision-background"
          aria-label="Cambiar sede"
        >
          <Building2 className="size-3.5 shrink-0 text-[var(--role-primary)]" />
          <span className="flex-1 truncate text-left text-[11px] font-medium text-convision-text-secondary leading-none">
            {branchName}
          </span>
          <ChevronDown
            className={cn(
              'size-3 shrink-0 text-convision-text-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[220px] p-0"
      >
        <Command>
          <CommandInput placeholder="Buscar sede..." className="h-8 text-[12px]" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-[12px] text-convision-text-muted">
              Sin resultados.
            </CommandEmpty>
            {branches.map((branch) => (
              <CommandItem
                key={branch.id}
                value={branch.name}
                onSelect={() => handleSelect(branch.id, branch.name)}
                className="flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer"
              >
                <Building2 className="size-3.5 shrink-0 text-convision-text-muted" />
                <span className="flex-1 truncate">
                  {branch.name}
                  {branch.city ? ` — ${branch.city}` : ''}
                </span>
                {branchId === branch.id && (
                  <Check className="size-3.5 shrink-0 text-[var(--role-primary)]" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SidebarBranchSwitcher;
