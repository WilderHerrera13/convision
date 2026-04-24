import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { toast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import EvidenceUploader from '@/components/lab-orders/EvidenceUploader';

const schema = z.object({
  shipment_date: z.date({ required_error: 'La fecha de envío es obligatoria' }),
  tracking_number: z.string().optional(),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ConfirmShipment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!id) return;
    setLoadingOrder(true);
    laboratoryOrderService
      .getLaboratoryOrder(Number(id))
      .then(setOrder)
      .catch(() => toast({ title: 'Error', description: 'No se pudo cargar la orden', variant: 'destructive' }))
      .finally(() => setLoadingOrder(false));
  }, [id]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const notes = `Guía: ${values.tracking_number || 'N/A'}. ${values.observations || ''}`.trim();
      await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), { status: 'sent_to_lab', notes });
      toast({ title: 'Enviado correctamente' });
      navigate(`/receptionist/lab-orders/${id}`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(`/receptionist/lab-orders/${id}`)}>
        Cancelar
      </Button>
      <Button type="submit" form="shipment-form" size="sm" disabled={submitting} className="bg-[#8753ef] hover:bg-[#7040d6] text-white">
        {submitting ? 'Confirmando...' : 'Confirmar Envío'}
      </Button>
    </div>
  );

  return (
    <PageLayout title="Confirmar Envío al Laboratorio" subtitle="Órdenes de Laboratorio / Confirmar Envío" actions={pageActions}>
      {loadingOrder ? (
        <div className="py-8 text-center text-gray-400">Cargando...</div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="flex-[65] min-w-0">
            <Card className="border border-gray-200">
              <CardContent className="p-0">
                <div className="border-b border-gray-200 px-6">
                  <div className="relative inline-flex py-3">
                    <span className="text-sm font-medium text-[#8753ef]">Datos del envío</span>
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
                        <p className="text-gray-500">Laboratorio destino</p>
                        <p className="font-medium">{order?.laboratory?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Paciente</p>
                        <p className="font-medium">
                          {order?.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sede destino</p>
                        <p className="font-medium">Sede Principal — Villavicencio</p>
                      </div>
                    </div>
                    <div className="mt-4 h-px bg-[#f0f0f2]" />
                  </div>
                  <Form {...form}>
                    <form id="shipment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <p className="text-sm font-semibold text-gray-700">Datos del envío</p>
                      <FormField
                        control={form.control}
                        name="shipment_date"
                        render={({ field }) => (
                          <FormItem className="w-[350px]">
                            <FormLabel>Fecha de envío *</FormLabel>
                            <FormControl>
                              <DatePicker value={field.value} onChange={field.onChange} placeholder="Seleccionar fecha" error={form.formState.errors.shipment_date?.message} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tracking_number"
                        render={({ field }) => (
                          <FormItem className="w-[350px]">
                            <FormLabel>Guía / número de envío</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. #A-2289" {...field} />
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
                            <FormLabel>Observaciones del envío</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Marco entregado a mensajero, instrucciones especiales..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                  {id && (
                    <div className="mt-6 pt-6 border-t border-[#f0f0f2]">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Evidencia fotográfica <span className="text-gray-400 font-normal">(opcional)</span>
                      </p>
                      <p className="text-xs text-[#7d7d87] mb-4">Documente el envío al laboratorio con una foto del paquete o guía.</p>
                      <EvidenceUploader orderId={Number(id)} transitionType="sent_to_lab" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-4">Campos marcados con * son obligatorios</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="w-[280px] shrink-0 space-y-4">
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-gray-800 mb-4">◆ Checklist de envío</p>
                <ul className="space-y-3">
                  {['Marco físico en sobre o caja rotulada', 'Número de orden visible en el paquete', 'Guía de mensajero adjunta'].map((item) => (
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
                <p className="text-sm font-semibold text-[#8753ef] mb-4">◆ Al confirmar el envío</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>La orden cambia a estado 'En laboratorio'.</li>
                  <li>El laboratorio recibe la notificación.</li>
                  <li>El historial queda registrado con tu usuario.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default ConfirmShipment;
