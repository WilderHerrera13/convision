import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import DataTable, { DataTableColumnDef } from '@/components/ui/data-table/DataTable';
import { EmptyState } from '@/components/ui/empty-state';

export type PaginatedResult<T> = {
  data: T[];
  last_page: number;
  /** Total de registros (Laravel meta.total) para pie de tabla tipo Figma */
  total?: number;
};

type FetchParams = {
  page: number;
  per_page: number;
  search?: string;
  filters?: Record<string, unknown>;
};

type EntityTableProps<T> = {
  title?: string;
  columns: DataTableColumnDef<T>[];
  /**
   * Fetcher que retorna { data, last_page }
   */
  fetcher: (params: FetchParams) => Promise<PaginatedResult<T>>;
  queryKeyBase: string;
  onRowClick?: (row: T) => void;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  perPageOptions?: number[];
  initialPerPage?: number;
  extraFilters?: Record<string, unknown>;
  /** Node rendered when there are no results and no active search */
  emptyStateNode?: React.ReactNode;
  /** Node rendered when there are no results due to an active search/filter */
  filterEmptyStateNode?: React.ReactNode;
  showPageSizeSelect?: boolean;
  enableSorting?: boolean;
  tableLayout?: 'default' | 'ledger';
  paginationVariant?: 'default' | 'figma';
  /** Pasado a la tabla HTML (lectores de pantalla) */
  tableAriaLabel?: string;
  /** Scroll vertical del cuerpo de tabla (p. ej. `max-h-[472px] overflow-y-auto`). */
  tableScrollClassName?: string;
  /** Ver `DataTable` — `figma` = DS sin bordes verticales (780:1162). */
  ledgerBorderMode?: 'grid' | 'figma';
  /** Clases en `<table>` (p. ej. `table-fixed min-w-[1120px]`). */
  tableClassName?: string;
};

function EntityTable<T>({
  columns,
  fetcher,
  queryKeyBase,
  onRowClick,
  enableSearch = true,
  searchPlaceholder = 'Buscar...',
  perPageOptions = [10, 15, 25, 50],
  initialPerPage = 15,
  extraFilters = {},
  emptyStateNode,
  filterEmptyStateNode,
  showPageSizeSelect = true,
  enableSorting = true,
  tableLayout = 'default',
  paginationVariant = 'default',
  tableAriaLabel,
  tableScrollClassName,
  ledgerBorderMode = 'grid',
  tableClassName,
}: EntityTableProps<T>) {
  const [page, setPage] = React.useState<number>(1);
  const [perPage, setPerPage] = React.useState<number>(initialPerPage);
  const [search, setSearch] = React.useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: [queryKeyBase, page, perPage, search, extraFilters],
    queryFn: () => fetcher({ page, per_page: perPage, search, filters: extraFilters }),
    keepPreviousData: true,
  });

  const items = data?.data ?? [];
  const totalPages = (data as any)?.last_page ?? (data as any)?.meta?.last_page ?? 1;
  const totalCount =
    (data as PaginatedResult<T> | undefined)?.total ??
    (data as { meta?: { total?: number } } | undefined)?.meta?.total;

  const hasActiveSearch = search.trim().length > 0 || Object.values(extraFilters).some(v => v !== undefined && v !== '' && v !== null);

  const resolvedEmptyStateContent = React.useMemo(() => {
    if (hasActiveSearch) {
      return filterEmptyStateNode ?? (
        <EmptyState
          variant="table-filter"
          onAction={() => setSearch('')}
        />
      );
    }
    return emptyStateNode;
  }, [hasActiveSearch, filterEmptyStateNode, emptyStateNode]);

  const paginationSummary =
    paginationVariant === 'figma' && totalCount !== undefined
      ? {
          from: totalCount === 0 ? 0 : (page - 1) * perPage + 1,
          to: Math.min(page * perPage, totalCount),
          total: totalCount,
        }
      : null;

  return (
    <div className="space-y-3">
      {(enableSearch || showPageSizeSelect) && (
        <div className="flex items-center justify-between gap-2">
          {enableSearch && (
            <div className="flex-1 max-w-md">
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}

          {showPageSizeSelect && (
            <div className="flex items-center gap-2">
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {perPageOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt} por página
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        enablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={onRowClick}
        enableSearch={false}
        enableSorting={enableSorting}
        tableLayout={tableLayout}
        paginationSummary={paginationSummary}
        paginationVariant={paginationVariant}
        emptyStateContent={resolvedEmptyStateContent}
        tableAriaLabel={tableAriaLabel}
        tableScrollClassName={tableScrollClassName}
        ledgerBorderMode={ledgerBorderMode}
        tableClassName={tableClassName}
      />
    </div>
  );
}

export default EntityTable;


