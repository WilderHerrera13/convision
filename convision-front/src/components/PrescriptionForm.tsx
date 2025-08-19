import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrescriptionFormData, prescriptionService } from '@/services/prescriptionService';
import { appointmentsService } from '@/services/appointmentsService';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Glasses, Save, Printer, ArrowLeft, AlertCircle, Check, Eye, EyeOff, FileEdit, Clipboard, HeartPulse, FilePlus2, MoveRight, Palette, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';
import LensRecommendation from './LensRecommendation';
import { Lens } from '@/services/lensService';
import api from '@/lib/axios';
import { clinicalEvolutionService } from '@/services/clinicalEvolutionService';
import DrawableModal from '@/components/ui/drawable-modal';

interface PrescriptionFormProps {
  appointmentId: number;
  patientName: string;
  onComplete: () => void;
  onCancel: () => void;
}

// Helper function to validate numeric values with optional decimal points
const numericValidation = (field: string, required = false) => {
  const baseValidator = z.string().refine(
    (val) => val === '' || !isNaN(Number(val)),
    {
      message: `${field} debe ser un valor numérico`
    }
  );
  
  return required 
    ? baseValidator.refine(val => val.length > 0, { message: `${field} es requerido` })
    : baseValidator;
};

const prescriptionSchema = z.object({
  // Right eye fields
  right_sphere: numericValidation('Esfera (OD)'),
  right_cylinder: numericValidation('Cilindro (OD)'),
  right_axis: numericValidation('Eje (OD)'),
  right_addition: numericValidation('Adición (OD)'),
  right_height: numericValidation('Altura F (OD)'),
  right_distance_p: numericValidation('Distancia P (OD)'),
  right_visual_acuity_far: numericValidation('A.V. Lejos (OD)'),
  right_visual_acuity_near: numericValidation('A.V. Cerca (OD)'),
  
  // Left eye fields
  left_sphere: numericValidation('Esfera (OI)'),
  left_cylinder: numericValidation('Cilindro (OI)'),
  left_axis: numericValidation('Eje (OI)'),
  left_addition: numericValidation('Adición (OI)'),
  left_height: numericValidation('Altura F (OI)'),
  left_distance_p: numericValidation('Distancia P (OI)'),
  left_visual_acuity_far: numericValidation('A.V. Lejos (OI)'),
  left_visual_acuity_near: numericValidation('A.V. Cerca (OI)'),
  
  // Required fields
  correction_type: z.string().min(1, { message: 'Tipo de corrección es requerido' }),
  usage_type: z.string().min(1, { message: 'Forma de uso es requerida' }),
  recommendation: z.string().optional(),
  professional: z.string().min(1, { message: 'Nombre del profesional es requerido' }),
  observation: z.string().min(1, { message: 'La observación es requerida' })
}).refine(
  data => {
    // At least one value in either eye must be filled
    const hasRightEyeData = data.right_sphere || data.right_cylinder || data.right_axis || data.right_addition;
    const hasLeftEyeData = data.left_sphere || data.left_cylinder || data.left_axis || data.left_addition;
    return hasRightEyeData || hasLeftEyeData;
  },
  {
    message: "Debe ingresar al menos un valor para el ojo derecho o el ojo izquierdo",
    path: ["right_sphere"] // Show this error on the right_sphere field
  }
);

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({
  appointmentId,
  patientName,
  onComplete,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('prescription');
  const [recommendedLens, setRecommendedLens] = useState<Lens | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [hasRequiredEvolution, setHasRequiredEvolution] = useState(false);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientFullName, setPatientFullName] = useState<string>(patientName);
  const [isDrawableModalOpen, setIsDrawableModalOpen] = useState(false);
  const [lensAnnotation, setLensAnnotation] = useState<string | null>(null);
  const [annotationPaths, setAnnotationPaths] = useState<string | null>(null);
  const [loadingAnnotation, setLoadingAnnotation] = useState(false);
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false);
  const navigate = useNavigate();
  
  // Check if the patient has a clinical evolution for this specific appointment
  useEffect(() => {
    const checkRequiredEvolution = async () => {
      try {
        setLoading(true);
        // First, get the appointment details to get the patient id and confirm patient name
        const appointmentResponse = await api.get(`/api/v1/appointments/${appointmentId}`);
        const appointmentData = appointmentResponse.data.data; 
        const currentPatient = appointmentData.patient;
        setPatientId(currentPatient.id);
        setPatientFullName(`${currentPatient.first_name} ${currentPatient.last_name}`);

        // Check for evolutions specifically for this appointment
        // This assumes your clinicalEvolutionService or a direct API call can fetch this.
        // Adjust if your endpoint/service method is different.
        const evolutionsResponse = await clinicalEvolutionService.getEvolutionsByPatient(currentPatient.id, appointmentId);
        setHasRequiredEvolution(evolutionsResponse.length > 0);

      } catch (error) {
        console.error('Error checking required evolution for appointment:', error);
        setHasRequiredEvolution(false); // Assume false on error
        toast({
          title: 'Error de Verificación',
          description: 'No se pudo verificar la existencia de evoluciones para esta cita.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkRequiredEvolution();
  }, [appointmentId]);
  
  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      right_sphere: '0.00',
      right_cylinder: '0.00',
      right_axis: '',
      right_addition: '',
      right_height: '57',
      right_distance_p: '20',
      right_visual_acuity_far: '0.50',
      right_visual_acuity_near: '0.50',
      left_sphere: '0.00',
      left_cylinder: '0.00',
      left_axis: '',
      left_addition: '',
      left_height: '59',
      left_distance_p: '20',
      left_visual_acuity_far: '0.50',
      left_visual_acuity_near: '0.50',
      correction_type: 'TOTAL',
      usage_type: 'PERMANENTE',
      recommendation: '',
      professional: 'Usuario Externo',
      observation: 'LENTES MONOFOCALES AR FOTOSENSIBLE',
    },
    mode: "onChange",
  });

  useEffect(() => {
    const checkExistingPrescription = async () => {
      if (!appointmentId) return;
      
      setLoading(true);
      try {
        const existingPrescription = await prescriptionService.getPrescriptionByAppointment(appointmentId);
        if (existingPrescription) {
          setPrescriptionId(existingPrescription.id);
          
          // Load the annotation if it exists (now based on appointment ID)
          try {
            const annotationData = await prescriptionService.getAnnotation(appointmentId.toString());
            if (annotationData.annotation) {
              setLensAnnotation(annotationData.annotation);
              setAnnotationPaths(annotationData.paths);
            }
          } catch (error) {
            console.error('Error loading annotation:', error);
          }
          
          form.reset({
            right_sphere: existingPrescription.right_sphere || '0.00',
            right_cylinder: existingPrescription.right_cylinder || '0.00',
            right_axis: existingPrescription.right_axis || '',
            right_addition: existingPrescription.right_addition || '',
            right_height: existingPrescription.right_height || '57',
            right_distance_p: existingPrescription.right_distance_p || '20',
            right_visual_acuity_far: existingPrescription.right_visual_acuity_far || '0.50',
            right_visual_acuity_near: existingPrescription.right_visual_acuity_near || '0.50',
            left_sphere: existingPrescription.left_sphere || '0.00',
            left_cylinder: existingPrescription.left_cylinder || '0.00',
            left_axis: existingPrescription.left_axis || '',
            left_addition: existingPrescription.left_addition || '',
            left_height: existingPrescription.left_height || '59',
            left_distance_p: existingPrescription.left_distance_p || '20',
            left_visual_acuity_far: existingPrescription.left_visual_acuity_far || '0.50',
            left_visual_acuity_near: existingPrescription.left_visual_acuity_near || '0.50',
            correction_type: existingPrescription.correction_type || 'TOTAL',
            usage_type: existingPrescription.usage_type || 'PERMANENTE',
            recommendation: existingPrescription.recommendation || '',
            professional: existingPrescription.professional || 'Usuario Externo',
            observation: existingPrescription.observation || 'LENTES MONOFOCALES AR FOTOSENSIBLE',
          });
        } else {
          // No existing prescription, but still try to load annotation
          try {
            const annotationData = await prescriptionService.getAnnotation(appointmentId.toString());
            if (annotationData.annotation) {
              setLensAnnotation(annotationData.annotation);
              setAnnotationPaths(annotationData.paths);
            }
          } catch (error) {
            console.error('Error loading annotation:', error);
          }
        }
      } catch (error) {
        console.error('Error checking existing prescription:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingPrescription();
  }, [appointmentId, form]);

  const handleSubmit = async (data: PrescriptionFormValues) => {
    setIsSubmitting(true);
    setFormError(null);
     
    try {
      const today = new Date().toISOString().split('T')[0];
      const prescriptionData: PrescriptionFormData = {
        appointment_id: appointmentId,
        date: today,
        document: `PRESCRIPTION-${appointmentId}`,
        patient_name: patientFullName,
        right_sphere: data.right_sphere,
        right_cylinder: data.right_cylinder,
        right_axis: data.right_axis,
        right_addition: data.right_addition,
        right_height: data.right_height,
        right_distance_p: data.right_distance_p,
        right_visual_acuity_far: data.right_visual_acuity_far,
        right_visual_acuity_near: data.right_visual_acuity_near,
        left_sphere: data.left_sphere,
        left_cylinder: data.left_cylinder,
        left_axis: data.left_axis,
        left_addition: data.left_addition,
        left_height: data.left_height,
        left_distance_p: data.left_distance_p,
        left_visual_acuity_far: data.left_visual_acuity_far,
        left_visual_acuity_near: data.left_visual_acuity_near,
        correction_type: data.correction_type,
        usage_type: data.usage_type,
        recommendation: recommendedLens 
          ? `${recommendedLens.description} - ${recommendedLens.brand?.name || ''} ${recommendedLens.material?.name || ''} ${recommendedLens.treatment?.name || ''}` 
          : data.recommendation || '',
        professional: data.professional,
        observation: data.observation,
        attachment: lensAnnotation || undefined,
      };

      console.log('Submitting prescription data:', prescriptionData);
      let prescription;
      
      if (prescriptionId) {
        // Update existing prescription
        prescription = await prescriptionService.updatePrescription(prescriptionId, prescriptionData);
        toast({
          title: 'Fórmula actualizada exitosamente',
          description: 'La fórmula ha sido actualizada correctamente. Puede revisar las recomendaciones de lentes si lo desea.',
        });
      } else {
        // Create new prescription
        prescription = await prescriptionService.createPrescription(prescriptionData);
        setPrescriptionId(prescription.id);
        toast({
          title: 'Fórmula creada exitosamente',
          description: 'La fórmula ha sido guardada correctamente. Puede revisar las recomendaciones de lentes si lo desea.',
        });
      }
      
      // Optionally switch to recommendation tab, but don't force it
      setActiveTab('recommendation');
    } catch (error) {
      console.error('Error creating prescription:', error);
      
      let errorMessage = 'Error al crear la fórmula. Por favor, intente nuevamente.';
      
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
      
      setFormError(errorMessage);
      
      toast({
        title: 'Error al crear la fórmula',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleOpenDrawableModal = () => {
    setIsDrawableModalOpen(true);
  };

  const handleCloseDrawableModal = () => {
    setIsDrawableModalOpen(false);
  };

  const handleSaveAnnotation = async (dataUrl: string, pathsJson?: string) => {
    // Now annotations are linked to appointments, not prescriptions
    setLoadingAnnotation(true);
    try {
      await prescriptionService.uploadAnnotation(appointmentId.toString(), dataUrl, pathsJson);
      setLensAnnotation(dataUrl);
      setAnnotationPaths(pathsJson || null);
      
      toast({
        title: "Anotación guardada",
        description: "La anotación sobre los lentes ha sido guardada exitosamente.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la anotación. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingAnnotation(false);
    }
  };

  const handleCompleteAppointment = async () => {
    setIsCompletingAppointment(true);
    try {
      await appointmentsService.completeAppointment(appointmentId);
      toast({
        title: "Cita completada",
        description: "La cita ha sido marcada como completada exitosamente.",
        variant: "default",
      });
      onComplete(); // Call the parent callback to navigate away
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la cita. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsCompletingAppointment(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Cargando Formulario de Fórmula</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="h-8 w-8 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando información de la cita y el paciente...</p>
        </CardContent>
      </Card>
    );
  }

  // If no required evolution for this specific appointment, show message and link to patient history
  if (!hasRequiredEvolution && patientId) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-amber-700 flex items-center">
            <AlertCircle className="mr-2 h-6 w-6" />
            Atención: Evolución Clínica Requerida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Para generar una fórmula para el paciente <strong className="text-blue-600">{patientFullName}</strong> (Cita ID: {appointmentId}),
            primero debe existir una <strong className="text-amber-700">evolución clínica completa y asociada a esta cita específica</strong>.
          </p>
          <p className="text-sm text-gray-600">
            Esto es una medida necesaria para mantener un registro médico preciso y garantizar la trazabilidad de las recomendaciones ópticas.
          </p>
          <p className="text-sm text-gray-600">
            Asegúrese de haber creado una evolución desde la pantalla de detalles de esta cita.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-5 border-t">
          <Button 
            variant="outline"
            onClick={onCancel} 
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Detalles de Cita
          </Button>
          <Button 
            onClick={() => navigate(`/specialist/patients/${patientId}/history?appointmentId=${appointmentId}`)} 
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
          >
            <Clipboard className="mr-2 h-4 w-4" />
            Ir a Historia Clínica del Paciente
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full border-slate-200 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center text-blue-800">
              <Glasses className="mr-2 h-5 w-5 text-blue-600" /> 
              Fórmula Oftalmológica
            </CardTitle>
            <CardDescription className="text-blue-600 mt-1 font-medium">
              Paciente: {patientFullName} | Cita #{appointmentId}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {formError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {formError}
            </AlertDescription>
          </Alert>
        )}
        
        {hasRequiredEvolution && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Información importante</AlertTitle>
            <AlertDescription className="text-amber-700">
              Asegúrese de haber creado al menos una evolución clínica para esta cita antes de crear la fórmula. 
              Si no existe una evolución, la creación de la fórmula fallará.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Tabs defaultValue="prescription" className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-blue-50 p-1 rounded-md border border-blue-100">
                <TabsTrigger 
                  value="prescription" 
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-md py-3" 
                  onClick={() => handleTabChange('prescription')}
                >
                  <Glasses className="mr-2 h-4 w-4" />
                  Fórmula
                </TabsTrigger>
                <TabsTrigger 
                  value="recommendation" 
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-md py-3" 
                  onClick={() => handleTabChange('recommendation')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Recomendación de Lentes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="prescription" className="space-y-6 pt-6 p-1">
                {/* Patient Information */}
                <div className="grid grid-cols-1 gap-4 mb-5 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center">
                    <Clipboard className="mr-2 h-4 w-4 text-blue-600" />
                    Información del Paciente
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <Label className="text-slate-700">Fecha</Label>
                      <Input
                        type="text"
                        value={formatDate(new Date())}
                        disabled
                        className="bg-white border-slate-200"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-slate-700">Documento</Label>
                      <Input
                        type="text"
                        value={`PRESCRIPTION-${appointmentId}`}
                        disabled
                        className="bg-white border-slate-200"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-slate-700">Nombre</Label>
                      <Input
                        type="text"
                        value={patientFullName}
                        disabled
                        className="bg-white border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Lens Annotation Section - MOVED HERE */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold text-slate-700 flex items-center">
                      <Palette className="mr-2 h-4 w-4 text-blue-600" />
                      Anotaciones sobre Lentes
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenDrawableModal}
                      disabled={loadingAnnotation}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50"
                    >
                      {loadingAnnotation ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      ) : (
                        <FileEdit className="mr-2 h-4 w-4" />
                      )}
                      {loadingAnnotation ? 'Guardando...' : 'Anotar / Ver Anotación'}
                    </Button>
                  </div>
                  {lensAnnotation && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-3">
                      <p className="text-sm text-green-800 flex items-center">
                        <Check className="mr-2 h-4 w-4" />
                        Anotación guardada. Puede verla o editarla haciendo clic en el botón.
                      </p>
                    </div>
                  )}
                  {!lensAnnotation && (
                     <p className="text-xs text-slate-500 mt-1">
                       Haga clic en el botón para realizar anotaciones gráficas sobre una imagen de lentes. Las anotaciones se guardan automáticamente.
                     </p>
                  )}
                </div>

                {/* Prescription Fields */}
                <div className="border border-slate-200 rounded-xl p-6 bg-gradient-to-br from-white to-slate-50 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <Glasses className="mr-3 h-5 w-5 text-blue-600" />
                      Valores de la Fórmula
                    </h3>
                    <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      Medidas Oftalmológicas
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Right Eye (OD) */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="flex items-center">
                          <span className="inline-block w-4 h-4 rounded-full bg-blue-600 mr-3 shadow-sm"></span>
                          <h4 className="text-base font-semibold text-blue-800">Ojo Derecho (OD)</h4>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Refraction Group */}
                        <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                          <h5 className="text-sm font-medium text-slate-700 mb-3 text-center border-b border-slate-200 pb-2">Refracción</h5>
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="right_sphere"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Esfera</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.00"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_sphere ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="right_cylinder"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Cilindro</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.00"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_cylinder ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="right_axis"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Eje</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_axis ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="right_addition"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Adición</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.00"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_addition ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Measurements Group */}
                        <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                          <h5 className="text-sm font-medium text-slate-700 mb-3 text-center border-b border-slate-200 pb-2">Medidas</h5>
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="right_height"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Altura F</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="57"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_height ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="right_distance_p"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Distancia P</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="20"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_distance_p ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Visual Acuity Group */}
                        <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm md:col-span-2 lg:col-span-2">
                          <h5 className="text-sm font-medium text-slate-700 mb-3 text-center border-b border-slate-200 pb-2">Agudeza Visual</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="right_visual_acuity_far"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Lejos</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.50"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_visual_acuity_far ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="right_visual_acuity_near"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Cerca</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.50"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.right_visual_acuity_near ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Left Eye (OI) */}
                    <div className="bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="flex items-center">
                          <span className="inline-block w-4 h-4 rounded-full bg-rose-600 mr-3 shadow-sm"></span>
                          <h4 className="text-base font-semibold text-rose-800">Ojo Izquierdo (OI)</h4>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Refraction Group */}
                        <div className="bg-white rounded-lg p-4 border border-rose-100 shadow-sm">
                          <h5 className="text-sm font-medium text-slate-700 mb-3 text-center border-b border-slate-200 pb-2">Refracción</h5>
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="left_sphere"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Esfera</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.00"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_sphere ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="left_cylinder"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Cilindro</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.00"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_cylinder ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="left_axis"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Eje</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_axis ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="left_addition"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Adición</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.00"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_addition ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Measurements Group */}
                        <div className="bg-white rounded-lg p-4 border border-rose-100 shadow-sm">
                          <h5 className="text-sm font-medium text-slate-700 mb-3 text-center border-b border-slate-200 pb-2">Medidas</h5>
                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="left_height"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Altura F</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="59"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_height ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="left_distance_p"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Distancia P</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="20"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_distance_p ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Visual Acuity Group */}
                        <div className="bg-white rounded-lg p-4 border border-rose-100 shadow-sm md:col-span-2 lg:col-span-2">
                          <h5 className="text-sm font-medium text-slate-700 mb-3 text-center border-b border-slate-200 pb-2">Agudeza Visual</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="left_visual_acuity_far"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Lejos</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.50"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_visual_acuity_far ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="left_visual_acuity_near"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-slate-600">Cerca</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="0.50"
                                      className={`h-10 text-center font-mono bg-slate-50 border-slate-200 focus:border-rose-400 focus:ring-rose-400 ${form.formState.errors.left_visual_acuity_near ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <FormField
                        control={form.control}
                        name="correction_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de corrección</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione tipo de corrección" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="TOTAL">TOTAL</SelectItem>
                                <SelectItem value="PARCIAL">PARCIAL</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <FormField
                        control={form.control}
                        name="usage_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forma de uso</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione forma de uso" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PERMANENTE">PERMANENTE</SelectItem>
                                <SelectItem value="TRANSITORIO">TRANSITORIO</SelectItem>
                                <SelectItem value="TAREAS VISUALES">TAREAS VISUALES</SelectItem>
                                <SelectItem value="ACTIVIDADES AL AIRE LIBRE">ACTIVIDADES AL AIRE LIBRE</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="professional"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profesional</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ingrese el nombre del profesional"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="recommendation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recomendación</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Ingrese recomendaciones para el paciente"
                              className="h-24"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="observation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observación</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Ingrese observaciones o notas adicionales"
                              className="h-24"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendation" className="pt-6">
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Recomendación Opcional</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    La recomendación de lentes es opcional. Puede completar la cita sin seleccionar un lente específico si considera que no es necesario.
                  </AlertDescription>
                </Alert>
                <LensRecommendation
                  onSelectLens={(lens) => setRecommendedLens(lens)}
                  selectedLens={recommendedLens}
                  prescriptionId={prescriptionId}
                />
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between items-center space-x-3 mt-8 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isCompletingAppointment}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              
              <div className="flex space-x-3">
                <Button 
                  type="submit"
                  disabled={isSubmitting || isCompletingAppointment}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Guardando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Fórmula
                    </div>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleCompleteAppointment}
                  disabled={isSubmitting || isCompletingAppointment}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                >
                  {isCompletingAppointment ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Completando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Completar Cita
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        <DrawableModal
          isOpen={isDrawableModalOpen}
          onClose={handleCloseDrawableModal}
          onSave={handleSaveAnnotation}
          imageUrl="/lenses.png"
          title="Anotar sobre Imagen de Lentes"
          description="Utilice las herramientas de dibujo para hacer anotaciones sobre la imagen de los lentes como parte de la prescripción."
          initialPaths={annotationPaths ? (() => {
            try {
              return JSON.parse(annotationPaths);
            } catch {
              return undefined;
            }
          })() : undefined}
        />
      </CardContent>
    </Card>
  );
};

export default PrescriptionForm;