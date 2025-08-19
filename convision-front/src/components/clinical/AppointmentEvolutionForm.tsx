import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { clinicalHistoryService, AppointmentEvolutionFormData } from '@/services/clinicalHistoryService';
import { X, Save, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const evolutionSchema = z.object({
  evolution_date: z.string().min(1, 'La fecha de evolución es obligatoria'),
  subjective: z.string().min(1, 'La sección subjetiva es obligatoria'),
  objective: z.string().min(1, 'La sección objetiva es obligatoria'),
  assessment: z.string().min(1, 'La evaluación es obligatoria'),
  plan: z.string().min(1, 'El plan de manejo es obligatorio'),
  recommendations: z.string().optional(),
});

type EvolutionFormValues = z.infer<typeof evolutionSchema>;

interface AppointmentEvolutionFormProps {
  appointmentId: number;
  patientId: number;
  patientName: string;
  onComplete: () => void;
  onCancel: () => void;
}

const AppointmentEvolutionForm: React.FC<AppointmentEvolutionFormProps> = ({
  appointmentId,
  patientId,
  patientName,
  onComplete,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(true);
  const [hasHistory, setHasHistory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkClinicalHistory = async () => {
      try {
        setCheckingHistory(true);
        const hasPatientHistory = await clinicalHistoryService.hasPatientHistory(patientId);
        setHasHistory(hasPatientHistory);
      } catch (error) {
        console.error('Error checking clinical history:', error);
        setHasHistory(false);
      } finally {
        setCheckingHistory(false);
      }
    };

    checkClinicalHistory();
  }, [patientId]);

  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionSchema),
    defaultValues: {
      evolution_date: new Date().toISOString().split('T')[0],
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      recommendations: '',
    }
  });

  const onSubmit = async (data: EvolutionFormValues) => {
    try {
      setLoading(true);
      
      await clinicalHistoryService.createEvolutionFromAppointment(appointmentId, data as AppointmentEvolutionFormData);
      
      toast({
        title: 'Evolución creada',
        description: 'La evolución clínica ha sido registrada exitosamente.',
      });
      
      onComplete();
    } catch (error) {
      console.error('Error creating evolution:', error);
      
      let errorMessage = 'No se pudo crear la evolución clínica.';
      
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.errors) {
          const firstError = Object.values(err.response.data.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          }
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nueva Evolución Clínica - {patientName}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {checkingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Verificando historia clínica...</p>
              </div>
            </div>
          ) : !hasHistory ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este paciente no tiene una historia clínica registrada. Para crear una evolución clínica, 
                  primero debe crear la historia clínica del paciente.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to create clinical history
                    window.location.href = `/specialist/patients/${patientId}/history`;
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Crear Historia Clínica
                </Button>
              </div>
            </div>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="evolution_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Evolución</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjetivo (S)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="¿Qué refiere el paciente? Síntomas, molestias, sensaciones..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo (O)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hallazgos del examen físico, signos vitales, observaciones clínicas..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assessment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evaluación (A)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Diagnóstico, impresión clínica, análisis de los hallazgos..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan (P)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Plan de tratamiento, medicamentos, procedimientos, seguimiento..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommendations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recomendaciones (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Recomendaciones adicionales, cuidados especiales, indicaciones..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Guardando...' : 'Guardar Evolución'}
                </Button>
              </div>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentEvolutionForm; 