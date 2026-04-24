import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { laboratoryService, Laboratory } from '@/services/laboratoryService';
import PageLayout from '@/components/layouts/PageLayout';

const formSchema = z.object({
  laboratory_id: z.coerce.number().min(1, 'Seleccione un laboratorio'),
  product_code: z.string().optional(),
  lens_type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  estimated_completion_date: z.date().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ASIDE_BULLETS = [
  {
    title: 'Laboratorio',
    desc: 'Taller que fabricará el producto óptico solicitado.',
  },
  {
    title: 'Prioridad',
    desc: 'Urgente o Alta adelantan la orden en la cola del laboratorio.',
  },
  {
    title: 'Fecha estimada',
    desc: 'Plazo máximo acordado para recibir el producto listo.',
  },
];

const EditLaboratoryOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      laboratory_id: undefined,
      product_code: '',
      lens_type: '',
      priority: 'normal',
      estimated_completion_date: null,
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      laboratoryOrderService.getLaboratoryOrder(Number(id)),
      laboratoryService.getLaboratories(),
    ])
      .then(([orderData, labResp]) => {
        setOrder(orderData);
        setLaboratories(labResp.data);
        form.reset({
          laboratory_id: orderData.laboratory_id,
          product_code: orderData.product_code ?? '',
          lens_type: orderData.lens_type ?? '',
          priority: orderData.priority as FormValues['priority'],
          estimated_completion_date: orderData.estimated_completion_date
            ? new Date(orderData.estimated_completion_date)
            : null,
          description: orderData.description ?? '',
          notes: orderData.notes ?? '',
        });
      })
      .catch(() => {
        toast({ title: 'Error', description: 'No se pudo cargar la orden.', variant: 'destructive' });
      })
      .finally(() => setLoadingOrder(false));
  }, [id, form]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setSubmitting(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrder(Number(id), {
        laboratory_id: values.laboratory_id,
        priority: values.priority,
        estimated_completion_date: values.estimated_completion_date
          ? values.estimated_completion_date.toISOString().split('T')[0]
          : null,
        notes: values.notes,
        description: values.description,
        product_code: values.product_code,
        lens_type: values.lens_type,
      });
      toast({ title: 'Orden actualizada', description: 'Los cambios fueron guardados exitosamente.' });
      navigate(`/admin/laboratory-orders/${id}`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la orden.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrder) {
    return <div className="p-6 text-sm text-[#7d7d87]">Cargando orden...</div>;
  }

  if (!order) {
    return <div className="p-6 text-sm text-[#b82626]">Orden no encontrada.</div>;
  }

  const orderLabel = order.order_number ?? `#${id}`;

  return (
    <PageLayout
      title={`Editar Orden ${orderLabel}`}
      subtitle={`Administración / Editar Orden ${orderLabel}`}
      topbarClassName="min-h-[64px] h-auto py-3"
      titleStackClassName="gap-1"
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/laboratory-orders/${id}`)}
            className="border-[#e5e5e9] text-[#0f0f12]"
          >
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={submitting}
            className="bg-[#3a71f7] hover:bg-[#2558d4] text-white"
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="border-b border-border">
              <div className="flex px-6 pt-4">
                <button type="button" className="relative pb-3 text-[13px] font-semibold text-[#3a71f7]">
                  Información de la orden
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3a71f7] rounded-t-full" />
                </button>
              </div>
            </div>
            <CardContent className="pt-6">
              <Form {...form}>
                <form id="edit-lab-order-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormSection title="Gestión comercial">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[13px] font-medium text-[#0f0f12]">Fecha de venta</p>
                        <div className="h-10 flex items-center px-3 rounded-md border border-[#e5e5e9] bg-[#f9f9fb] text-[13px] text-[#7d7d87] cursor-not-allowed select-none">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('es-CO') : '—'}
                        </div>
                        <p className="text-[11px] text-[#b4b5bc]">No editable</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[13px] font-medium text-[#0f0f12]">Orden de pedido</p>
                        <div className="h-10 flex items-center px-3 rounded-md border border-[#e5e5e9] bg-[#f9f9fb] text-[13px] text-[#7d7d87] cursor-not-allowed select-none">
                          {order.order_number ?? '—'}
                        </div>
                        <p className="text-[11px] text-[#b4b5bc]">No editable</p>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Datos del paciente">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[13px] font-medium text-[#0f0f12]">
                        Paciente <span className="text-destructive">*</span>
                      </p>
                      <div className="h-10 flex items-center px-3 rounded-md border border-[#e5e5e9] bg-[#f9f9fb] text-[13px] text-[#7d7d87] cursor-not-allowed select-none">
                        {order.patient
                          ? `${order.patient.first_name} ${order.patient.last_name}`
                          : '—'}
                      </div>
                      <p className="text-[11px] text-[#b4b5bc]">No editable</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[13px] font-medium text-[#0f0f12]">Documento del cliente</p>
                        <div className="h-10 flex items-center px-3 rounded-md border border-[#e5e5e9] bg-[#f9f9fb] text-[13px] text-[#7d7d87] cursor-not-allowed select-none">
                          {order.patient?.identification ?? '—'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[13px] font-medium text-[#0f0f12]">Número celular</p>
                        <div className="h-10 flex items-center px-3 rounded-md border border-[#e5e5e9] bg-[#f9f9fb] text-[13px] text-[#7d7d87] cursor-not-allowed select-none">
                          {order.patient?.phone ?? '—'}
                        </div>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Datos de la orden">
                    <FormField
                      control={form.control}
                      name="laboratory_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Laboratorio <span className="text-destructive">*</span></FormLabel>
                          <Select value={field.value?.toString() ?? ''} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un laboratorio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {laboratories.map((lab) => (
                                <SelectItem key={lab.id} value={lab.id.toString()}>
                                  {lab.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="product_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código del producto</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. LEN-CR39-MF-125" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lens_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de lente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monofocal">Monofocal</SelectItem>
                                <SelectItem value="bifocal">Bifocal</SelectItem>
                                <SelectItem value="multifocal">Multifocal</SelectItem>
                                <SelectItem value="progresivo">Progresivo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridad <span className="text-destructive">*</span></FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione prioridad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Baja</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="estimated_completion_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha estimada de entrega</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Seleccionar fecha estimada"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción del pedido</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Lentes monofocales CR-39, antirreflejo, +1.25 OD / +1.00 OI..."
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Detalles adicionales">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas para el laboratorio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Instrucciones especiales, observaciones o alertas para el laboratorio"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-[12px] text-muted-foreground px-1">
            Campos marcados con <span className="text-destructive">*</span> son obligatorios
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="border-b border-border px-5 py-4 flex items-center gap-2">
              <span className="size-2.5 rotate-45 bg-[#3a71f7] shrink-0" />
              <h3 className="text-[14px] font-semibold text-[#0f0f12]">Sobre esta orden</h3>
            </div>
            <div className="p-5 space-y-4">
              {ASIDE_BULLETS.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="mt-[5px] size-2 rounded-full bg-[#3a71f7] shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#0f0f12] leading-none mb-1">{item.title}</p>
                    <p className="text-[12px] text-[#7d7d87] leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="rounded-lg border border-[#3a71f7] bg-[#eff1ff] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-2.5 rotate-45 bg-[#3a71f7] shrink-0" />
              <p className="text-[13px] font-semibold text-[#3a71f7]">Flujo de estados</p>
            </div>
            <p className="text-[13px] text-[#3a71f7] leading-snug">
              Al crear la orden, esta queda en estado &quot;Pendiente&quot; hasta que se envíe al
              laboratorio. Todo cambio se registra en el historial.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => (
  <div>
    <h3 className="text-[13px] font-semibold text-[#0f0f12] mb-4 pb-2 border-b border-border">{title}</h3>
    {children}
  </div>
);

export default EditLaboratoryOrder;
