import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { inventoryService, InventoryTransfer } from '@/services/inventoryService';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime12h } from '@/lib/utils';
import TransferFormDialog from './TransferFormDialog';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#fff6e3] text-[#b57218]',
  completed: 'bg-[#ebf5ef] text-[#228b52]',
  cancelled: 'bg-[#ffeeee] text-[#b82626]',
};

const InventoryTransfers: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const handleComplete = async (id: number) => {
    try {
      await inventoryService.updateTransfer(id, { status: 'completed' });
      toast({ title: 'Transferencia completada', description: 'El stock fue movido a la ubicación de destino.' });
      queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo completar la transferencia.', variant: 'destructive' });
    }
  };

  const columns: DataTableColumnDef<InventoryTransfer>[] = [
    {
      id: 'date',
      header: 'Fecha',
      type: 'text',
      cell: (t) => (
        <div>
          <p className="text-[13px] font-semibold text-[#121215]">{formatDateTime12h(t.created_at)}</p>
        </div>
      ),
    },
    {
      id: 'lens',
      header: 'Lente',
      type: 'text',
      cell: (t) => <span className="text-[13px] text-[#121215]">{t.lens?.identifier ?? `ID ${t.lens_id}`}</span>,
    },
    {
      id: 'source',
      header: 'Origen',
      type: 'text',
      cell: (t) => <span className="text-[13px] text-[#7d7d87]">{t.sourceLocation?.name ?? `Ubic. ${t.source_location_id}`}</span>,
    },
    {
      id: 'destination',
      header: 'Destino',
      type: 'text',
      cell: (t) => <span className="text-[13px] text-[#7d7d87]">{t.destinationLocation?.name ?? `Ubic. ${t.destination_location_id}`}</span>,
    },
    {
      id: 'quantity',
      header: 'Cantidad',
      type: 'text',
      cell: (t) => <span className="text-[13px] font-semibold text-[#121215]">{t.quantity}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (t) => (
        <span className={cn('inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold', STATUS_STYLES[t.status] ?? 'bg-gray-100 text-gray-600')}>
          {STATUS_LABELS[t.status] ?? t.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (t) => (
        <div className="flex items-center gap-1.5">
          {t.status === 'pending' && (
            <button
              className="flex items-center justify-center size-8 rounded-[6px] bg-[#edfaf3] border border-[#228b52]/30 text-[#228b52] hover:opacity-80 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleComplete(t.id); }}
              title="Completar transferencia"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 text-[12px] w-[160px] border-[#e5e5e9]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          {statusFilter && (
            <button
              className="text-[12px] text-[#7d7d87] hover:text-[#3a71f7] transition-colors"
              onClick={() => setStatusFilter('')}
            >
              × Limpiar filtros
            </button>
          )}
        </div>

        <EntityTable<InventoryTransfer>
          columns={columns}
          queryKeyBase="inventory-transfers"
          fetcher={({ page, per_page }) =>
            inventoryService.getTransfers({
              page,
              perPage: per_page,
              status: statusFilter || undefined,
            })
          }
          extraFilters={{ status: statusFilter }}
          enableSearch={false}
          showPageSizeSelect={false}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Transferencias</span>
              <span className="text-[11px] text-[#7d7d87]">Movimientos entre ubicaciones</span>
            </div>
          }
          toolbarTrailing={
            <Button
              className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] font-semibold h-9 px-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nueva Transferencia
            </Button>
          }
          emptyStateNode={
            <EmptyState
              title="Sin transferencias"
              description="No hay transferencias registradas. Crea una para comenzar."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />
      </div>

      <TransferFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] })}
      />
    </>
  );
};

export default InventoryTransfers;
