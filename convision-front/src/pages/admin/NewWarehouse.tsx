import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { inventoryService } from '@/services/inventoryService';

const BACK = '/admin/inventory?tab=warehouses';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  city: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const INPUT_CLASS = 'h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]';
const LABEL_CLASS = 'text-[12px] font-medium text-[#0f0f12]';

const NewWarehouse: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', city: '', address: '', status: 'active', notes: '' },
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['warehouse-detail', id],
    queryFn: () => inventoryService.getWarehouse(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        code: existing.code,
        city: existing.city ?? '',
        address: existing.address ?? '',
        status: existing.status,
        notes: existing.notes ?? '',
      });
    }
  }, [existing, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit) {
        await inventoryService.updateWarehouse(Number(id), data);
        toast({ title: 'Almacén actualizado', description: 'Los datos fueron guardados correctamente.' });
      } else {
        await inventoryService.createWarehouse(data);
        toast({ title: 'Almacén creado', description: 'El almacén fue registrado correctamente.' });
      }
      navigate(BACK);
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el almacén.', variant: 'destructive' });
    }
  };

  const { isSubmitting } = form.formState;
  const pageTitle = isEdit ? 'Editar Almacén' : 'Nuevo Almacén';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-[#ebebee] h-[60px] flex items-center justify-between px-6 shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <button className="text-[12px] text-[#7d7d87] hover:text-[#3a71f7] transition-colors" onClick={() => navigate(BACK)}>
              Inventario / Almacenes
            </button>
            <span className="text-[12px] text-[#d1d1d8]">/</span>
            <span className="text-[12px] font-semibold text-[#0f0f12]">{pageTitle}</span>
          </div>
          <span className="text-[16px] font-semibold text-[#0f0f12]">{pageTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="h-9 px-5 text-[13px] font-semibold border-[#e5e5e9] text-[#121215]" onClick={() => navigate(BACK)}>
            Cancelar
          </Button>
          <Button type="submit" form="warehouse-form" disabled={isSubmitting} className="h-9 px-5 text-[13px] font-semibold bg-[#3a71f7] hover:bg-[#2d5fd6] text-white">
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Almacén'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f6]">
        {isLoading && isEdit ? (
          <p className="p-6 text-center text-[13px] text-[#7d7d87]">Cargando datos...</p>
        ) : (
          <div className="p-6 flex gap-6 items-start">
            <div className="flex-1 min-w-0 bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
              <div className="bg-[#fafafb] border-b border-[#e5e5e9] h-[48px] flex">
                <div className="h-full flex items-center px-5 relative bg-white">
                  <span className="text-[12px] font-semibold text-[#0f0f12]">Información del almacén</span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3a71f7]" />
                </div>
              </div>
              <div className="px-8 py-6">
                <Form {...form}>
                  <form id="warehouse-form" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_CLASS}>Nombre <span className="text-[#b82626]">*</span></FormLabel>
                          <FormControl><Input {...field} placeholder="Ej: Almacén Central" className={INPUT_CLASS} /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="code" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_CLASS}>Código <span className="text-[#b82626]">*</span></FormLabel>
                          <FormControl><Input {...field} placeholder="Ej: ALM-001" className={INPUT_CLASS} /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_CLASS}>Ciudad</FormLabel>
                          <FormControl><Input {...field} placeholder="Ej: Bogotá" className={INPUT_CLASS} /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_CLASS}>Estado <span className="text-[#b82626]">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-9 text-[12px] border-[#e0e0e5]"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className={LABEL_CLASS}>Dirección</FormLabel>
                          <FormControl><Input {...field} placeholder="Dirección del almacén" className={INPUT_CLASS} /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className={LABEL_CLASS}>Notas</FormLabel>
                          <FormControl><Textarea {...field} placeholder="Observaciones adicionales" className="text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] min-h-[80px] resize-none" /></FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              </div>
            </div>

            <div className="w-[280px] shrink-0 space-y-3">
              <div className="bg-[#eff4ff] border border-[#3a71f7]/20 rounded-[8px] p-4">
                <p className="text-[12px] font-semibold text-[#3a71f7]">Campos requeridos</p>
                <ul className="mt-2 space-y-1 text-[12px] text-[#3a71f7]/80 leading-relaxed">
                  <li>· Nombre del almacén</li>
                  <li>· Código único</li>
                  <li>· Estado</li>
                </ul>
              </div>
              <div className="bg-white border border-[#ebebee] rounded-[8px] p-4">
                <p className="text-[12px] font-semibold text-[#0f0f12]">¿Qué es un almacén?</p>
                <p className="mt-1.5 text-[12px] text-[#7d7d87] leading-relaxed">Un almacén agrupa las ubicaciones donde guardas el inventario. Podrás agregar estantes, zonas y racks dentro de él.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewWarehouse;
