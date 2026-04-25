import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/layouts/PageLayout';
import EvidenceUploader from '@/components/lab-orders/EvidenceUploader';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { userService, User } from '@/services/userService';

const LENS_CONDITIONS: ComboboxOption[] = [
  { value: 'Recibido conforme', label: 'Recibido conforme' },
  { value: 'Con daños', label: 'Con daños' },
  { value: 'Incompleto', label: 'Incompleto' },
];

const NON_CONFORMING_CONDITIONS = ['Con daños', 'Incompleto'];
const TOTAL_DRAWERS = 12;

const schema = z
  .object({
    received_by: z.string().min(1, 'El campo es obligatorio'),
    lens_condition: z.string().min(1, 'Seleccione el estado del lente'),
    return_reason: z.string().optional(),
    return_tracking: z.string().optional(),
    observations: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (NON_CONFORMING_CONDITIONS.includes(data.lens_condition) && !data.return_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El motivo de devolución es obligatorio',
        path: ['return_reason'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface ConfirmReceptionProps {
  basePath?: string;
}

const ConfirmReception: React.FC<ConfirmReceptionProps> = ({ basePath = '/receptionist/lab-orders' }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isReceptionist } = useAuth();
  const isAdminUser = isAdmin();
  const isRecepcionista = isReceptionist();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [allOrders, setAllOrders] = useState<LaboratoryOrder[]>([]);
  const [selectedDrawer, setSelectedDrawer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const userOptions: ComboboxOption[] = users.map((u) => ({
    value: `${u.name} ${u.last_name}`.trim(),
    label: `${u.name} ${u.last_name}`.trim(),
  }));

  const drawerMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of allOrders) {
      if (
        o.drawer_number &&
        o.id !== order?.id &&
        o.status !== 'delivered' &&
        o.status !== 'cancelled'
      ) {
        map[o.drawer_number] = o.order_number;
      }
    }
    return map;
  }, [allOrders, order]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      received_by: isRecepcionista && user ? user.name : '',
      lens_condition: '',
      return_reason: '',
      return_tracking: '',
      observations: '',
    },
  });

  const lensCondition = form.watch('lens_condition');
  const isNonConforming = NON_CONFORMING_CONDITIONS.includes(lensCondition);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      laboratoryOrderService.getLaboratoryOrder(Number(id)),
      laboratoryOrderService.getLaboratoryOrders({ per_page: 100 }),
    ])
      .then(([orderData, ordersData]) => {
        setOrder(orderData);
        if (orderData.drawer_number) setSelectedDrawer(orderData.drawer_number);
        setAllOrders(Array.isArray(ordersData?.data) ? ordersData.data : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAdminUser) return;
    userService.getUsers({ per_page: 100 }).then((res) => setUsers(res.data)).catch(() => {});
  }, [isAdminUser]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const receptionDate = new Date().toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const status = isNonConforming ? 'returned_to_lab' : 'received_from_lab';

      if (!isNonConforming && selectedDrawer) {
        await laboratoryOrderService.updateLaboratoryOrder(Number(id), {
          drawer_number: selectedDrawer,
        });
      }

      const notes = isNonConforming
        ? `Retornado al laboratorio. Motivo: ${values.return_reason}. Recibido por: ${values.received_by}. Fecha: ${receptionDate}. Estado: ${values.lens_condition}. Guía retorno: ${values.return_tracking || 'N/A'}. ${values.observations || ''}`.trim()
        : `Recibido por: ${values.received_by}. Fecha: ${receptionDate}. Estado: ${values.lens_condition}.${selectedDrawer ? ` Cajón: #${selectedDrawer}.` : ''} Guía retorno: ${values.return_tracking || 'N/A'}. ${values.observations || ''}`.trim();

      await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), { status, notes });

      if (isNonConforming) {
        toast({ title: 'Devolución registrada', description: 'La orden fue marcada como Retornada al laboratorio.' });
      } else {
        toast({
          title: 'Recepción confirmada',
          description: selectedDrawer
            ? `La orden quedó registrada como recibida en sede. Guardada en cajón #${selectedDrawer}.`
            : 'La orden quedó registrada como recibida en sede.',
        });
      }
      navigate(`${basePath}/${id}`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo confirmar la recepción.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/${id}`)}>
        Cancelar
      </Button>
      <Button
        type="submit"
        form="reception-form"
        size="sm"
        disabled={submitting}
        className={
          isNonConforming
            ? 'bg-[#b82626] hover:bg-[#9b1e1e] text-white'
            : 'bg-[#8753ef] hover:bg-[#7040d6] text-white'
        }
      >
        {submitting
          ? 'Procesando...'
          : isNonConforming
            ? 'Registrar Devolución'
            : 'Confirmar Recepción'}
      </Button>
    </div>
  );

  return (
    <PageLayout title="Confirmar Recepción del Laboratorio" subtitle="Órdenes de Laboratorio / Confirmar Recepción" actions={pageActions}>
      {loading ? (
        <div className="py-8 text-center text-gray-400">Cargando...</div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="flex-[65] min-w-0 space-y-4">
            {isNonConforming && (
              <div className="flex items-start gap-3 bg-[#ffeeed] border border-[#f4c2c2] rounded-[8px] px-4 py-3">
                <span className="text-[#b82626] text-[16px] shrink-0 mt-0.5">⚠</span>
                <div>
                  <p className="text-[13px] font-semibold text-[#b82626]">Recepción no conforme — la orden será retornada al laboratorio</p>
                  <p className="text-[12px] text-[#b82626] mt-0.5">
                    El estado cambiará a <strong>Retornado al laboratorio</strong>. El laboratorio deberá corregir o rehacer el pedido y enviarlo nuevamente.
                  </p>
                </div>
              </div>
            )}

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

                      <FormField
                        control={form.control}
                        name="received_by"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recibido por *</FormLabel>
                            <FormControl>
                              {isAdminUser ? (
                                <Controller
                                  control={form.control}
                                  name="received_by"
                                  render={({ field: f }) => (
                                    <SearchableCombobox
                                      options={userOptions}
                                      value={f.value || ''}
                                      onChange={f.onChange}
                                      placeholder="Seleccione quién recibe"
                                      searchPlaceholder="Buscar usuario..."
                                    />
                                  )}
                                />
                              ) : (
                                <Input
                                  value={field.value}
                                  readOnly
                                  disabled
                                  className="h-9 text-[12px] border-[#e0e0e5] bg-[#fafafa] cursor-default text-[#121215]"
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lens_condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado del lente al recibir *</FormLabel>
                            <FormControl>
                              <SearchableCombobox
                                options={LENS_CONDITIONS}
                                value={field.value || ''}
                                onChange={(v) => {
                                  field.onChange(v);
                                  if (NON_CONFORMING_CONDITIONS.includes(v)) {
                                    setSelectedDrawer('');
                                  }
                                }}
                                placeholder="Seleccione el estado..."
                                searchPlaceholder="Buscar estado..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isNonConforming && (
                        <FormField
                          control={form.control}
                          name="return_reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#b82626]">Motivo de devolución *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe el daño o lo que falta: Ej. Lente rayado en zona central, potencia incorrecta..."
                                  className="text-[12px] border-[#f4c2c2] focus:border-[#b82626] resize-none min-h-[80px]"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

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

                  {!isNonConforming && (
                    <div className="pt-2 border-t border-[#f0f0f2]">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Asignación de cajón <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                      </p>
                      <p className="text-xs text-[#7d7d87] mb-4">
                        Selecciona el cajón donde se almacenará el lente mientras pasa por control de calidad.
                        {selectedDrawer && <span className="ml-1 text-[#8753ef] font-medium">Cajón #{selectedDrawer} seleccionado.</span>}
                      </p>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: TOTAL_DRAWERS }, (_, i) => i + 1).map((num) => {
                          const numStr = String(num);
                          const isSelected = selectedDrawer === numStr;
                          const occupiedBy = drawerMap[numStr];

                          let cls = 'border rounded-lg p-3 flex flex-col items-center transition-colors select-none';
                          if (isSelected) {
                            cls += ' border-[#8753ef] bg-[#f1edff] cursor-pointer';
                          } else if (occupiedBy) {
                            cls += ' border-gray-200 bg-gray-50 cursor-not-allowed opacity-70';
                          } else {
                            cls += ' border-gray-200 hover:border-[#8753ef] hover:bg-[#faf8ff] cursor-pointer';
                          }

                          return (
                            <div
                              key={num}
                              className={cls}
                              onClick={() => {
                                if (occupiedBy) return;
                                setSelectedDrawer(isSelected ? '' : numStr);
                              }}
                            >
                              <span className={`text-xl font-bold leading-tight ${isSelected ? 'text-[#8753ef]' : occupiedBy ? 'text-gray-400' : 'text-gray-700'}`}>
                                #{num}
                              </span>
                              {isSelected ? (
                                <span className="text-[10px] text-[#8753ef] font-medium mt-0.5">Seleccionado</span>
                              ) : occupiedBy ? (
                                <span className="text-[9px] text-gray-400 mt-0.5 truncate w-full text-center">{occupiedBy}</span>
                              ) : (
                                <span className="text-[10px] text-green-600 font-medium mt-0.5">Libre</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-5 text-xs text-gray-500 pt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full border border-gray-300 bg-white" />
                          <span>Libre</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full border border-[#8753ef] bg-[#f1edff]" />
                          <span>Seleccionado</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full border border-gray-300 bg-gray-100" />
                          <span>Ocupado por otra orden</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {id && (
                    <div className="mt-6 pt-6 border-t border-[#f0f0f2]">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Evidencia fotográfica <span className="text-gray-400 font-normal">(opcional)</span>
                      </p>
                      <p className="text-xs text-[#7d7d87] mb-4">
                        {isNonConforming
                          ? 'Registre el daño o defecto encontrado como evidencia de la devolución.'
                          : 'Registre el estado del lente o del empaque al recibirlo del laboratorio.'}
                      </p>
                      <EvidenceUploader
                        orderId={Number(id)}
                        transitionType={isNonConforming ? 'returned_to_lab' : 'received_from_lab'}
                      />
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
                <p className="text-sm font-semibold text-gray-800 mb-4">◆ Checklist de recepción</p>
                <ul className="space-y-3">
                  {[
                    'Verificar número de orden en el paquete',
                    'Revisar estado físico del lente',
                    'Comparar con la orden original',
                    'Registrar guía de transporte',
                    'Asignar cajón de almacenamiento',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8753ef] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {isNonConforming ? (
              <Card className="border border-[#b82626] bg-[#ffeeed]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-[#b82626] mb-3">◆ Flujo de devolución</p>
                  <ul className="space-y-2 text-sm text-[#b82626]">
                    <li>La orden queda como <strong>Retornada al laboratorio</strong>.</li>
                    <li>El laboratorio deberá corregir el pedido y enviarlo nuevamente.</li>
                    <li>El motivo queda registrado en el historial.</li>
                    <li>Cuando el laboratorio reenvíe, confirma la llegada normalmente.</li>
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-[#8753ef] bg-[#f1edff]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-[#8753ef] mb-4">◆ Al confirmar la recepción</p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>La orden queda como <strong>Recibida del laboratorio</strong>.</li>
                    <li>Si asignas cajón ahora, quedará guardado para los siguientes pasos.</li>
                    <li>El lente pasará a control de calidad antes de entregarse al paciente.</li>
                    <li>El historial queda registrado con fecha y usuario.</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default ConfirmReception;
