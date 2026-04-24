import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { laboratoryOrderService, CreateLaboratoryOrderRequest } from '@/services/laboratoryOrderService';
import { Laboratory } from '@/services/laboratoryService';
import { laboratoryService } from '@/services/laboratoryService';
import { Patient } from '@/services/patientService';
import { patientService } from '@/services/patientService';
import PageLayout from '@/components/layouts/PageLayout';

const formSchema = z.object({
  laboratory_id: z.coerce.number().min(1, 'Seleccione un laboratorio'),
  patient_id: z.coerce.number().min(1, 'Seleccione un paciente'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimated_completion_date: z.date().optional().nullable(),
  product_code: z.string().optional(),
  lens_type: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ASIDE_BULLETS = [
  {
    title: 'Paciente',
    desc: 'Persona para quien se fabrica el producto óptico.',
  },
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

const NewLaboratoryOrder: React.FC = () => {
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      laboratory_id: undefined,
      patient_id: undefined,
      priority: 'normal',
      estimated_completion_date: null,
      product_code: '',
      lens_type: '',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    Promise.all([
      laboratoryService.getLaboratories(),
      patientService.getPatients(),
    ])
      .then(([labResp, patResp]) => {
        setLaboratories(labResp.data);
        setPatients(patResp.data);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos necesarios.',
          variant: 'destructive',
        });
      });
  }, []);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const orderData: CreateLaboratoryOrderRequest = {
        laboratory_id: values.laboratory_id,
        patient_id: values.patient_id,
        priority: values.priority,
        estimated_completion_date: values.estimated_completion_date
          ? values.estimated_completion_date.toISOString().split('T')[0]
          : null,
        product_code: values.product_code,
        lens_type: values.lens_type,
        description: values.description,
        notes: values.notes,
      };
      await laboratoryOrderService.createLaboratoryOrder(orderData);
      toast({
        title: 'Orden creada',
        description: 'La orden de laboratorio ha sido creada exitosamente.',
      });
      navigate('/admin/laboratory-orders');
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo crear la orden de laboratorio.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="Nueva Orden de Laboratorio"
      subtitle="Administración / Nueva Orden de Laboratorio"
      topbarClassName="min-h-[64px] h-auto py-3"
      titleStackClassName="gap-1"
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/laboratory-orders')}
            className="border-[#e5e5e9] text-[#0f0f12]"
          >
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={submitting}
            className="bg-[#3a71f7] hover:bg-[#2558d4] text-white"
          >
            {submitting ? 'Creando...' : 'Crear Orden'}
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
                <form id="new-lab-order-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormSection title="Datos del paciente">
                    <FormField
                      control={form.control}
                      name="patient_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paciente <span className="text-destructive">*</span></FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value?.toString() || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un paciente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.first_name} {patient.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>

                  <FormSection title="Datos de la orden">
                    <FormField
                      control={form.control}
                      name="laboratory_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Laboratorio <span className="text-destructive">*</span></FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value?.toString() || ''}
                          >
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
                                minDate={new Date()}
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

export default NewLaboratoryOrder;
