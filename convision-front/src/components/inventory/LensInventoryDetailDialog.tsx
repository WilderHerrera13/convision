import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { inventoryService, InventoryItem } from '@/services/inventoryService';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  damaged: 'Dañado',
};

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-[#ebf5ef] text-[#228b52]',
  reserved: 'bg-[#fff6e3] text-[#b57218]',
  damaged: 'bg-[#ffeeee] text-[#b82626]',
};

interface Props {
  lensId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LensInventoryDetailDialog: React.FC<Props> = ({ lensId, open, onOpenChange }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['lens-inventory-detail', lensId],
    queryFn: () => inventoryService.getLensInventory(lensId!),
    enabled: open && lensId !== null,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {data ? `Inventario — ${data.lens.identifier}` : 'Detalle de Inventario'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <p className="text-[13px] text-[#7d7d87] py-6 text-center">Cargando inventario...</p>
        )}

        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
              <span className="text-[#7d7d87]">Código interno</span>
              <span className="text-[#121215] font-medium">{data.lens.internal_code}</span>
              <span className="text-[#7d7d87]">Marca</span>
              <span className="text-[#121215]">{data.lens.brand?.name ?? '—'}</span>
              <span className="text-[#7d7d87]">Material</span>
              <span className="text-[#121215]">{data.lens.material?.name ?? '—'}</span>
              <span className="text-[#7d7d87]">Stock total</span>
              <span className={cn('inline-flex w-fit items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold',
                data.total_quantity > 0 ? 'bg-[#ebf5ef] text-[#228b52]' : 'bg-[#f9f9fb] text-[#7d7d87]'
              )}>
                {data.total_quantity} uds.
              </span>
            </div>

            {data.inventory.length === 0 ? (
              <p className="text-[13px] text-[#7d7d87] py-4 text-center">
                No hay stock registrado en ninguna ubicación.
              </p>
            ) : (
              <div className="rounded-[8px] border border-[#e5e5e9] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e5e5e9] bg-[#fafafb]">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Almacén</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Ubicación</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Cantidad</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventory.map((item: InventoryItem, idx: number) => (
                      <tr key={item.id} className={idx % 2 === 1 ? 'bg-[#fafafb]' : 'bg-white'}>
                        <td className="px-4 py-2.5 text-[#121215]">{item.warehouse?.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[#7d7d87]">{item.warehouseLocation?.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#121215]">{item.quantity}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-flex items-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold', STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABELS[item.status] ?? item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LensInventoryDetailDialog;
