import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal,
  Search,
  X,
  Plus,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import Pagination from '@/components/ui/pagination';

export type ColumnType = 'text' | 'number' | 'date' | 'datetime' | 'money' | 'boolean' | 'status' | 'actions' | 'custom';

export type ActionItem = {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  show?: (row: any) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
};

export type DataTableColumnDef<T = any> = {
  id: string;
  header: string;
  type: ColumnType;
  accessorKey?: string;
  accessorFn?: (row: T) => any;
  cell?: (row: T) => React.ReactNode;
  enableSorting?: boolean;
  sortingFn?: (a: T, b: T) => number;
  statusVariants?: Record<string, string>;
  statusLabels?: Record<string, string>;
  actions?: ActionItem[];
  className?: string;
  /** Clases extra en la celda de cabecera (ledger: alineación o peso distinto al cuerpo). */
  headerClassName?: string;
  moneyFormat?: {
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  };
};

export type DataTableProps<T = any> = {
  columns: DataTableColumnDef<T>[];
  data: T[];
  // Support both loading property names for backward compatibility
  loading?: boolean;
  isLoading?: boolean;
  error?: string;
  onRowClick?: (row: T) => void;
  // Title and description
  title?: string;
  description?: string;
  // Pagination options (support both styles)
  enablePagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    onPageChange: (page: number) => void;
  };
  onPageChange?: (page: number) => void;
  // Search options
  enableSearch?: boolean;
  searchable?: boolean;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  // Empty state
  emptyMessage?: string;
  emptyState?: {
    message: string;
  };
  emptyStateContent?: React.ReactNode;
  // Loading state
  loadingMessage?: string;
  loadingState?: {
    message: string;
  };
  // Other options
  addNewButton?: {
    label: string;
    onClick: () => void;
  };
  filters?: React.ReactNode;
  onShowFilters?: () => void;
  enableSorting?: boolean;
  className?: string;
  /** Tablas tipo listado admin: cabecera gris y filas tipo ledger. */
  tableLayout?: 'default' | 'ledger';
  /**
   * `grid`: celdas con bordes verticales (listados caja).
   * `figma`: solo líneas horizontales (#e5e5e9), sin rejilla vertical — DS `780:1162`.
   */
  ledgerBorderMode?: 'grid' | 'figma';
  /** Clases en `<table>` (p. ej. `table-fixed min-w-[1120px]`). */
  tableClassName?: string;
  /** Texto izquierda del footer de paginación (ej. Mostrando 1–10 de 47 resultados) */
  paginationSummary?: { from: number; to: number; total: number } | null;
  paginationVariant?: 'default' | 'figma';
  /** Nombre accesible de la tabla para lectores de pantalla */
  tableAriaLabel?: string;
  /** Contenedor con scroll vertical alrededor de la tabla (listados tipo Figma con altura fija). */
  tableScrollClassName?: string;
};

