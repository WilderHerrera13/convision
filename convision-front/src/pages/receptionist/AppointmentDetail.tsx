import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  User, 
  Stethoscope, 
  ArrowLeft, 
  Play, 
  FileText, 
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Info,
  Phone,
  Mail,
  CalendarClock,
  AlertCircle,
  MapPin,
  ShoppingBag,
  Tag,
  DollarSign,
  FileEdit,
  Loader2,
  PauseCircle,
  ShoppingCart,
  TrendingUp,
  Plus,
  X,
  Search,
  Eye
} from 'lucide-react';
import ApiService, { ApiError } from '@/services/ApiService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import PrescriptionForm from '@/components/PrescriptionForm';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { translateGender, formatDate, formatCurrency } from '@/lib/utils';
import { lensService, type Lens } from '@/services/lensService';
import { SessionLensPriceAdjustmentModal } from '@/components/sales/SessionLensPriceAdjustmentModal';
import { SessionLensPriceDisplay } from '@/components/sales/SessionLensPriceDisplay';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';

interface Receptionist {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface Prescription {
  id: number;
  appointment_id: number;
  date: string;
  document: string;
  patient_name: string;
  right_sphere?: string;
  right_cylinder?: string;
  right_axis?: string;
  right_addition?: string;
  right_height?: string;
  right_distance_p?: string;
  right_visual_acuity_far?: string;
  right_visual_acuity_near?: string;
  left_sphere?: string;
  left_cylinder?: string;
  left_axis?: string;
  left_addition?: string;
  left_height?: string;
  left_distance_p?: string;
  left_visual_acuity_far?: string;
  left_visual_acuity_near?: string;
  correction_type?: string;
  usage_type?: string;
  recommendation?: string;
  professional?: string;
  observation?: string;
  attachment?: string;
  created_at?: string;
  updated_at?: string;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  identification_type?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface Specialist {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  specialist_id: number;
  receptionist_id: number;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  taken_by_id?: number | null;
  patient: Patient;
  specialist: Specialist;
  receptionist: Receptionist;
  takenBy?: User | null;
  prescription?: Prescription | null;
}

const AppointmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [activeTab, setActiveTab] = useState('appointment');

  // Lens selection and price adjustment states
  const [showLensSelection, setShowLensSelection] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<Lens[]>([]);
  const [selectedLenses, setSelectedLenses] = useState<Lens[]>([]);
  const [lensLoading, setLensLoading] = useState(false);
  const [lensSearchQuery, setLensSearchQuery] = useState('');
  const [filteredLenses, setFilteredLenses] = useState<Lens[]>([]);
  const [priceAdjustmentModalOpen, setPriceAdjustmentModalOpen] = useState(false);
  const [selectedLensForAdjustment, setSelectedLensForAdjustment] = useState<Lens | null>(null);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.get(`/api/v1/appointments/${id}`);
      console.log('Raw API response:', res);
      // The API returns {data: appointmentObject}, so we need to extract the data property
      const appointmentData = (res && typeof res === 'object' && 'data' in res) 
        ? (res as { data: Appointment }).data 
        : res as Appointment;
      console.log('Extracted appointment data:', appointmentData);
      console.log('Patient data:', appointmentData?.patient);
      setAppointment(appointmentData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAppointment = async () => {
    if (!appointment) return;
    
    setIsTaking(true);
    try {
      await ApiService.post(`/api/v1/appointments/${appointment.id}/take`);
      toast({
        title: 'Cita tomada',
        description: 'Has tomado esta cita exitosamente',
      });
      fetchAppointment(); // Refresh the appointment data
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
                onClick={() => navigate(`/${user?.role}/appointments/${currentAppointmentId}`)}
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
      setIsTaking(false);
    }
  };

  const handlePauseAppointment = async () => {
    if (!appointment) return;
    
    setIsPausing(true);
    try {
      await ApiService.post(`/api/v1/appointments/${appointment.id}/pause`);
      toast({
        title: 'Cita pausada',
        description: 'Has pausado esta cita exitosamente',
      });
      fetchAppointment(); // Refresh the appointment data
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      });
    } finally {
      setIsPausing(false);
    }
  };

  const handleResumeAppointment = async () => {
    if (!appointment) return;
    
    setIsResuming(true);
    try {
      await ApiService.post(`/api/v1/appointments/${appointment.id}/resume`);
      toast({
        title: 'Cita reanudada',
        description: 'Has reanudado esta cita exitosamente',
      });
      fetchAppointment(); // Refresh the appointment data
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
                onClick={() => navigate(`/${user?.role}/appointments/${currentAppointmentId}`)}
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
      setIsResuming(false);
    }
  };

