import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { inventoryService, Warehouse } from '@/services/inventoryService';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import WarehouseFormDialog from './WarehouseFormDialog';

const WarehouseManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await inventoryService.deleteWarehouse(deleteTarget.id);
      toast({ title: 'Almacén eliminado', description: `"${deleteTarget.name}" fue eliminado del sistema.` });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el almacén. Es posible que tenga inventario asociado.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openEdit = (w: Warehouse) => {
    setEditTarget(w);
    setFormOpen(true);
  };

  const columns: DataTableColumnDef<Warehouse>[] = [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      cell: (w) => (
        <div>
          <p className="text-[13px] font-semibold text-[#121215]">{w.name}</p>
          <p className="text-[11px] text-[#7d7d87]">{w.code}</p>
        </div>
      ),
    },
    {
      id: 'city',
      header: 'Ciudad',
      type: 'text',
      cell: (w) => <span className="text-[13px] text-[#7d7d87]">{w.city ?? '—'}</span>,
    },
    {
      id: 'address',
      header: 'Dirección',
      type: 'text',
      cell: (w) => <span className="text-[13px] text-[#7d7d87]">{w.address ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (w) => (
        <span className={cn('inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
          w.status === 'active' ? 'bg-[#ebf5ef] text-[#228b52]' : 'bg-[#f9f9fb] text-[#7d7d87]'
        )}>
          {w.status === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (w) => (
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#f5f5f6] border border-[#e5e5e9] text-[#7d7d87] hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); openEdit(w); }}
            title="Editar almacén"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-red-50 border border-red-200 text-red-500 hover:opacity-80 transition-colors"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}
            title="Eliminar almacén"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <EntityTable<Warehouse>
        columns={columns}
        queryKeyBase="warehouses"
        fetcher={({ page, per_page }) =>
          inventoryService.getWarehouses({ page, perPage: per_page })
        }
        enableSearch={false}
        showPageSizeSelect={false}
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Almacenes</span>
            <span className="text-[11px] text-[#7d7d87]">Gestión de bodegas y almacenes</span>
          </div>
        }
        toolbarTrailing={
          <Button
            className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] font-semibold h-9 px-4"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo Almacén
          </Button>
        }
        emptyStateNode={
          <EmptyState
            title="Sin almacenes"
            description="No hay almacenes registrados. Crea uno para comenzar."
          />
        }
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null); }}
        warehouse={editTarget}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['warehouses'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar almacén "${deleteTarget?.name ?? ''}"`}
        description="Esta acción no se puede deshacer. El almacén será eliminado permanentemente."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </>
  );
};

export default WarehouseManagement;
