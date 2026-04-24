import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/layouts/PageLayout';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';

const schema = z.object({
  reception_date: z.date({ required_error: 'La fecha de recepción es obligatoria' }),
  received_by: z.string().min(1, 'El campo es obligatorio'),
  lens_condition: z.string().min(1, 'Seleccione el estado del lente'),
  return_tracking: z.string().optional(),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const LENS_CONDITIONS = [
  { value: 'Recibido conforme', label: 'Recibido conforme' },
  { value: 'Con daños', label: 'Con daños' },
  { value: 'Incompleto', label: 'Incompleto' },
];

const ConfirmReception: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { received_by: user?.name ?? '' },
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    laboratoryOrderService
      .getLaboratoryOrder(Number(id))
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const notes = `Recibido por: ${values.received_by}. Estado: ${values.lens_condition}. Guía retorno: ${values.return_tracking || 'N/A'}. ${values.observations || ''}`.trim();
      await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), { status: 'received_from_lab', notes });
      toast({ title: 'Recepción confirmada', description: 'La orden quedó registrada como recibida en sede.' });
      navigate(`/receptionist/lab-orders/${id}`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo confirmar la recepción.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(`/receptionist/lab-orders/${id}`)}>
        Cancelar
      </Button>
      <Button type="submit" form="reception-form" size="sm" disabled={submitting} className="bg-[#8753ef] hover:bg-[#7040d6] text-white">
        {submitting ? 'Confirmando...' : 'Confirmar Recepción'}
      </Button>
    </div>
  );

  return (
    <PageLayout title="Confirmar Recepción del Laboratorio" subtitle="Órdenes de Laboratorio / Confirmar Recepción" actions={pageActions}>
      {loading ? (
        <div className="py-8 text-center text-gray-400">Cargando...</div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="flex-[65] min-w-0">
            <Card className="border border-gray-200">
              <CardContent className="p-0">
                <div className="border-b border-gray-200 px-6">
                  <div className="relative inline-flex py-3">
                    <span className="text-sm font-medium text-[#8753ef]">Datos de la recepción</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8753ef]" />
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-4">Resumen de la orden</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500"># Orden</p>
                        <p className="font-medium">{order?.order_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Laboratorio origen</p>
                        <p className="font-medium">{order?.laboratory?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Paciente</p>
                        <p className="font-medium">
                          {order?.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sede que recibe</p>
                        <p className="font-medium">Sede Principal — Villavicencio</p>
                      </div>
                    </div>
                    <div className="mt-4 h-px bg-[#f0f0f2]" />
                  </div>
                  <Form {...form}>
                    <form id="reception-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <p className="text-sm font-semibold text-gray-700">Datos de la recepción</p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="reception_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de recepción *</FormLabel>
                              <FormControl>
                                <DatePicker value={field.value} onChange={field.onChange} placeholder="Seleccionar fecha" error={form.formState.errors.reception_date?.message} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="received_by"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recibido por *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nombre del receptor" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="lens_condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado del lente al recibir *</FormLabel>
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione el estado..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LENS_CONDITIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="return_tracking"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guía de retorno / mensajero</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. #B-1048" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="observations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observaciones</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Ej. Lente llegó en buenas condiciones, empaque sin daños..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                  <p className="text-xs text-muted-foreground mt-4">Campos marcados con * son obligatorios</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="w-[280px] shrink-0 space-y-4">
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-gray-800 mb-4">◆ Checklist de recepción</p>
                <ul className="space-y-3">
                  {['Verificar número de orden en el paquete', 'Revisar estado físico del lente', 'Comparar con la orden original', 'Registrar guía de transporte'].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8753ef] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border border-[#8753ef] bg-[#f1edff]">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-[#8753ef] mb-4">◆ Al confirmar la recepción</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>La orden queda como 'Recibida del laboratorio'.</li>
                  <li>El recepcionista la enviará a control de calidad desde el detalle de la orden.</li>
                  <li>El historial queda registrado con fecha y usuario.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default ConfirmReception;
