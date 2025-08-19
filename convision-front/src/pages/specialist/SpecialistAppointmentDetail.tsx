import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Play,
  Pause,
  CheckCircle,
  FileText,
  Stethoscope,
  Eye,
  Edit,
  History,
  AlertCircle,
  Info,
  CalendarDays,
  Timer,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { appointmentsService } from '@/services/appointmentsService';
import AppointmentEvolutionForm from '@/components/clinical/AppointmentEvolutionForm';
import AppointmentEvolutionsList from '@/components/clinical/AppointmentEvolutionsList';

interface PrescriptionData {
  id: number;
  recommendation?: string;
  observation?: string;
  right_sphere?: string;
  left_sphere?: string;
  right_cylinder?: string;
  left_cylinder?: string;
  right_axis?: string;
  left_axis?: string;
  right_addition?: string;
  left_addition?: string;
  [key: string]: unknown;
}

interface AppointmentApiResponse {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    identification: string;
    email: string;
    phone?: string;
    birth_date?: string;
    gender?: string;
    address?: string;
  };
  specialist: {
    id: number;
    name: string;
    identification?: string;
    role: string;
  };
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
  taken_by_id?: number;
  takenBy?: {
    id: number;
    name: string;
  };
  prescription?: PrescriptionData | null;
}

type AppointmentWithPrescription = {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    identification: string;
    email: string;
    phone?: string;
    birth_date?: string;
    gender?: string;
    address?: string;
  };
  specialist: {
    id: number;
    name: string;
    identification?: string;
    role: string;
  };
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
  taken_by_id?: number;
  takenBy?: {
    id: number;
    name: string;
  };
  prescription?: PrescriptionData | null;
};

const SpecialistAppointmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [appointment, setAppointment] = useState<AppointmentWithPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [evolutionsKey, setEvolutionsKey] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasEvolutions, setHasEvolutions] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAppointment();
    }
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const appointmentData = await appointmentsService.getAppointmentById(Number(id)) as unknown as AppointmentApiResponse;
      
      const extendedAppointment: AppointmentWithPrescription = {
        ...appointmentData,
        prescription: appointmentData.prescription || null,
      };
      
      setAppointment(extendedAppointment);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar la información de la cita.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAppointment = async () => {
    if (!appointment) return;
    
    setActionLoading('take');
    try {
      await appointmentsService.takeAppointment(appointment.id);
      toast({
        title: 'Cita tomada',
        description: 'Has iniciado la atención de esta cita exitosamente.',
      });
      fetchAppointment();
    } catch (error: unknown) {
      // Check if this is an appointment in progress error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error_type?: string; current_appointment_id?: number; message?: string } } };
        
        if (axiosError.response?.data?.error_type === 'appointment_in_progress' && axiosError.response?.data?.current_appointment_id) {
          const currentAppointmentId = axiosError.response.data.current_appointment_id;
          toast({
            variant: 'destructive',
            title: 'Cita en progreso',
            description: 'Ya tienes una cita en progreso.',
            action: (
              <button
                onClick={() => navigate(`/specialist/appointments/${currentAppointmentId}`)}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive"
              >
                Ir a cita
              </button>
            ),
          });
          return;
        }
      }
      
      // Handle other errors
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : error instanceof Error 
        ? error.message 
        : 'No se pudo tomar la cita.';
        
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseAppointment = async () => {
    if (!appointment) return;
    
    setActionLoading('pause');
    try {
      await appointmentsService.pauseAppointment(appointment.id);
      toast({
        title: 'Cita pausada',
        description: 'La cita ha sido pausada. Puedes reanudarla más tarde.',
      });
      fetchAppointment();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo pausar la cita.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeAppointment = async () => {
    if (!appointment) return;
    
    setActionLoading('resume');
    try {
      await appointmentsService.resumeAppointment(appointment.id);
      toast({
        title: 'Cita reanudada',
        description: 'Has reanudado la atención de esta cita.',
      });
      fetchAppointment();
    } catch (error: unknown) {
      // Check if this is an appointment in progress error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error_type?: string; current_appointment_id?: number; message?: string } } };
        
        if (axiosError.response?.data?.error_type === 'appointment_in_progress' && axiosError.response?.data?.current_appointment_id) {
          const currentAppointmentId = axiosError.response.data.current_appointment_id;
          toast({
            variant: 'destructive',
            title: 'Cita en progreso',
            description: 'Ya tienes una cita en progreso.',
            action: (
              <button
                onClick={() => navigate(`/specialist/appointments/${currentAppointmentId}`)}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive"
              >
                Ir a cita
              </button>
            ),
          });
          return;
        }
      }
      
      // Handle other errors
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : error instanceof Error 
        ? error.message 
        : 'No se pudo reanudar la cita.';
        
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteAppointment = async () => {
    if (!appointment) return;
    
    setActionLoading('complete');
    try {
      const response = await fetch(`/api/v1/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: 'completed'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al completar la cita');
      }
      
      toast({
        title: 'Cita completada',
        description: 'La cita ha sido marcada como completada.',
      });
      fetchAppointment();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo completar la cita.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEvolutionComplete = () => {
    setShowEvolutionForm(false);
    setEvolutionsKey(prev => prev + 1);
    toast({
      title: 'Evolución creada',
      description: 'La evolución clínica ha sido registrada exitosamente.',
    });
    // Optionally refresh appointment data if needed
    fetchAppointment();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <Calendar className="h-4 w-4" />,
          text: 'Programada'
        };
      case 'in_progress':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Play className="h-4 w-4" />,
          text: 'En Progreso'
        };
      case 'paused':
        return {
          color: 'bg-orange-100 text-orange-800',
          icon: <Pause className="h-4 w-4" />,
          text: 'Pausada'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Completada'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <Info className="h-4 w-4" />,
          text: status
        };
    }
  };

  const canTakeAppointment = appointment?.status === 'scheduled';
  const canPauseAppointment = appointment?.status === 'in_progress' && appointment?.taken_by_id === user?.id;
  const canResumeAppointment = appointment?.status === 'paused' && appointment?.taken_by_id === user?.id;
  const canCompleteAppointment = appointment?.status === 'in_progress' && appointment?.taken_by_id === user?.id;
  const canCreateEvolution = (appointment?.status === 'in_progress' || appointment?.status === 'paused') && appointment?.taken_by_id === user?.id;
  const canCreatePrescription = appointment?.status === 'in_progress' && !appointment?.prescription && appointment?.taken_by_id === user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Cita no encontrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">No se encontró la información de esta cita.</p>
            <Button onClick={() => navigate('/specialist/appointments')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Citas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(appointment.status);

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/specialist/appointments')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {appointment.patient.first_name} {appointment.patient.last_name}
            </h1>
            <p className="text-sm text-gray-600">
              {formatDate(appointment.scheduled_at)} - {format(new Date(appointment.scheduled_at), 'h:mm a')}
            </p>
          </div>
        </div>
        <Badge className={`${statusConfig.color} px-3 py-1`}>
          {statusConfig.icon}
          <span className="ml-2">{statusConfig.text}</span>
        </Badge>
      </div>

      {/* Compact Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {canTakeAppointment && (
              <Button
                onClick={handleTakeAppointment}
                disabled={actionLoading === 'take'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="mr-2 h-4 w-4" />
                {actionLoading === 'take' ? 'Tomando...' : 'Tomar Cita'}
              </Button>
            )}
            
            {canPauseAppointment && (
              <Button
                onClick={handlePauseAppointment}
                disabled={actionLoading === 'pause'}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Pause className="mr-2 h-4 w-4" />
                {actionLoading === 'pause' ? 'Pausando...' : 'Pausar'}
              </Button>
            )}
            
            {canResumeAppointment && (
              <Button
                onClick={handleResumeAppointment}
                disabled={actionLoading === 'resume'}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Play className="mr-2 h-4 w-4" />
                {actionLoading === 'resume' ? 'Reanudando...' : 'Reanudar'}
              </Button>
            )}
            
            {canCompleteAppointment && (
              <Button
                onClick={handleCompleteAppointment}
                disabled={actionLoading === 'complete'}
                className="bg-blue-800 hover:bg-blue-900"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {actionLoading === 'complete' ? 'Completando...' : 'Completar'}
              </Button>
            )}
            
            {/* Prescription Creation - More prominent */}
            {(appointment.status === 'in_progress' || appointment.status === 'paused') && 
             appointment.taken_by_id === user?.id && 
             !appointment.prescription && (
              <Button
                className={`${hasEvolutions ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                onClick={() => navigate(`/specialist/prescriptions/create?appointment_id=${appointment.id}`)}
                title={hasEvolutions ? 'Crear fórmula oftalmológica' : 'Crear fórmula (se recomienda evolución clínica primero)'}
              >
                <FileText className="mr-2 h-4 w-4" />
                {hasEvolutions ? 'Crear Fórmula' : 'Crear Fórmula*'}
              </Button>
            )}
            
            {canCreateEvolution && (
              <Button
                variant="outline"
                className="border-green-400 text-green-700 hover:bg-green-50"
                onClick={() => setShowEvolutionForm(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Nueva Evolución
              </Button>
            )}
            
            <Button
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
              onClick={() => navigate(`/specialist/patients/${appointment.patient.id}/history?appointmentId=${appointment.id}`)}
            >
              <History className="mr-2 h-4 w-4" />
              Historia
            </Button>
          </div>
          
          {/* Additional guidance for prescription creation */}
          {(appointment.status === 'in_progress' || appointment.status === 'paused') && 
           appointment.taken_by_id === user?.id && 
           !appointment.prescription && 
           !hasEvolutions && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700">
                <strong>*</strong> Se recomienda crear una evolución clínica antes de la fórmula para un mejor registro médico.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flow Status Guide */}
      {appointment && (appointment.status === 'in_progress' || appointment.status === 'paused') && appointment.taken_by_id === user?.id && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-3">Flujo de Atención - Próximos Pasos</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-green-700 font-medium">Cita tomada y en progreso</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {hasEvolutions ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-100 flex-shrink-0 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                      </div>
                    )}
                    <div className="flex-1">
                      <span className={hasEvolutions ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
                        {hasEvolutions ? 'Evolución clínica completada' : 'Crear evolución clínica'}
                      </span>
                      {!hasEvolutions && (
                        <div className="mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-400 text-green-700 hover:bg-green-50 h-7 text-xs"
                            onClick={() => setShowEvolutionForm(true)}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            Crear Ahora
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {appointment.prescription ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        hasEvolutions 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-gray-300 bg-gray-100'
                      }`}>
                        <div className={`h-2 w-2 rounded-full ${
                          hasEvolutions ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                      </div>
                    )}
                    <div className="flex-1">
                      <span className={appointment.prescription ? 'text-green-700 font-medium' : hasEvolutions ? 'text-blue-700 font-medium' : 'text-gray-500'}>
                        {appointment.prescription ? 'Fórmula creada' : 'Crear fórmula oftalmológica'}
                      </span>
                      {!appointment.prescription && (
                        <div className="mt-1">
                          <Button
                            size="sm"
                            className={`h-7 text-xs ${
                              hasEvolutions 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-gray-400 hover:bg-gray-500'
                            }`}
                            onClick={() => navigate(`/specialist/prescriptions/create?appointment_id=${appointment.id}`)}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            {hasEvolutions ? 'Crear Fórmula' : 'Crear Fórmula*'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {appointment.prescription ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-gray-100 flex-shrink-0"></div>
                    )}
                    <span className={appointment.prescription ? 'text-green-700 font-medium' : 'text-gray-500'}>
                      Cita completada automáticamente
                    </span>
                  </div>
                </div>
                
                {!appointment.prescription && (
                  <div className="mt-4 p-3 bg-white border border-blue-200 rounded-md">
                    <p className="text-blue-800 text-sm">
                      <strong>Siguiente paso:</strong> {!hasEvolutions 
                        ? 'Cree una evolución clínica para documentar la consulta. Luego podrá crear la fórmula oftalmológica.'
                        : 'Ya tiene evoluciones clínicas registradas. Puede proceder a crear la fórmula oftalmológica.'
                      }
                    </p>
                    {!hasEvolutions && (
                      <p className="text-blue-600 text-xs mt-1">
                        * También puede crear la fórmula directamente, pero se recomienda la evolución clínica primero.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main appointment card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Identificación</p>
              <p className="font-medium">{appointment.patient.identification}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-sm">{appointment.patient.email}</p>
            </div>
            {appointment.patient.phone && (
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{appointment.patient.phone}</p>
              </div>
            )}
            {appointment.patient.birth_date && (
              <div>
                <p className="text-sm text-gray-500">Fecha de nacimiento</p>
                <p className="font-medium">{formatDate(appointment.patient.birth_date)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointment Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Especialista</p>
              <p className="font-medium">{appointment.specialist.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <Badge className={`${statusConfig.color} mt-1`}>
                {statusConfig.icon}
                <span className="ml-2">{statusConfig.text}</span>
              </Badge>
            </div>
            {appointment.taken_by_id && appointment.takenBy && (
              <div>
                <p className="text-sm text-gray-500">Atendida por</p>
                <p className="font-medium">{appointment.takenBy.name}</p>
              </div>
            )}
            {appointment.notes && (
              <div>
                <p className="text-sm text-gray-500">Notas</p>
                <p className="text-sm bg-gray-50 p-2 rounded">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescription Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fórmula
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointment.prescription ? (
              <div className="space-y-3">
                {appointment.prescription.recommendation && (
                  <div>
                    <p className="text-sm text-gray-500">Recomendación</p>
                    <p className="text-sm bg-blue-50 p-2 rounded">{appointment.prescription.recommendation}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded">
                    <p className="font-medium text-green-800 mb-1">OD</p>
                    {appointment.prescription.right_sphere && <p>ESF: {appointment.prescription.right_sphere}</p>}
                    {appointment.prescription.right_cylinder && <p>CIL: {appointment.prescription.right_cylinder}</p>}
                    {appointment.prescription.right_axis && <p>EJE: {appointment.prescription.right_axis}</p>}
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="font-medium text-blue-800 mb-1">OI</p>
                    {appointment.prescription.left_sphere && <p>ESF: {appointment.prescription.left_sphere}</p>}
                    {appointment.prescription.left_cylinder && <p>CIL: {appointment.prescription.left_cylinder}</p>}
                    {appointment.prescription.left_axis && <p>EJE: {appointment.prescription.left_axis}</p>}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                  onClick={() => navigate(`/specialist/prescriptions/${appointment.prescription?.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Completa
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">Sin fórmula</p>
                </div>
                
                {/* Show different states based on appointment status and evolutions */}
                {appointment.status === 'scheduled' ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">Cita no iniciada</p>
                    </div>
                    <p className="text-xs text-amber-700">
                      Debe tomar la cita para poder crear la fórmula oftalmológica.
                    </p>
                  </div>
                ) : appointment.status === 'completed' ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-gray-600" />
                      <p className="text-sm font-medium text-gray-800">Cita completada</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      La cita ha sido completada sin fórmula.
                    </p>
                  </div>
                ) : (appointment.taken_by_id && appointment.taken_by_id !== user?.id) || 
                  (!appointment.taken_by_id && appointment.specialist.id !== user?.id) ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-red-800">Sin permisos</p>
                    </div>
                    <p className="text-xs text-red-700">
                      Solo el especialista que tomó la cita puede crear la fórmula.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Evolution status indicator */}
                    <div className={`border rounded-lg p-3 ${hasEvolutions ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {hasEvolutions ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <p className={`text-sm font-medium ${hasEvolutions ? 'text-green-800' : 'text-amber-800'}`}>
                          {hasEvolutions ? 'Evoluciones disponibles' : 'Evolución requerida'}
                        </p>
                      </div>
                      <p className={`text-xs ${hasEvolutions ? 'text-green-700' : 'text-amber-700'}`}>
                        {hasEvolutions 
                          ? 'El paciente tiene evoluciones clínicas. Puede proceder a crear la fórmula.'
                          : 'Debe crear al menos una evolución clínica antes de generar la fórmula oftalmológica.'
                        }
                      </p>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="space-y-2">
                      {!hasEvolutions && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-green-400 text-green-700 hover:bg-green-50"
                          onClick={() => setShowEvolutionForm(true)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Crear Evolución Primero
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        className={`w-full ${hasEvolutions ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                        onClick={() => navigate(`/specialist/prescriptions/create?appointment_id=${appointment.id}`)}
                        title={!hasEvolutions ? 'Se recomienda crear una evolución clínica primero' : 'Crear fórmula oftalmológica'}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Crear Fórmula
                      </Button>
                      
                      {!hasEvolutions && (
                        <p className="text-xs text-gray-500 text-center">
                          * Puede intentar crear la fórmula, pero se requiere evolución clínica
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Clinical Evolutions for this appointment */}
      <div className="mt-6">
        <AppointmentEvolutionsList 
          patientId={appointment.patient.id}
          appointmentId={appointment.id}
          onEvolutionsChange={setHasEvolutions}
          key={evolutionsKey}
        />
      </div>
      
      {/* Evolution Form Modal */}
      {showEvolutionForm && appointment && (
        <AppointmentEvolutionForm
          appointmentId={appointment.id}
          patientId={appointment.patient.id}
          patientName={`${appointment.patient.first_name} ${appointment.patient.last_name}`}
          onComplete={handleEvolutionComplete}
          onCancel={() => setShowEvolutionForm(false)}
        />
      )}
    </div>
  );
};

export default SpecialistAppointmentDetail; 