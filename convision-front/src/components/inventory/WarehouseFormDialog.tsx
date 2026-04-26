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
import { toast } from '@/components/ui/use-toast';
import { inventoryService, Warehouse } from '@/services/inventoryService';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  address: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  warehouse?: Warehouse | null;
}

const WarehouseFormDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess, warehouse }) => {
  const isEdit = !!warehouse;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', address: '', city: '', status: 'active', notes: '' },
  });

  useEffect(() => {
    if (warehouse) {
      form.reset({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address ?? '',
        city: warehouse.city ?? '',
        status: warehouse.status,
        notes: warehouse.notes ?? '',
      });
    } else {
      form.reset({ name: '', code: '', address: '', city: '', status: 'active', notes: '' });
    }
  }, [warehouse, form]);

  const handleSubmit = async (data: FormValues) => {
    try {
      if (isEdit && warehouse) {
        await inventoryService.updateWarehouse(warehouse.id, data);
        toast({ title: 'Almacén actualizado', description: 'Los datos del almacén fueron guardados.' });
      } else {
        await inventoryService.createWarehouse(data);
        toast({ title: 'Almacén creado', description: 'El almacén fue registrado correctamente.' });
      }
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el almacén.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Almacén' : 'Nuevo Almacén'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del almacén.' : 'Completa los datos para registrar un nuevo almacén.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ej: Almacén Central" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl><Input placeholder="Ej: ALM-001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl><Input placeholder="Ej: Bogotá" {...field} /></FormControl>
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

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl><Input placeholder="Dirección del almacén" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl><Textarea placeholder="Observaciones adicionales" className="min-h-[60px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit">{isEdit ? 'Guardar Cambios' : 'Crear Almacén'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WarehouseFormDialog;
