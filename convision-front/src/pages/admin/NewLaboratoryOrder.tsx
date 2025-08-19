import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { laboratoryOrderService, CreateLaboratoryOrderRequest } from '@/services/laboratoryOrderService';
import { Laboratory } from '@/services/laboratoryService';
import { laboratoryService } from '@/services/laboratoryService';
import { Patient } from '@/services/patientService';
import { patientService } from '@/services/patientService';

// Define form schema
const formSchema = z.object({
  laboratory_id: z.coerce.number().min(1, "Seleccione un laboratorio"),
  patient_id: z.coerce.number().min(1, "Seleccione un paciente"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  estimated_completion_date: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NewLaboratoryOrder: React.FC = () => {
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      laboratory_id: undefined,
      patient_id: undefined,
      priority: "normal",
      estimated_completion_date: null,
      notes: "",
    },
  });

  // Load laboratories and patients on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get active laboratories
        const labResponse = await laboratoryService.getLaboratories();
        setLaboratories(labResponse.data);
        
        // Get patients
        const patientResponse = await patientService.getPatients();
        setPatients(patientResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos necesarios.',
          variant: 'destructive'
        });
      }
    };
    
    fetchData();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    
    try {
      // Prepare data for API
      const orderData: CreateLaboratoryOrderRequest = {
        laboratory_id: values.laboratory_id,
        patient_id: values.patient_id,
        priority: values.priority,
        estimated_completion_date: values.estimated_completion_date ? values.estimated_completion_date.toISOString().split('T')[0] : null,
        notes: values.notes,
      };
      
      // Create laboratory order
      const response = await laboratoryOrderService.createLaboratoryOrder(orderData);
      
      toast({
        title: 'Orden creada',
        description: 'La orden de laboratorio ha sido creada exitosamente.',
        variant: 'default'
      });
      
      // Navigate back to laboratory orders list
      navigate('/admin/laboratory-orders');
      
    } catch (error) {
      console.error('Error creating laboratory order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la orden de laboratorio.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Nueva Orden de Laboratorio</h2>
        <Button variant="outline" onClick={() => navigate('/admin/laboratory-orders')}>
          Cancelar
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Información de la Orden</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Laboratory field */}
                <FormField
                  control={form.control}
                  name="laboratory_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Laboratorio</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un laboratorio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {laboratories.map(lab => (
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
                
                {/* Patient field */}
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map(patient => (
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
                
                {/* Priority field */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione la prioridad" />
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
                
                {/* Estimated completion date field */}
                <FormField
                  control={form.control}
                  name="estimated_completion_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Estimada de Entrega</FormLabel>
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
              
              {/* Notes field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Información adicional sobre la orden" 
                        {...field} 
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Crear Orden'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewLaboratoryOrder; 