import React, { useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { inventoryService, LensWithInventory, Warehouse, WarehouseLocation } from '@/services/inventoryService';

const schema = z.object({
  product_id: z.string().min(1, 'Selecciona un lente'),
  warehouse_id: z.string().min(1, 'Selecciona un almacén'),
  warehouse_location_id: z.string().min(1, 'Selecciona una ubicación'),
  quantity: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  status: z.enum(['available', 'reserved', 'damaged']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddInventoryDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_id: '', warehouse_id: '', warehouse_location_id: '', quantity: 0, status: 'available', notes: '' },
  });

  const warehouseId = form.watch('warehouse_id');

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: () => inventoryService.getWarehouses({ status: 'active', perPage: 100 }),
    enabled: open,
  });

  const { data: stockData } = useQuery({
    queryKey: ['stock-lens-select'],
    queryFn: () => inventoryService.getTotalStock({ perPage: 200 }),
    enabled: open,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations-for-warehouse', warehouseId],
    queryFn: () => inventoryService.getLocations({ warehouseId: Number(warehouseId), perPage: 100 }),
    enabled: !!warehouseId,
  });

  useEffect(() => {
    if (warehouseId) form.setValue('warehouse_location_id', '');
  }, [warehouseId, form]);

  const handleSubmit = async (data: FormValues) => {
    try {
      await inventoryService.createInventoryItem({
        product_id: Number(data.product_id),
        warehouse_id: Number(data.warehouse_id),
        warehouse_location_id: Number(data.warehouse_location_id),
        quantity: data.quantity,
        status: data.status,
        notes: data.notes || null,
      });
      toast({ title: 'Stock agregado', description: 'El inventario fue actualizado correctamente.' });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar el inventario.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Stock</DialogTitle>
          <DialogDescription>Añade unidades de un lente a una ubicación de almacén.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="product_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Lente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un lente" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(stockData?.data ?? []).map((lens: LensWithInventory) => (
                      <SelectItem key={lens.id} value={String(lens.id)}>
                        {lens.identifier} — {lens.brand?.name ?? 'Sin marca'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="warehouse_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Almacén</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un almacén" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(warehousesData?.data ?? []).map((w: Warehouse) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="warehouse_location_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!warehouseId}>
                  <FormControl><SelectTrigger><SelectValue placeholder={warehouseId ? 'Selecciona una ubicación' : 'Primero selecciona un almacén'} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(locationsData?.data ?? []).map((loc: WarehouseLocation) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="0" value={field.value || ''} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="available">Disponible</SelectItem>
                      <SelectItem value="reserved">Reservado</SelectItem>
                      <SelectItem value="damaged">Dañado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl><Textarea placeholder="Notas adicionales" className="min-h-[80px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryDialog;
