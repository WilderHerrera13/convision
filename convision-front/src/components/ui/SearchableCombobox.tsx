import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

const DEBOUNCE_MS = 300;

const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccione una opción',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados.',
  disabled = false,
  isLoading = false,
  onSearch,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = React.useState<number>(0);
  const isSelectingRef = React.useRef(false);

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    if (onSearch) return options;
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, onSearch]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (!onSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(q), DEBOUNCE_MS);
  };

  const handleOpenChange = (next: boolean) => {
    if (next && isSelectingRef.current) return;
    if (next && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
    if (!next) setQuery('');
    setOpen(next);
  };

  const handleSelect = (val: string) => {
    isSelectingRef.current = true;
    const match = options.find((o) => o.value.toLowerCase() === val.toLowerCase());
    const next = match ? match.value : val;
    if (next !== value) onChange(next);
    setOpen(false);
    setQuery('');
    requestAnimationFrame(() => { isSelectingRef.current = false; });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-[6px] border border-[#e0e0e5] bg-white px-3 text-[12px] transition-colors',
            'hover:border-[#c0c0c8] focus:outline-none focus:ring-2 focus:ring-[#8753ef]/20 focus:border-[#8753ef]',
            'disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:opacity-60',
            !value && 'text-[#b4b5bc]',
            value && 'text-[#121215]',
            className,
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 text-[#7d7d87] animate-spin" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#7d7d87]" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: triggerWidth > 0 ? triggerWidth : undefined }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={handleQueryChange}
            className="h-9 text-[12px]"
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-[12px] text-[#7d7d87]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando...
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty className="text-[12px] py-4">{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    onMouseDown={(e) => e.preventDefault()}
                    className="text-[12px] cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5 shrink-0',
                        value === option.value ? 'opacity-100 text-[#8753ef]' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span>{option.label}</span>
                      {option.sublabel && (
                        <span className="text-[10px] text-[#7d7d87] truncate">{option.sublabel}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableCombobox;
