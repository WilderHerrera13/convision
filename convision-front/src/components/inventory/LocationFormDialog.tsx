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
import { inventoryService, WarehouseLocation, Warehouse } from '@/services/inventoryService';

const LOCATION_TYPES = [
  { value: 'shelf', label: 'Estante' },
  { value: 'zone', label: 'Zona' },
  { value: 'bin', label: 'Contenedor' },
  { value: 'rack', label: 'Rack' },
  { value: 'other', label: 'Otro' },
];

const schema = z.object({
  warehouse_id: z.string().min(1, 'El almacén es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  type: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  location?: WarehouseLocation | null;
}

const LocationFormDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess, location }) => {
  const isEdit = !!location;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { warehouse_id: '', name: '', code: '', type: '', status: 'active', description: '' },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: () => inventoryService.getWarehouses({ status: 'active', perPage: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (location) {
      form.reset({
        warehouse_id: String(location.warehouse_id),
        name: location.name,
        code: location.code,
        type: location.type ?? '',
        status: location.status,
        description: location.description ?? '',
      });
    } else {
      form.reset({ warehouse_id: '', name: '', code: '', type: '', status: 'active', description: '' });
    }
  }, [location, form]);

  const handleSubmit = async (data: FormValues) => {
    try {
      const payload = {
        warehouse_id: Number(data.warehouse_id),
        name: data.name,
        code: data.code,
        type: data.type || null,
        status: data.status,
        description: data.description || null,
      };
      if (isEdit && location) {
        await inventoryService.updateLocation(location.id, payload);
        toast({ title: 'Ubicación actualizada', description: 'Los datos fueron guardados correctamente.' });
      } else {
        await inventoryService.createLocation(payload);
        toast({ title: 'Ubicación creada', description: 'La ubicación fue registrada correctamente.' });
      }
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la ubicación.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Ubicación' : 'Nueva Ubicación'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos de la ubicación.' : 'Registra una nueva ubicación dentro de un almacén.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input placeholder="Ej: Estante A-1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl><Input placeholder="Ej: EST-A1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin tipo</SelectItem>
                      {LOCATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea placeholder="Descripción opcional" className="min-h-[60px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit">{isEdit ? 'Guardar Cambios' : 'Crear Ubicación'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LocationFormDialog;
