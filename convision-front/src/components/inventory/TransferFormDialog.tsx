import React, { useEffect, useState } from 'react';
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
import { inventoryService, InventoryItem, WarehouseLocation } from '@/services/inventoryService';

const schema = z.object({
  source_location_id: z.string().min(1, 'Selecciona la ubicación de origen'),
  lens_id: z.string().min(1, 'Selecciona un lente'),
  destination_location_id: z.string().min(1, 'Selecciona la ubicación de destino'),
  quantity: z.string().min(1, 'Ingresa la cantidad'),
  status: z.enum(['pending', 'completed']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TransferFormDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const [sourceInventory, setSourceInventory] = useState<InventoryItem[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source_location_id: '', lens_id: '', destination_location_id: '', quantity: '1', status: 'pending', notes: '' },
  });

  const sourceLocationId = form.watch('source_location_id');
  const selectedLensId = form.watch('lens_id');

  const { data: locationsData } = useQuery({
    queryKey: ['locations-transfers'],
    queryFn: () => inventoryService.getLocations({ perPage: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (!sourceLocationId) { setSourceInventory([]); return; }
    inventoryService.getLocationInventory(Number(sourceLocationId))
      .then((res) => setSourceInventory(res.data.filter((i) => i.lens)))
      .catch(() => setSourceInventory([]));
  }, [sourceLocationId]);

  useEffect(() => {
    form.setValue('lens_id', '');
  }, [sourceLocationId, form]);

  const availableLenses = sourceInventory.map((i) => ({
    id: i.lens_id,
    label: `${i.lens?.identifier ?? `ID ${i.lens_id}`} — ${i.lens?.brand?.name ?? 'Sin marca'} (Disp: ${i.quantity})`,
    maxQty: i.quantity,
  }));

  const maxQty = sourceInventory.find((i) => i.lens_id.toString() === selectedLensId)?.quantity ?? 0;

  const handleSubmit = async (data: FormValues) => {
    const qty = parseInt(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Error', description: 'La cantidad debe ser mayor a 0.', variant: 'destructive' });
      return;
    }
    try {
      await inventoryService.createTransfer({
        lens_id: Number(data.lens_id),
        source_location_id: Number(data.source_location_id),
        destination_location_id: Number(data.destination_location_id),
        quantity: qty,
        notes: data.notes || null,
        status: data.status,
      });
      toast({ title: 'Transferencia creada', description: 'La transferencia fue registrada correctamente.' });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la transferencia.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Transferencia</DialogTitle>
          <DialogDescription>Mueve lentes entre ubicaciones de almacén.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="source_location_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación de Origen</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona el origen" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(locationsData?.data ?? []).map((loc: WarehouseLocation) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name} ({loc.warehouse?.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="lens_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Lente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!sourceLocationId || availableLenses.length === 0}>
                  <FormControl><SelectTrigger><SelectValue placeholder={!sourceLocationId ? 'Primero selecciona un origen' : 'Selecciona un lente'} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {availableLenses.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="destination_location_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación de Destino</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!sourceLocationId}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona el destino" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(locationsData?.data ?? []).filter((l: WarehouseLocation) => l.id.toString() !== sourceLocationId).map((loc: WarehouseLocation) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name} ({loc.warehouse?.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad {maxQty > 0 && <span className="text-[#7d7d87]">(máx. {maxQty})</span>}</FormLabel>
                  <FormControl><Input type="number" min="1" max={maxQty || undefined} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="completed">Inmediata</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl><Textarea placeholder="Observaciones opcionales" className="min-h-[60px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit">Crear Transferencia</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferFormDialog;
