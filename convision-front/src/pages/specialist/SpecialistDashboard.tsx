import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  Glasses,
  Play,
  Clock,
  User,
  CalendarDays,
  Phone,
  Mail,
  Info,
  Edit,
  ClipboardList,
  Check,
  ChevronRight,
  Pause,
  FileText,
  Stethoscope,
  Activity,
  AlertCircle,
  CheckCircle,
  Timer,
  Eye,
  History,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsService } from '@/services/appointmentsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Prescription {
  id: number;
  recommendation?: string;
  observation?: string;
  [key: string]: unknown;
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
  };
  specialist: {
    id: number;
    name: string;
  };
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
  taken_by_id?: number;
  prescription?: Prescription | null;
};

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
}

interface Specialist {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  specialist_id: number;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
  taken_by_id?: number;
  patient: Patient;
  specialist: Specialist;
  prescription?: Prescription | null;
}

const SpecialistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeAppointment, setActiveAppointment] = useState<AppointmentWithPrescription | null>(null);
  const [pausedAppointments, setPausedAppointments] = useState<AppointmentWithPrescription[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithPrescription[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<AppointmentWithPrescription[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [stats, setStats] = useState({
    todayCompleted: 0,
    weekScheduled: 0,
    totalPatients: 0,
    pendingPrescriptions: 0,
  });

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        
        const appointmentsResponse = await appointmentsService.getAppointments({
          perPage: 100,
        });
        
        const appointments = appointmentsResponse.data || [];
        
        const inProgress = appointments.find(
          (app) => app.status === 'in_progress' && app.taken_by_id === user?.id
        ) as AppointmentWithPrescription | undefined;
        
        const paused = appointments.filter(
          (app) => app.status === 'paused' && app.taken_by_id === user?.id
        ) as AppointmentWithPrescription[];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const todaysApps = appointments.filter(appointment => {
          const appDate = new Date(appointment.scheduled_at);
          return appDate >= today && appDate < tomorrow;
        }) as AppointmentWithPrescription[];
        
        const weekApps = appointments.filter(appointment => {
          const appDate = new Date(appointment.scheduled_at);
          return appDate >= tomorrow && appDate < nextWeek;
        }) as AppointmentWithPrescription[];
        
        const todayCompleted = todaysApps.filter(app => app.status === 'completed').length;
        const pendingPrescriptions = (appointments as AppointmentWithPrescription[]).filter(
          app => app.status === 'completed' && !app.prescription
        ).length;
        
        setActiveAppointment(inProgress || null);
        setPausedAppointments(paused);
        setTodayAppointments(todaysApps);
        setWeekAppointments(weekApps);
        setStats({
          todayCompleted,
          weekScheduled: weekApps.length,
          totalPatients: new Set(appointments.map(app => app.patient.id)).size,
          pendingPrescriptions,
        });
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las citas. Por favor, recarga la página.',
        });
      } finally {
        setLoadingAppointments(false);
      }
    };
    
    fetchAppointments();
  }, [user, toast]);

  const quickActions = [
    {
      title: 'Ver Todas las Citas',
      description: 'Gestionar citas programadas y en progreso',
      icon: <Calendar className="w-6 h-6" />,
      path: '/specialist/appointments',
      color: 'bg-blue-500',
    },
    {
      title: 'Catálogo de Lentes',
      description: 'Consultar productos disponibles',
      icon: <Glasses className="w-6 h-6" />,
      path: '/specialist/catalog',
      color: 'bg-purple-500',
    },
    {
      title: 'Historias Clínicas',
      description: 'Revisar historiales de pacientes',
      icon: <FileText className="w-6 h-6" />,
      path: '/specialist/patients',
      color: 'bg-green-500',
    },
    {
      title: 'Mi Perfil',
      description: 'Configurar información personal',
      icon: <User className="w-6 h-6" />,
      path: '/specialist/profile',
      color: 'bg-gray-500',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'in_progress': return 'En Progreso';
      case 'paused': return 'Pausada';
      case 'completed': return 'Completada';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel del Especialista</h1>
          <p className="text-gray-600 mt-1">Bienvenido, Dr. {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-4 h-4 mr-1" />
            {stats.todayCompleted} citas completadas hoy
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de Hoy</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayCompleted} completadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekScheduled}</div>
            <p className="text-xs text-muted-foreground">
              citas programadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Atendidos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              pacientes únicos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescripciones Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingPrescriptions}</div>
            <p className="text-xs text-muted-foreground">
              requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Appointment */}
      {activeAppointment && (
        <Card className="border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-yellow-500 text-white p-1.5 rounded-full">
                  <Play className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl text-yellow-800">Cita Activa en Progreso</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/specialist/appointments/${activeAppointment.id}`)}
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
              >
                Ver Detalles <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-yellow-800 flex items-center mb-2">
                  <User className="mr-2 h-4 w-4" />
                  Paciente
                </h3>
                <div className="space-y-1">
                  <p className="font-medium text-lg">{activeAppointment.patient.first_name} {activeAppointment.patient.last_name}</p>
                  <p className="text-sm text-gray-600">ID: {activeAppointment.patient.identification}</p>
                  {activeAppointment.patient.phone && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <Phone className="mr-1 h-3 w-3" />
                      {activeAppointment.patient.phone}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-yellow-800 flex items-center mb-2">
                  <Clock className="mr-2 h-4 w-4" />
                  Horario
                </h3>
                <div className="space-y-1">
                  <p className="text-sm">Fecha: {formatDate(activeAppointment.scheduled_at)}</p>
                  <p className="text-sm">Hora: {format(new Date(activeAppointment.scheduled_at), 'h:mm a')}</p>
                  {activeAppointment.notes && (
                    <p className="text-sm bg-yellow-100 p-2 rounded-md mt-2">{activeAppointment.notes}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-yellow-800 flex items-center mb-2">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate(`/specialist/patients/${activeAppointment.patient.id}/history?appointmentId=${activeAppointment.id}`)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Ver Historia Clínica
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate(`/specialist/appointments/${activeAppointment.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Gestionar Cita
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paused Appointments */}
      {pausedAppointments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <Pause className="mr-2 h-5 w-5" />
              Citas Pausadas ({pausedAppointments.length})
            </CardTitle>
            <CardDescription>
              Tienes citas pausadas que puedes reanudar en cualquier momento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pausedAppointments.map(appointment => (
                <div 
                  key={appointment.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => navigate(`/specialist/appointments/${appointment.id}`)}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mr-4">
                      <Timer className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{appointment.patient.first_name} {appointment.patient.last_name}</p>
                      <p className="text-sm text-gray-500">
                        Pausada desde {format(new Date(appointment.scheduled_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-orange-300 text-orange-700">
                    <Play className="mr-2 h-4 w-4" />
                    Reanudar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        {quickActions.map((action) => (
          <Card key={action.path} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(action.path)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {action.title}
              </CardTitle>
              <div className={`p-2 rounded-full text-white ${action.color}`}>
                {action.icon}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                {action.description}
              </p>
              <Button className="w-full" size="sm">
                <ChevronRight className="w-4 h-4 mr-2" />
                Acceder
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Appointment Overview */}
      <div className="mt-6">
        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">
              Citas de Hoy ({todayAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="week">
              Próximas Citas ({weekAppointments.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>Agenda de Hoy</CardTitle>
                <CardDescription>
                  {todayAppointments.length === 0 ? 'No tienes citas programadas para hoy' : 
                   `${todayAppointments.length} cita${todayAppointments.length !== 1 ? 's' : ''} programada${todayAppointments.length !== 1 ? 's' : ''}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500">Cargando citas...</p>
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No hay citas programadas para hoy</p>
                    <p className="text-sm mt-1">¡Disfruta tu día libre!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.map(appointment => (
                      <div 
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-all"
                        onClick={() => navigate(`/specialist/appointments/${appointment.id}`)}
                      >
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-4">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium text-lg">{appointment.patient.first_name} {appointment.patient.last_name}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(appointment.scheduled_at), 'h:mm a')} · ID: {appointment.patient.identification}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusText(appointment.status)}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="week">
            <Card>
              <CardHeader>
                <CardTitle>Próximas Citas</CardTitle>
                <CardDescription>
                  {weekAppointments.length === 0 ? 'No tienes citas programadas para la próxima semana' : 
                   `${weekAppointments.length} cita${weekAppointments.length !== 1 ? 's' : ''} en los próximos 7 días`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500">Cargando citas...</p>
                  </div>
                ) : weekAppointments.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No hay citas programadas para la próxima semana</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weekAppointments.map(appointment => (
                      <div 
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-all"
                        onClick={() => navigate(`/specialist/appointments/${appointment.id}`)}
                      >
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-4">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium text-lg">{appointment.patient.first_name} {appointment.patient.last_name}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(appointment.scheduled_at), 'EEEE d \'de\' MMMM', { locale: es })} · {format(new Date(appointment.scheduled_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-100 text-blue-800">
                            Programada
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SpecialistDashboard; 