import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { inventoryService, WarehouseLocation, Warehouse } from '@/services/inventoryService';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LocationFormDialog from './LocationFormDialog';

const LOCATION_TYPE_LABELS: Record<string, string> = {
  shelf: 'Estante',
  zone: 'Zona',
  bin: 'Contenedor',
  rack: 'Rack',
  other: 'Otro',
};

const LocationManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WarehouseLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseLocation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select'],
    queryFn: () => inventoryService.getWarehouses({ perPage: 100 }),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await inventoryService.deleteLocation(deleteTarget.id);
      toast({ title: 'Ubicación eliminada', description: `"${deleteTarget.name}" fue eliminada del sistema.` });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la ubicación. Es posible que tenga inventario asociado.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openEdit = (loc: WarehouseLocation) => {
    setEditTarget(loc);
    setFormOpen(true);
  };

  const columns: DataTableColumnDef<WarehouseLocation>[] = [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      cell: (loc) => (
        <div>
          <p className="text-[13px] font-semibold text-[#121215]">{loc.name}</p>
          <p className="text-[11px] text-[#7d7d87]">{loc.code}</p>
        </div>
      ),
    },
    {
      id: 'warehouse',
      header: 'Almacén',
      type: 'text',
      cell: (loc) => <span className="text-[13px] text-[#7d7d87]">{loc.warehouse?.name ?? '—'}</span>,
    },
    {
      id: 'type',
      header: 'Tipo',
      type: 'text',
      cell: (loc) => <span className="text-[13px] text-[#7d7d87]">{loc.type ? (LOCATION_TYPE_LABELS[loc.type] ?? loc.type) : '—'}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (loc) => (
        <span className={cn('inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
          loc.status === 'active' ? 'bg-[#ebf5ef] text-[#228b52]' : 'bg-[#f9f9fb] text-[#7d7d87]'
        )}>
          {loc.status === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (loc) => (
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#f5f5f6] border border-[#e5e5e9] text-[#7d7d87] hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); openEdit(loc); }}
            title="Editar ubicación"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-red-50 border border-red-200 text-red-500 hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(loc); }}
            title="Eliminar ubicación"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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

        <EntityTable<WarehouseLocation>
          columns={columns}
          queryKeyBase="locations"
          fetcher={({ page, per_page }) =>
            inventoryService.getLocations({
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
              <span className="text-[14px] font-semibold text-[#121215]">Ubicaciones</span>
              <span className="text-[11px] text-[#7d7d87]">Estantes, zonas y contenedores</span>
            </div>
          }
          toolbarTrailing={
            <Button
              className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] font-semibold h-9 px-4"
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nueva Ubicación
            </Button>
          }
          emptyStateNode={
            <EmptyState
              title="Sin ubicaciones"
              description="No hay ubicaciones registradas. Crea una para comenzar."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />
      </div>

      <LocationFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null); }}
        location={editTarget}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['locations'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar ubicación "${deleteTarget?.name ?? ''}"`}
        description="Esta acción no se puede deshacer. La ubicación será eliminada permanentemente."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </>
  );
};

export default LocationManagement;
