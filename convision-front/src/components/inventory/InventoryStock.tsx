import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, Plus } from 'lucide-react';
import { inventoryService, Warehouse, LensCatalogItem } from '@/services/inventoryService';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import AddInventoryDialog from './AddInventoryDialog';
import LensInventoryDetailDialog from './LensInventoryDetailDialog';

interface LensWithInventory {
  id: number;
  internal_code: string;
  identifier: string;
  brand?: { name: string };
  total_quantity: number;
}

const InventoryStock: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detailLensId, setDetailLensId] = useState<number | null>(null);

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select'],
    queryFn: () => inventoryService.getWarehouses({ perPage: 100, status: 'active' }),
  });

  const lensCatalogColumns: DataTableColumnDef<LensCatalogItem>[] = [
    {
      id: 'internal_code',
      header: 'Código',
      type: 'text',
      accessorKey: 'internal_code',
      cell: (item) => (
        <span className="text-[13px] font-semibold text-[#121215]">{item.internal_code}</span>
      ),
    },
    {
      id: 'identifier',
      header: 'Lente',
      type: 'text',
      cell: (item) => <span className="text-[13px] text-[#121215]">{item.identifier}</span>,
    },
    {
      id: 'brand',
      header: 'Marca',
      type: 'text',
      cell: (item) => <span className="text-[13px] text-[#7d7d87]">{item.brand?.name ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (item) => (
        <span className={`inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold ${
          item.status === 'enabled'
            ? 'bg-[#ebf5ef] text-[#228b52]'
            : 'bg-[#f9f9fb] text-[#7d7d87]'
        }`}>
          {item.status === 'enabled' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      type: 'actions',
      cell: (item) => (
        <button
          className="flex items-center justify-center size-8 rounded-[6px] bg-[#eff1ff] border border-[#3a71f7]/30 text-[#3a71f7] hover:opacity-80 transition-opacity"
          onClick={(e) => { e.stopPropagation(); navigate(`/admin/inventory/lens-catalog/${item.id}`); }}
          title="Ver detalle"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const stockColumns: DataTableColumnDef<LensWithInventory>[] = [
    {
      id: 'internal_code',
      header: 'Código',
      type: 'text',
      accessorKey: 'internal_code',
      cell: (item) => (
        <p className="text-[13px] font-semibold text-[#121215]">{item.internal_code}</p>
      ),
    },
    {
      id: 'identifier',
      header: 'Lente',
      type: 'text',
      cell: (item) => <span className="text-[13px] text-[#121215]">{item.identifier}</span>,
    },
    {
      id: 'brand',
      header: 'Marca',
      type: 'text',
      cell: (item) => <span className="text-[13px] text-[#7d7d87]">{item.brand?.name ?? '—'}</span>,
    },
    {
      id: 'total_quantity',
      header: 'Stock',
      type: 'text',
      cell: (item) => (
        <span className={`inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold ${
          item.total_quantity > 0 ? 'bg-[#ebf5ef] text-[#228b52]' : 'bg-[#f9f9fb] text-[#7d7d87]'
        }`}>
          {item.total_quantity} uds.
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (item) => (
        <button
          className="flex items-center justify-center size-8 rounded-[6px] bg-[#eff1ff] border border-[#3a71f7]/30 text-[#3a71f7] hover:opacity-80 transition-colors"
          onClick={(e) => { e.stopPropagation(); setDetailLensId(item.id); }}
          title="Ver detalle de stock"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={warehouseFilter || 'all'} onValueChange={(v) => setWarehouseFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 text-[12px] w-[180px] border-[#e5e5e9]">
              <SelectValue placeholder="Almacén" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los almacenes</SelectItem>
              {(warehousesData?.data ?? []).map((w: Warehouse) => (
                <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {warehouseFilter && (
            <button
              className="text-[12px] text-[#7d7d87] hover:text-[#3a71f7] transition-colors"
              onClick={() => setWarehouseFilter('')}
            >
              × Limpiar filtros
            </button>
          )}
        </div>

        <EntityTable<LensCatalogItem>
          columns={lensCatalogColumns}
          queryKeyBase="lens-catalog"
          fetcher={({ page, per_page, search }) =>
            inventoryService.getLensCatalog({ page, perPage: per_page, search })
          }
          enableSearch={true}
          searchPlaceholder="Buscar por código o descripción..."
          showPageSizeSelect={false}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Catálogo de Lentes</span>
              <span className="text-[11px] text-[#7d7d87]">Productos tipo lente — fabricados bajo pedido</span>
            </div>
          }
          emptyStateNode={
            <EmptyState
              title="Sin lentes en catálogo"
              description="No hay lentes importados. Usa la opción de carga masiva para importarlos."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />

        <div className="border-t border-[#e5e5e9] my-6" />

        <EntityTable<LensWithInventory>
          columns={stockColumns}
          queryKeyBase="inventory-stock"
          fetcher={({ page, per_page }) =>
            inventoryService.getTotalStock({
              page,
              perPage: per_page,
              warehouseId: warehouseFilter ? Number(warehouseFilter) : undefined,
            })
          }
          extraFilters={{ warehouseId: warehouseFilter }}
          enableSearch={false}
          showPageSizeSelect={false}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Stock Físico</span>
              <span className="text-[11px] text-[#7d7d87]">Inventario físico por producto</span>
            </div>
          }
          toolbarTrailing={
            <Button
              className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] font-semibold h-9 px-4"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Agregar Stock
            </Button>
          }
          emptyStateNode={
            <EmptyState
              title="Sin stock"
              description="No hay productos en inventario. Agrega stock para comenzar."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />
      </div>

      <AddInventoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })}
      />

      <LensInventoryDetailDialog
        lensId={detailLensId}
        open={detailLensId !== null}
        onOpenChange={(open) => !open && setDetailLensId(null)}
      />
    </>
  );
};

export default InventoryStock;