const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  isLoading,
  error,
  onRowClick,
  title,
  description,
  // Pagination
  enablePagination = false,
  currentPage = 1,
  totalPages = 1,
  pagination,
  onPageChange,
  // Search
  enableSearch = false,
  searchable = false,
  onSearch,
  searchPlaceholder = "Buscar...",
  // Empty state
  emptyMessage,
  emptyState = { message: emptyMessage || "No se encontraron elementos" },
  emptyStateContent,
  // Loading state
  loadingMessage,
  loadingState = { message: loadingMessage || "Cargando..." },
  // Other options
  addNewButton,
  filters,
  onShowFilters,
  enableSorting = true,
  className = "",
  tableLayout = 'default',
  paginationSummary = null,
  paginationVariant = 'default',
  tableAriaLabel,
  tableScrollClassName,
  ledgerBorderMode = 'grid',
  tableClassName,
}: DataTableProps<T>) => {
  // Use either loading or isLoading for backward compatibility
  const isLoadingData = isLoading !== undefined ? isLoading : loading;
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Convert our custom columns to react-table compatible columns
  const tableColumns = React.useMemo(() => {
    return columns.map(column => {
      const baseColumn: any = {
        id: column.id,
        header: ({ column: col }: any) => {
          const isSortable = column.enableSorting !== false && enableSorting;
          return isSortable ? (
            <Button
              variant="ghost"
              onClick={() => col.toggleSorting()}
              className="h-full w-full justify-start font-medium p-0 hover:bg-transparent"
            >
              {column.header}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            column.header
          );
        },
      };
      
      if (column.accessorKey) {
        baseColumn.accessorKey = column.accessorKey;
      } else if (column.accessorFn) {
        baseColumn.accessorFn = column.accessorFn;
      } else {
        baseColumn.accessorKey = column.id;
      }
      
      // Handle different cell rendering patterns
      if (column.cell) {
        baseColumn.cell = ({ row }: any) => column.cell?.(row.original);
      } else {
        // Default cell rendering using our renderCellContent function
        baseColumn.cell = ({ row }: any) => renderCellContent(row.original, column);
      }
      
      return baseColumn as ColumnDef<T>;
    });
  }, [columns, enableSorting]);

  const isLedger = tableLayout === 'ledger';
  const ledgerFigma = isLedger && ledgerBorderMode === 'figma';
  /** Contenedor ancho completo; tabla + pie de paginación comparten el mismo ancho que el card. */
  const ledgerFigmaShellClass = ledgerFigma ? 'w-full' : '';

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    enableSorting,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onSearch && searchTerm !== undefined) {
        onSearch(searchTerm);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, onSearch]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    if (onSearch) {
      onSearch("");
    }
  };

  const renderCellContent = (row: T, column: DataTableColumnDef<T>) => {
    // Get value using accessorKey or accessorFn
    let value;
    
    if (column.accessorKey && column.accessorKey.includes('.')) {
      const parts = column.accessorKey.split('.');
      let current: any = row;
      for (const part of parts) {
        if (current && current[part] !== undefined) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }
      value = current;
    } else if (column.accessorKey) {
      value = row[column.accessorKey];
    } else if (column.accessorFn) {
      value = column.accessorFn(row);
    }

    // If column has custom cell renderer
    if (column.cell) {
      return column.cell(row);
    }

    // Default rendering based on column type
    switch (column.type) {
      case 'date':
        return value ? formatDate(value) : '—';
      
      case 'datetime': {
        try {
          if (!value) return '—';
          const date = typeof value === 'string' ? parseISO(value) : new Date(value);
          return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
        } catch (error) {
          console.error('Error formatting datetime:', error);
          return '—';
        }
      }
      
      case 'money': {
        if (value === undefined || value === null) return '—';
        const mf = column.moneyFormat;
        return formatCurrency(Number(value), mf?.currency ?? 'COP', {
          minimumFractionDigits: mf?.minimumFractionDigits ?? 0,
          maximumFractionDigits: mf?.maximumFractionDigits ?? 2,
        });
      }
      
      case 'boolean':
        return value ? 'Sí' : 'No';
      
      case 'status': {
        if (!value || !column.statusVariants) return '—';
        const variant = column.statusVariants[value as string] || 'default';
        const label = column.statusLabels?.[value as string] || value;
        return <Badge variant={variant as "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "info"}>{label}</Badge>;
      }
      
      case 'actions': {
        if (!column.actions) return null;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {column.actions
                  .filter(action => !action.show || action.show(row))
                  .map((action, i) => (
                    <DropdownMenuItem 
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(row);
                      }}
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  ))
                }
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
      
      default:
        return value !== undefined && value !== null ? value : '—';
    }
  };

  // Get pagination props from either style
  const paginationEnabled = enablePagination || (pagination && pagination.pageCount > 1);
  const currentPageValue = pagination ? pagination.pageIndex : currentPage;
  const totalPagesValue = pagination ? pagination.pageCount : totalPages;
  const handlePageChange = pagination ? pagination.onPageChange : onPageChange;

  // Determine if search is enabled
  const isSearchEnabled = searchable || enableSearch;

  return (
    <Card
      className={
        isLedger
          ? `${className} overflow-hidden rounded-lg border border-[#e5e5e9] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]`
          : className
      }
    >
      {(title || description || isSearchEnabled || addNewButton) && (
        <CardHeader className={`${(isSearchEnabled || addNewButton) ? 'flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0' : ''}`}>
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {isSearchEnabled && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-8 pr-8 max-w-xs"
                />
                {searchTerm && (
                  <button 
                    className="absolute right-2 top-2.5"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {onShowFilters && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onShowFilters}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            )}
            
            {addNewButton && (
              <Button 
                onClick={addNewButton.onClick}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addNewButton.label}
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      {filters && (
        <CardContent className="border-t pt-4">
          {filters}
        </CardContent>
      )}
      
      <CardContent className="p-0">
        <div className={cn(ledgerFigmaShellClass, tableScrollClassName)}>
        <Table className={cn('w-full', tableClassName)} aria-label={tableAriaLabel}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={
                  isLedger
                    ? 'border-0 bg-[#f5f5f6] hover:bg-[#f5f5f6]'
                    : 'bg-muted/50 hover:bg-muted'
                }
              >
                {headerGroup.headers.map((header) => {
                  const col = columns.find((c) => c.id === header.column.id);
                  return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      isLedger && ledgerFigma &&
                        'h-9 border-b border-[#e5e5e9] px-3 py-0 text-left text-[11px] font-semibold text-[#7d7d87]',
                      isLedger && !ledgerFigma &&
                        'h-9 border-b border-r border-[#dcdce0] px-3 py-0 text-left text-[11px] font-semibold text-[#7d7d87] last:border-r-0',
                      !isLedger && 'py-3 px-4 text-sm font-medium text-muted-foreground',
                      col?.className,
                      col?.headerClassName,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoadingData ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-row-${index}`}>
                  {columns.map((column, colIdx) => (
                    <TableCell key={`loading-${index}-${column.id ?? column.accessorKey ?? colIdx}`} className="py-2 px-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyStateContent ?? (
                    <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                      {emptyState.message}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow 
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick && onRowClick(row.original as T)}
                  className={
                    isLedger && ledgerFigma
                      ? `border-0 bg-white ${onRowClick ? 'cursor-pointer hover:bg-[#f5f5f7]' : ''}`
                      : isLedger
                        ? `border-0 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f7]'} ${onRowClick ? 'cursor-pointer hover:bg-[#ebebef]' : ''}`
                        : `${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        isLedger && ledgerFigma &&
                          'h-12 border-b border-[#e5e5e9] px-3 py-0 align-middle text-[13px]',
                        isLedger && !ledgerFigma &&
                          'h-12 border-b border-r border-[#dcdce0] px-3 py-0 align-middle text-[13px] last:border-r-0',
                        !isLedger && 'py-3 px-4',
                        columns.find((col) => col.id === cell.column.id)?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      
      {paginationEnabled && handlePageChange && (
        <CardFooter
          className={
            isLedger
              ? cn(
                  'flex h-12 items-center justify-between border-t border-[#e5e5e9] bg-white px-5 py-0',
                  ledgerFigmaShellClass,
                )
              : 'flex items-center justify-between pt-4'
          }
        >
          <div
            className={
              isLedger
                ? 'flex flex-wrap items-center gap-1.5 text-[12px] text-[#7d7d87]'
                : 'text-sm text-muted-foreground'
            }
          >
            {paginationSummary ? (
              paginationSummary.total === 0 ? (
                <span>Sin resultados</span>
              ) : (
                <>
                  <span>Mostrando</span>
                  <span className="rounded bg-[#f5f5f6] px-1.5 py-0.5 text-[12px] font-semibold text-[#121215]">
                    {paginationSummary.from}–{paginationSummary.to}
                  </span>
                  <span>de {paginationSummary.total} resultados</span>
                </>
              )
            ) : (
              <>Página {currentPageValue} de {totalPagesValue}</>
            )}
          </div>
          <Pagination
            currentPage={currentPageValue}
            totalPages={totalPagesValue}
            onPageChange={handlePageChange}
            variant={paginationVariant}
          />
        </CardFooter>
      )}
    </Card>
  );
};

export default DataTable; 