  const handlePrescriptionComplete = () => {
    setShowPrescriptionForm(false);
    fetchAppointment(); // Refresh appointment data to show updated status
    toast({
      title: 'Cita completada',
      description: 'La cita ha sido marcada como completada con la fórmula creada',
    });
  };

  // Extract active appointment ID from error object if present
  const extractActiveAppointmentId = (error: unknown): number | null => {
    if (error instanceof ApiError && error.metadata) {
      const metadata = error.metadata as { active_appointment_id?: number };
      if (metadata.active_appointment_id) {
        return metadata.active_appointment_id;
      }
    }
    return null;
  };

  // Add a new function to navigate to the patient's clinical evolution page
  const handleAddEvolution = () => {
    if (appointment) {
      navigate(`/specialist/appointments/${appointment.id}?action=evolution`);
    }
  };

  // Lens management functions
  const loadAvailableLenses = async () => {
    setLensLoading(true);
    try {
      const response = await lensService.searchLenses({
        page: 1,
        perPage: 50
      });
      
      if (response && response.data) {
        setAvailableLenses(response.data);
        setFilteredLenses(response.data);
      }
    } catch (error) {
      console.error('Error loading lenses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los lentes disponibles',
        variant: 'destructive',
      });
    } finally {
      setLensLoading(false);
    }
  };

  const handleLensSearch = (query: string) => {
    setLensSearchQuery(query);
    if (!query.trim()) {
      setFilteredLenses(availableLenses);
      return;
    }

    const filtered = availableLenses.filter(lens =>
      lens.description.toLowerCase().includes(query.toLowerCase()) ||
      lens.internal_code.toLowerCase().includes(query.toLowerCase()) ||
      lens.brand?.name.toLowerCase().includes(query.toLowerCase()) ||
      lens.type?.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredLenses(filtered);
  };

  const addLensToSelection = (lens: Lens) => {
    if (!selectedLenses.find(l => l.id === lens.id)) {
      setSelectedLenses([...selectedLenses, lens]);
      toast({
        title: 'Lente agregado',
        description: `${lens.description} agregado a la selección`,
      });
    }
  };

  const removeLensFromSelection = (lensId: number) => {
    setSelectedLenses(selectedLenses.filter(lens => lens.id !== lensId));
    // Also remove any price adjustments for this lens
    sessionPriceAdjustmentService.removeAdjustment(lensId);
  };

  const openPriceAdjustmentModal = (lens: Lens) => {
    setSelectedLensForAdjustment(lens);
    setPriceAdjustmentModalOpen(true);
  };

  const handleLensSelectionOpen = () => {
    setShowLensSelection(true);
    if (availableLenses.length === 0) {
      loadAvailableLenses();
    }
  };

  const handleStartSaleWithLenses = () => {
    if (appointment?.patient && selectedLenses.length > 0) {
      // Store selected lenses and any price adjustments in session storage
      const saleData = {
        patientId: appointment.patient.id,
        patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
        appointmentId: appointment.id,
        selectedLenses: selectedLenses
      };
      
      sessionStorage.setItem('pendingSale', JSON.stringify(saleData));
      
      navigate('/receptionist/sales/catalog', {
        state: saleData
      });
    } else {
      toast({
        title: 'Selecciona lentes',
        description: 'Debes seleccionar al menos un lente antes de iniciar la venta',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando información de la cita...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-yellow-500 flex items-center gap-2">
              <Info className="h-5 w-5" /> Cita no encontrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se encontró la información para esta cita.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!appointment.patient) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-yellow-500 flex items-center gap-2">
              <Info className="h-5 w-5" /> Información incompleta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>La información del paciente no está disponible para esta cita.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Determine if the current user is the specialist for this appointment
  const isSpecialist = user?.role === 'specialist';
  // Check if the appointment can be taken (is in scheduled status)
  const canTakeAppointment = isSpecialist && appointment.status === 'scheduled';
  // Check if the specialist can create a prescription (appointment is in_progress)
  const canCreatePrescription = isSpecialist && 
                              appointment.status === 'in_progress' && 
                              appointment.taken_by_id === user?.id &&
                              !appointment.prescription;
  // Check if the appointment can be paused (is in in_progress status and taken by this specialist)
  const canPauseAppointment = isSpecialist && 
                              appointment.status === 'in_progress' && 
                              appointment.taken_by_id === user?.id;
  // Check if the appointment can be resumed (is in paused status and taken by this specialist)
  const canResumeAppointment = isSpecialist && 
                               appointment.status === 'paused' && 
                               appointment.taken_by_id === user?.id;

  if (showPrescriptionForm && appointment) {
    return (
      <PrescriptionForm 
        appointmentId={appointment.id}
        patientName={appointment.patient ? `${appointment.patient.first_name} ${appointment.patient.last_name}` : 'Paciente desconocido'}
        onComplete={handlePrescriptionComplete}
        onCancel={() => setShowPrescriptionForm(false)}
      />
    );
  }

  // Format the date and time strings
  const appointmentDate = appointment.scheduled_at 
    ? formatDate(appointment.scheduled_at)
    : '—';
  
  const appointmentTime = appointment.scheduled_at 
    ? new Date(appointment.scheduled_at).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }) 
    : '—';

  // Get status text and color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { 
          label: 'Programada', 
          color: 'bg-blue-100 text-blue-800',
          icon: <Calendar className="h-4 w-4 mr-1" />
        };
      case 'in_progress':
        return { 
          label: 'En progreso', 
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Play className="h-4 w-4 mr-1" />
        };
      case 'paused':
        return { 
          label: 'Pausada', 
          color: 'bg-orange-100 text-orange-800',
          icon: <Clock className="h-4 w-4 mr-1" />
        };
      case 'completed':
        return { 
          label: 'Completada', 
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle2 className="h-4 w-4 mr-1" />
        };
      default:
        return { 
          label: 'Desconocido', 
          color: 'bg-gray-100 text-gray-800',
          icon: <Info className="h-4 w-4 mr-1" />
        };
    }
  };

  const statusConfig = getStatusConfig(appointment.status);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header with back button and actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2 p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalle de la Cita</h1>
              <p className="text-gray-500 text-sm">
                ID: {appointment.id} • Creada: {new Date(appointment.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 self-end md:self-auto">
            {canTakeAppointment && (
              <Button 
                onClick={handleTakeAppointment} 
                disabled={isTaking}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="mr-2 h-4 w-4" />
                {isTaking ? 'Tomando cita...' : 'Tomar cita'}
              </Button>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              {/* Only show actions for specialists or admins based on status */}
              {isSpecialist && appointment.status === 'in_progress' && (
                <Button 
                  onClick={handlePauseAppointment}
                  disabled={isPausing}
                  variant="outline"
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  {isPausing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PauseCircle className="mr-2 h-4 w-4" />
                  )}
                  {isPausing ? 'Pausando...' : 'Pausar Cita'}
                </Button>
              )}
            </div>

            {canCreatePrescription && (
              <Button 
                onClick={() => setShowPrescriptionForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                Crear Fórmula
              </Button>
            )}
            


            {appointment.status === 'completed' && appointment.prescription && (
              <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-2 rounded-md border border-green-200">
                <ClipboardCheck className="h-5 w-5" />
                <span className="font-medium text-sm">Cita completada con fórmula</span>
              </div>
            )}

            {user?.role === 'specialist' && appointment?.status === 'in_progress' && (
              <Button variant="secondary" className="ml-2" onClick={handleAddEvolution}>
                <FileEdit className="mr-2 h-4 w-4" />
                Agregar Evolución
              </Button>
            )}

            {user?.role === 'receptionist' && appointment?.status === 'completed' && (
              <div className="flex gap-2 ml-2">
                <Button variant="outline" onClick={handleLensSelectionOpen}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Seleccionar Lentes
                </Button>
                {selectedLenses.length > 0 && (
                  <Button variant="default" onClick={handleStartSaleWithLenses}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Iniciar Venta ({selectedLenses.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Main appointment section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Appointment details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-2 border-primary/20">
              <CardHeader className="bg-primary/5 border-b pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold">Información de la Cita</CardTitle>
                  <Badge 
                    className={`flex items-center px-3 py-1 ${statusConfig.color} hover:${statusConfig.color}`}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Tabs defaultValue="appointment" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="appointment" className="flex-1 data-[state=active]:bg-background rounded-none">
                      <Calendar className="mr-2 h-4 w-4" /> Detalles de Cita
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="p-6">
                    <TabsContent value="appointment" className="mt-0 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Fecha</div>
                              <div className="font-medium">{appointmentDate}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Hora</div>
                              <div className="font-medium">{appointmentTime}</div>
                            </div>
                          </div>
                          
                          {appointment.status === 'in_progress' && appointment.takenBy && (
                            <div className="flex items-center space-x-2">
                              <div className="bg-yellow-100 p-2 rounded-lg">
                                <User className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Atendida por</div>
                                <div className="font-medium">{appointment.takenBy.name}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {appointment.notes && (
                          <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                              <Info className="h-4 w-4 mr-1" /> Notas
                            </h3>
                            <p className="text-sm">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column - Patient and Personnel Info */}
          <div className="space-y-6">
            {/* Patient Card */}
            <Card className="overflow-hidden border-2 border-primary/20">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" /> 
                  Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">
                      {appointment.patient ? `${appointment.patient.first_name} ${appointment.patient.last_name}` : 'Paciente no disponible'}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      ID: {appointment.patient?.identification || 'N/A'}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{appointment.patient?.email || 'No disponible'}</span>
                  </div>
                  
                  {appointment.patient?.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{appointment.patient.phone}</span>
                    </div>
                  )}
                  
                  {appointment.patient?.birth_date && (
                    <div className="flex items-center text-sm">
                      <CalendarClock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Nacimiento: {formatDate(appointment.patient.birth_date)}</span>
                    </div>
                  )}
                  
                  {appointment.patient?.gender && (
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Género: {translateGender(appointment.patient.gender)}</span>
                    </div>
                  )}
                  
                  {appointment.patient?.address && (
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                      <span>{appointment.patient.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Specialist Card */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Stethoscope className="h-4 w-4 text-primary" /> 
                  Especialista
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 border-t">
                <div className="font-medium">{appointment.specialist.name}</div>
                {appointment.specialist.email && (
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Mail className="h-3 w-3 mr-1" />
                    <span>{appointment.specialist.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Receptionist Card */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" /> 
                  Recepcionista
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3 border-t">
                <div className="font-medium">{appointment.receptionist.name}</div>
                {appointment.receptionist.email && (
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Mail className="h-3 w-3 mr-1" />
                    <span>{appointment.receptionist.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Lens Selection Dialog */}
      <Dialog open={showLensSelection} onOpenChange={setShowLensSelection}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Seleccionar Lentes para la Venta
            </DialogTitle>
            <DialogDescription>
              Opcionalmente selecciona lentes para incluir en la venta y ajusta sus precios. Puedes continuar sin seleccionar lentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar lentes por descripción, código, marca..."
                value={lensSearchQuery}
                onChange={(e) => handleLensSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected lenses summary */}
            {selectedLenses.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  Lentes Seleccionados ({selectedLenses.length})
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedLenses.map((lens) => (
                    <div key={lens.id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{lens.description}</span>
                        <div className="text-xs text-gray-500">
                          Código: {lens.internal_code} | Marca: {lens.brand?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SessionLensPriceDisplay 
                          lensId={lens.id}
                          basePrice={parseFloat(lens.price)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPriceAdjustmentModal(lens)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <TrendingUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLensFromSelection(lens.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available lenses */}
            <div className="border rounded-lg flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b bg-gray-50 flex-shrink-0">
                <h4 className="font-medium text-gray-900">Lentes Disponibles</h4>
              </div>
              <ScrollArea className="flex-1">
                {lensLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Cargando lentes...</span>
                  </div>
                ) : filteredLenses.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-gray-500">
                    No se encontraron lentes
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredLenses.map((lens) => {
                      const isSelected = selectedLenses.some(l => l.id === lens.id);
                      return (
                        <div 
                          key={lens.id} 
                          className={`flex items-center justify-between p-3 rounded border transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{lens.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Código: {lens.internal_code} | Marca: {lens.brand?.name} | Tipo: {lens.type?.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Material: {lens.material?.name} | Tratamiento: {lens.treatment?.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-medium text-blue-600">
                                {formatCurrency(lens.price, 'COP')}
                              </div>
                              {lens.has_discounts && (
                                <Badge variant="secondary" className="text-xs">
                                  Con descuentos
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant={isSelected ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => isSelected ? removeLensFromSelection(lens.id) : addLensToSelection(lens)}
                              className={isSelected ? "text-blue-700" : ""}
                            >
                              {isSelected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowLensSelection(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                setShowLensSelection(false);
                if (selectedLenses.length > 0) {
                  handleStartSaleWithLenses();
                } else {
                  // Navigate directly to sales catalog for lens selection
                  if (appointment?.patient) {
                    const saleData = {
                      patientId: appointment.patient.id,
                      patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
                      appointmentId: appointment.id,
                      selectedLenses: []
                    };
                    
                    sessionStorage.setItem('pendingSale', JSON.stringify(saleData));
                    navigate('/receptionist/sales/catalog', { state: saleData });
                  }
                }
              }}
            >
              {selectedLenses.length > 0 ? `Continuar con ${selectedLenses.length} lentes` : 'Continuar sin lentes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Adjustment Modal */}
      <SessionLensPriceAdjustmentModal
        isOpen={priceAdjustmentModalOpen}
        onClose={() => setPriceAdjustmentModalOpen(false)}
        lens={selectedLensForAdjustment}
        onAdjustmentCreated={() => {
          toast({
            title: "Precio ajustado",
            description: "El precio del lente ha sido modificado para esta sesión de venta.",
          });
        }}
      />
    </div>
  );
};

export default AppointmentDetail; 