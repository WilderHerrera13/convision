import { useState, useRef, useEffect } from 'react';
import Select, { StylesConfig, components, DropdownIndicatorProps, SingleValue, NoticeProps } from 'react-select';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allOptionLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onSearch?: (inputValue: string) => void;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  className = "",
  allOptionLabel = "Mostrar todos",
  isLoading = false,
  disabled = false,
  onSearch
}: SearchableSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSearch = useRef<string>("");
  
  // Debug logs for options
  console.log("SearchableSelect options:", options);
  
  // Effect to trigger an empty search on mount if options are empty and we have a search function
  useEffect(() => {
    if (Array.isArray(options) && options.length === 0 && onSearch && !hasAttemptedSearch) {
      console.log("No options available, triggering initial search");
      onSearch("");
      setHasAttemptedSearch(true);
    }
  }, [options, onSearch, hasAttemptedSearch]);
  
  // Add the "All" option at the beginning of the options array
  const allOptions: SelectOption[] = [
    { value: "all", label: allOptionLabel },
    ...(Array.isArray(options) ? options : [])
  ];
  
  // Find the currently selected option
  const selectedOption = value 
    ? allOptions.find(option => option.value === value) 
    : allOptions[0];
  
  // Custom styles to match the application's design
  const customStyles: StylesConfig<SelectOption, false> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '32px',
      height: '32px',
      fontSize: '0.875rem',
      borderRadius: '0.375rem',
      borderColor: state.isFocused ? 'var(--primary-500)' : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 1px var(--primary-500)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? 'var(--primary-500)' : 'hsl(var(--input))'
      },
      backgroundColor: disabled ? 'hsl(var(--muted))' : 'transparent'
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: '32px',
      padding: '0 8px',
      display: 'flex',
      alignItems: 'center'
    }),
    input: (provided) => ({
      ...provided,
      margin: '0',
      padding: '0'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: '32px'
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: '0 8px'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 50,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      boxShadow: 'var(--shadow-md)'
    }),
    option: (provided, state) => ({
      ...provided,
      padding: '8px 12px',
      fontSize: '0.875rem',
      cursor: 'pointer',
      backgroundColor: state.isSelected 
        ? 'hsl(var(--primary)/10%)' 
        : state.isFocused 
          ? 'hsl(var(--muted))' 
          : 'transparent',
      color: state.isSelected 
        ? 'hsl(var(--primary))' 
        : 'hsl(var(--foreground))',
      '&:active': {
        backgroundColor: 'hsl(var(--primary)/15%)'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))'
    })
  };
  
  // Add search icon to the input
  const DropdownIndicator = (props: DropdownIndicatorProps<SelectOption, false>) => {
    if (isLoading) {
      return (
        <components.DropdownIndicator {...props}>
          <RefreshCw size={14} className="text-muted-foreground animate-spin" />
        </components.DropdownIndicator>
      );
    }
    return (
      <components.DropdownIndicator {...props}>
        <Search size={14} className="text-muted-foreground" />
      </components.DropdownIndicator>
    );
  };
  
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    
    // Avoid duplicate searches for the same term or empty/very short terms
    if (
      !onSearch || 
      newValue === lastSearch.current ||
      (newValue.trim().length < 2 && newValue.trim() !== '')
    ) {
      return;
    }
    
    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Debounce search to reduce API calls
    searchTimeout.current = setTimeout(() => {
      lastSearch.current = newValue;
      onSearch(newValue);
      setHasAttemptedSearch(true);
    }, 400); // 400ms debounce
  };
  
  // Handle dropdown menu opening - avoid unnecessary API calls
  const handleMenuOpen = () => {
    // Only trigger search when opening the menu if:
    // 1. We have a search function
    // 2. We don't have many options already loaded (to avoid redundant API calls)
    // 3. We haven't recently searched
    const shouldSearchOnOpen = 
      onSearch && 
      options.length < 5 && 
      lastSearch.current === "" && 
      !isLoading;
    
    if (shouldSearchOnOpen) {
      lastSearch.current = "";
      onSearch("");
      setHasAttemptedSearch(true);
    }
  };
  
  // Custom NoOptionsMessage component to show a more helpful message
  const NoOptionsMessage = (props: NoticeProps<SelectOption, false>) => {
    return (
      <components.NoOptionsMessage {...props}>
        <div className="text-xs text-center py-1">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
              <span>Cargando opciones...</span>
            </div>
          ) : Array.isArray(options) && options.length === 0 ? (
            <div>
              {hasAttemptedSearch ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center text-amber-600 mb-1">
                    <AlertCircle size={12} className="mr-1" />
                    <span>No hay opciones disponibles</span>
                  </div>
                  {onSearch && (
                    <button 
                      className="text-[10px] text-primary flex items-center mt-1 hover:underline"
                      onClick={() => onSearch("")}
                    >
                      <RefreshCw size={10} className="mr-1" />
                      Intentar cargar de nuevo
                    </button>
                  )}
                </div>
              ) : (
                <div>Sin opciones disponibles</div>
              )}
            </div>
          ) : (
            <div>No se encontraron resultados</div>
          )}
        </div>
      </components.NoOptionsMessage>
    );
  };
  
  return (
    <div className={className}>
      <Select<SelectOption, false>
        options={allOptions}
        value={selectedOption}
        onChange={(option: SingleValue<SelectOption>) => {
          if (option) {
            onChange(option.value === 'all' ? undefined : option.value);
          } else {
            onChange(undefined);
          }
        }}
        onInputChange={handleInputChange}
        inputValue={inputValue}
        placeholder={placeholder}
        isSearchable={true}
        isClearable={false}
        isLoading={isLoading}
        isDisabled={disabled}
        components={{ 
          DropdownIndicator,
          NoOptionsMessage
        }}
        styles={customStyles}
        className="react-select-container"
        classNamePrefix="react-select"
        noOptionsMessage={() => "No se encontraron resultados"}
        loadingMessage={() => "Cargando..."}
        onMenuOpen={handleMenuOpen}
        filterOption={(option, input) => {
          // Custom filter to prevent excessive searches
          if (!input || input.length < 2) {
            return true; // Show all options when input is too short
          }
          
          // Default filtering behavior
          return option.label.toLowerCase().includes(input.toLowerCase());
        }}
      />
    </div>
  );
};

export default SearchableSelect; 