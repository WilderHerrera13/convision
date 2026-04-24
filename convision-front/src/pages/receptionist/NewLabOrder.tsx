import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { laboratoryOrderService, CreateLaboratoryOrderRequest } from '@/services/laboratoryOrderService';
import { Laboratory, laboratoryService } from '@/services/laboratoryService';
import { Patient, patientService } from '@/services/patientService';
import PageLayout from '@/components/layouts/PageLayout';
import NewLabOrderSidebar from './NewLabOrderSidebar';

const formSchema = z.object({
  sale_date: z.date().optional().nullable(),
  order_ref: z.string().optional(),
  seller: z.string().optional(),
  branch: z.string().optional(),
  patient_id: z.coerce.number().min(1, 'Seleccione un paciente'),
  patient_document: z.string().optional(),
  patient_phone: z.string().optional(),
  laboratory_id: z.coerce.number().min(1, 'Seleccione un laboratorio'),
  product_code: z.string().optional(),
  lens_type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimated_completion_date: z.date().optional().nullable(),
  description: z.string().optional(),
  initial_status: z.string().default('pending'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NewLabOrder: React.FC = () => {
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sale_date: null,
      order_ref: '',
      seller: '',
      branch: '',
      patient_id: undefined,
      patient_document: '',
      patient_phone: '',
      laboratory_id: undefined,
      product_code: '',
      lens_type: '',
      priority: 'normal',
      estimated_completion_date: null,
      description: '',
      initial_status: 'pending',
      notes: '',
    },
  });

  const watchedPatientId = form.watch('patient_id');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [labResponse, patientResponse] = await Promise.all([
          laboratoryService.getLaboratories(),
          patientService.getPatients(),
        ]);
        setLaboratories(labResponse.data);
        setPatients(patientResponse.data);
      } catch {
        toast({ title: 'Error', description: 'No se pudieron cargar los datos necesarios.', variant: 'destructive' });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!watchedPatientId) return;
    const found = patients.find((p) => p.id === Number(watchedPatientId));
    if (found) {
      form.setValue('patient_document', String(found.identification ?? ''));
      form.setValue('patient_phone', String(found.phone ?? ''));
    }
  }, [watchedPatientId, patients, form]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload: CreateLaboratoryOrderRequest = {
        laboratory_id: values.laboratory_id,
        patient_id: values.patient_id,
        priority: values.priority,
        status: values.initial_status,
        estimated_completion_date: values.estimated_completion_date
          ? values.estimated_completion_date.toISOString().split('T')[0]
          : null,
        notes: values.notes,
      };
      const response = await laboratoryOrderService.createLaboratoryOrder(payload);
      toast({ title: 'Orden creada', description: 'La orden de laboratorio ha sido creada exitosamente.' });
      const newId = response?.data?.id ?? response?.id;
      navigate(newId ? `/receptionist/lab-orders/${newId}` : '/receptionist/lab-orders');
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la orden de laboratorio.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Nueva Orden de Laboratorio"
      subtitle="Órdenes de Laboratorio / Nueva Orden de Laboratorio"
      topbarClassName="min-h-[64px] h-auto py-3"
      titleStackClassName="gap-1"
      actions={
        <>
          <Button variant="outline" onClick={() => navigate('/receptionist/lab-orders')}>Cancelar</Button>
          <Button
            type="submit"
            form="new-lab-order-form"
            disabled={loading}
            className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
          >
            {loading ? 'Creando...' : 'Crear Orden'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="border-b border-border">
              <div className="flex px-6 pt-4">
                <button type="button" className="relative pb-3 text-[13px] font-semibold text-[#8753ef]">
                  Información de la orden
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8753ef] rounded-t-full" />
                </button>
              </div>
            </div>
            <CardContent className="pt-6">
              <Form {...form}>
                <form id="new-lab-order-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormSection title="Gestión comercial">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="sale_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de venta</FormLabel>
                          <FormControl><DatePicker value={field.value} onChange={field.onChange} placeholder="Seleccionar fecha" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="order_ref" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orden de pedido</FormLabel>
                          <FormControl><Input placeholder="Ej. SALE-2026-0099" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="seller" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendedor</FormLabel>
                          <FormControl><Input placeholder="Nombre del vendedor" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="branch" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sede</FormLabel>
                          <FormControl><Input placeholder="Sede de la venta" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </FormSection>

                  <FormSection title="Datos del paciente">
                    <FormField control={form.control} name="patient_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paciente <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString() || ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un paciente" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {patients.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.first_name} {p.last_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <FormField control={form.control} name="patient_document" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Documento del cliente</FormLabel>
                          <FormControl><Input placeholder="Cédula / NIT del paciente" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="patient_phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número celular</FormLabel>
                          <FormControl><Input placeholder="+57 310 000 0000" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </FormSection>

                  <FormSection title="Datos de la orden">
                    <FormField control={form.control} name="laboratory_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Laboratorio <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString() || ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un laboratorio" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {laboratories.map((lab) => (
                              <SelectItem key={lab.id} value={lab.id.toString()}>{lab.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <FormField control={form.control} name="product_code" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código del producto</FormLabel>
                          <FormControl><Input placeholder="Ej. LEN-CR39-MF-125" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lens_type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de lente</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione tipo" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="monofocal">Monofocal</SelectItem>
                              <SelectItem value="bifocal">Bifocal</SelectItem>
                              <SelectItem value="multifocal">Multifocal</SelectItem>
                              <SelectItem value="progresivo">Progresivo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridad <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione prioridad" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="estimated_completion_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha estimada de entrega</FormLabel>
                          <FormControl><DatePicker value={field.value} onChange={field.onChange} placeholder="Seleccionar fecha estimada" minDate={new Date()} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="mt-4">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción del pedido</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Lentes monofocales CR-39, antirreflejo, +1.25 OD / +1.00 OI..." rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </FormSection>

                  <FormSection title="Detalles adicionales">
                    <FormField control={form.control} name="initial_status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado inicial</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="in_process">En proceso</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="mt-4">
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas para el laboratorio</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Instrucciones especiales, observaciones o alertas para el laboratorio" rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </FormSection>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-[12px] text-muted-foreground px-1">
            Campos marcados con <span className="text-destructive">*</span> son obligatorios
          </p>
        </div>

        <NewLabOrderSidebar />
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

export default NewLabOrder;
