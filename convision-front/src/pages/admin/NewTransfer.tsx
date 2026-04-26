import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { inventoryService, InventoryItem, WarehouseLocation } from '@/services/inventoryService';

const BACK = '/admin/inventory?tab=transfers';
const INPUT_CLASS = 'h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]';
const LABEL_CLASS = 'text-[12px] font-medium text-[#0f0f12]';

const schema = z.object({
  source_location_id: z.string().min(1, 'Selecciona la ubicación de origen'),
  lens_id: z.string().min(1, 'Selecciona un lente'),
  destination_location_id: z.string().min(1, 'Selecciona la ubicación de destino'),
  quantity: z.string().min(1, 'Ingresa la cantidad'),
  status: z.enum(['pending', 'completed']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const NewTransfer: React.FC = () => {
  const navigate = useNavigate();
  const [sourceInventory, setSourceInventory] = useState<InventoryItem[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source_location_id: '', lens_id: '', destination_location_id: '', quantity: '1', status: 'pending', notes: '' },
  });

  const sourceLocationId = form.watch('source_location_id');
  const selectedLensId = form.watch('lens_id');

  const { data: locationsData } = useQuery({
    queryKey: ['locations-transfers-page'],
    queryFn: () => inventoryService.getLocations({ perPage: 100 }),
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

  const onSubmit = async (data: FormValues) => {
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
      navigate(BACK);
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la transferencia.', variant: 'destructive' });
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-[#ebebee] h-[60px] flex items-center justify-between px-6 shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <button className="text-[12px] text-[#7d7d87] hover:text-[#3a71f7] transition-colors" onClick={() => navigate(BACK)}>
              Inventario / Transferencias
            </button>
            <span className="text-[12px] text-[#d1d1d8]">/</span>
            <span className="text-[12px] font-semibold text-[#0f0f12]">Nueva Transferencia</span>
          </div>
          <span className="text-[16px] font-semibold text-[#0f0f12]">Nueva Transferencia</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="h-9 px-5 text-[13px] font-semibold border-[#e5e5e9] text-[#121215]" onClick={() => navigate(BACK)}>
            Cancelar
          </Button>
          <Button type="submit" form="transfer-form" disabled={isSubmitting} className="h-9 px-5 text-[13px] font-semibold bg-[#3a71f7] hover:bg-[#2d5fd6] text-white">
            {isSubmitting ? 'Guardando...' : 'Crear Transferencia'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f6]">
        <div className="p-6 flex gap-6 items-start">
          <div className="flex-1 min-w-0 bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
            <div className="bg-[#fafafb] border-b border-[#e5e5e9] h-[48px] flex">
              <div className="h-full flex items-center px-5 relative bg-white">
                <span className="text-[12px] font-semibold text-[#0f0f12]">Datos de la transferencia</span>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3a71f7]" />
              </div>
            </div>
            <div className="px-8 py-6">
              <Form {...form}>
                <form id="transfer-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <FormField control={form.control} name="source_location_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_CLASS}>Ubicación de Origen <span className="text-[#b82626]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-[12px] border-[#e0e0e5]"><SelectValue placeholder="Selecciona el origen" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(locationsData?.data ?? []).map((loc: WarehouseLocation) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>{loc.name} ({loc.warehouse?.name})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="lens_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_CLASS}>Lente <span className="text-[#b82626]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!sourceLocationId || availableLenses.length === 0}>
                          <FormControl><SelectTrigger className="h-9 text-[12px] border-[#e0e0e5]"><SelectValue placeholder={!sourceLocationId ? 'Primero selecciona un origen' : 'Selecciona un lente'} /></SelectTrigger></FormControl>
                          <SelectContent>
                            {availableLenses.map((l) => (
                              <SelectItem key={l.id} value={String(l.id)}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="destination_location_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_CLASS}>Ubicación de Destino <span className="text-[#b82626]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!sourceLocationId}>
                          <FormControl><SelectTrigger className="h-9 text-[12px] border-[#e0e0e5]"><SelectValue placeholder="Selecciona el destino" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(locationsData?.data ?? []).filter((l: WarehouseLocation) => l.id.toString() !== sourceLocationId).map((loc: WarehouseLocation) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>{loc.name} ({loc.warehouse?.name})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_CLASS}>Tipo <span className="text-[#b82626]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-[12px] border-[#e0e0e5]"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="completed">Inmediata</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="quantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_CLASS}>
                          Cantidad <span className="text-[#b82626]">*</span>
                          {maxQty > 0 && <span className="text-[#7d7d87] font-normal ml-1">(máx. {maxQty})</span>}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max={maxQty || undefined} {...field} className={INPUT_CLASS} />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className={LABEL_CLASS}>Notas</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Observaciones opcionales sobre la transferencia" className="text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] min-h-[80px] resize-none" /></FormControl>
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
                <li>· Ubicación de origen</li>
                <li>· Lente a transferir</li>
                <li>· Ubicación de destino</li>
                <li>· Cantidad</li>
                <li>· Tipo de transferencia</li>
              </ul>
            </div>
            <div className="bg-white border border-[#ebebee] rounded-[8px] p-4">
              <p className="text-[12px] font-semibold text-[#0f0f12]">Tipos de transferencia</p>
              <ul className="mt-2 space-y-2 text-[12px] text-[#7d7d87] leading-relaxed">
                <li><span className="font-medium text-[#b57218]">Pendiente:</span> El movimiento queda registrado pero no se aplica de inmediato.</li>
                <li><span className="font-medium text-[#228b52]">Inmediata:</span> El stock se mueve en el momento del registro.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTransfer;
