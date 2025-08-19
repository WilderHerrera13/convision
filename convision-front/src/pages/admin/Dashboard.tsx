import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserPlus,
  Calendar,
  Plus,
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsService } from '@/services/appointmentsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';

// Define the types needed for appointments
type Appointment = {
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
  status: 'scheduled' | 'in_progress' | 'completed';
  notes?: string;
  taken_by_id?: number;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  
  const isSpecialist = user?.role === 'specialist';

  // Fetch appointments data on component mount
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!isSpecialist) return;
      
      try {
        setLoadingAppointments(true);
        
        // Fetch all appointments for this specialist
        const appointmentsResponse = await appointmentsService.getAppointments({
          perPage: 50,  // Get a reasonably large number to process
        });
        
        const appointments = appointmentsResponse.data || [];
        
        // Find active appointment
        const inProgress = appointments.find(
          (app) => app.status === 'in_progress' && app.taken_by_id === user.id
        );
        
        // Find today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const todaysApps = appointments.filter(appointment => {
          const appDate = new Date(appointment.scheduled_at);
          return appDate >= today && appDate < tomorrow;
        });
        
        const weekApps = appointments.filter(appointment => {
          const appDate = new Date(appointment.scheduled_at);
          return appDate >= tomorrow && appDate < nextWeek;
        });
        
        setActiveAppointment(inProgress || null);
        setTodayAppointments(todaysApps);
        setWeekAppointments(weekApps);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoadingAppointments(false);
      }
    };
    
    fetchAppointments();
  }, [isSpecialist, user]);

  const quickActions = [
    !isSpecialist && {
      title: 'Nuevo Usuario',
      description: 'Crear un nuevo usuario del sistema',
      icon: <Users className="w-6 h-6" />,
      path: '/admin/users/new',
    },
    !isSpecialist && {
      title: 'Nuevo Paciente',
      description: 'Registrar un nuevo paciente',
      icon: <UserPlus className="w-6 h-6" />,
      path: '/admin/patients/new',
    },
    {
      title: 'Nueva Cita',
      description: 'Agendar una nueva cita',
      icon: <Calendar className="w-6 h-6" />,
      path: isSpecialist ? '/specialist/appointments' : '/admin/appointments/new',
    },
    {
      title: 'Catálogo de Lentes',
      description: 'Ver y gestionar el catálogo de lentes',
      icon: <Glasses className="w-6 h-6" />,
      path: isSpecialist ? '/specialist/catalog' : '/admin/catalog',
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Active Appointment for Specialists */}
      {isSpecialist && (
        <div className="mb-8">
          {activeAppointment ? (
            <div 
              onClick={() => navigate(`/specialist/appointments/${activeAppointment.id}`)}
              className="cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <Card className="border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg animate-pulse-subtle">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-yellow-500 text-white p-1.5 rounded-full">
                        <Play className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-xl text-yellow-800">Cita Activa en Progreso</CardTitle>
                    </div>
                    <span className="text-yellow-600 hover:text-yellow-800 inline-flex items-center text-sm font-medium">
                      Ver detalles completos <ChevronRight className="ml-1 h-4 w-4" />
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Patient Info */}
                    <div className="col-span-4 border-r border-yellow-200 pr-4">
                      <h3 className="font-semibold text-yellow-800 flex items-center mb-2">
                        <User className="mr-2 h-4 w-4" />
                        Información del Paciente
                      </h3>
                      <div className="space-y-2">
                        <p className="font-medium text-lg">{activeAppointment.patient.first_name} {activeAppointment.patient.last_name}</p>
                        <p className="text-sm flex items-center text-gray-600">
                          <Info className="mr-2 h-4 w-4" />
                          ID: {activeAppointment.patient.identification}
                        </p>
                        {activeAppointment.patient.phone && (
                          <p className="text-sm flex items-center text-gray-600">
                            <Phone className="mr-2 h-4 w-4" />
                            {activeAppointment.patient.phone}
                          </p>
                        )}
                        <p className="text-sm flex items-center text-gray-600">
                          <Mail className="mr-2 h-4 w-4" />
                          {activeAppointment.patient.email}
                        </p>
                      </div>
                    </div>
                    
                    {/* Appointment Details */}
                    <div className="col-span-4 border-r border-yellow-200 pr-4">
                      <h3 className="font-semibold text-yellow-800 flex items-center mb-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        Detalles de la Cita
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm flex items-center">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Fecha: {formatDate(activeAppointment.scheduled_at)}
                        </p>
                        <p className="text-sm flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Hora: {format(new Date(activeAppointment.scheduled_at), 'h:mm a')}
                        </p>
                        {activeAppointment.notes && (
                          <div>
                            <p className="text-sm font-semibold">Notas:</p>
                            <p className="text-sm bg-yellow-100 p-2 rounded-md">{activeAppointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-4">
                      <h3 className="font-semibold text-yellow-800 flex items-center mb-2">
                        <Edit className="mr-2 h-4 w-4" />
                        Acciones
                      </h3>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 flex items-center">
                          <ClipboardList className="mr-2 h-4 w-4 text-yellow-600" />
                          <span>Haz clic en cualquier parte de esta tarjeta para ver todos los detalles</span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Check className="mr-2 h-4 w-4 text-green-600" />
                          <span>Puedes completar la cita desde la página de detalles</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center py-6">
                  <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-xl font-medium text-slate-700 mb-2">No tienes citas activas en este momento</h3>
                  <p className="text-slate-500 mb-4">Cuando tomes una cita, aparecerá aquí para un acceso rápido</p>
                  <Button 
                    onClick={() => navigate('/specialist/appointments')}
                    className="mt-2"
                  >
                    Ver todas mis citas
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Card key={action.path}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {action.title}
              </CardTitle>
              {action.icon}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                {action.description}
              </p>
              <Button
                className="w-full"
                onClick={() => navigate(action.path)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {action.title.includes('Nueva') ? 'Crear' : 'Ver'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Specialist Appointment Overview */}
      {isSpecialist && (
        <div className="mt-6">
          <Tabs defaultValue="today">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Citas de Hoy ({todayAppointments.length})</TabsTrigger>
              <TabsTrigger value="week">Próximas Citas ({weekAppointments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="today">
              <Card>
                <CardHeader>
                  <CardTitle>Citas Programadas para Hoy</CardTitle>
                  <CardDescription>
                    {todayAppointments.length === 0 ? 'No tienes citas programadas para hoy' : 
                     `Tienes ${todayAppointments.length} cita${todayAppointments.length !== 1 ? 's' : ''} programada${todayAppointments.length !== 1 ? 's' : ''} para hoy`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAppointments ? (
                    <div className="text-center py-4">Cargando citas...</div>
                  ) : todayAppointments.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">No hay citas programadas para hoy</div>
                  ) : (
                    <div className="space-y-4">
                      {todayAppointments.map(appointment => (
                        <div 
                          key={appointment.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-all"
                          onClick={() => navigate(`/specialist/appointments/${appointment.id}`)}
                        >
                          <div className="flex items-center">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                              appointment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{appointment.patient.first_name} {appointment.patient.last_name}</p>
                              <p className="text-sm text-gray-500">{format(new Date(appointment.scheduled_at), 'h:mm a')}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {appointment.status === 'scheduled' ? 'Programada' :
                               appointment.status === 'in_progress' ? 'En progreso' :
                               'Completada'}
                            </span>
                            <Button variant="ghost" className="ml-2" size="sm">
                              <ChevronRight className="h-4 w-4" />
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
                  <CardTitle>Citas de la Próxima Semana</CardTitle>
                  <CardDescription>
                    {weekAppointments.length === 0 ? 'No tienes citas programadas para la próxima semana' : 
                     `Tienes ${weekAppointments.length} cita${weekAppointments.length !== 1 ? 's' : ''} programada${weekAppointments.length !== 1 ? 's' : ''} para la próxima semana`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAppointments ? (
                    <div className="text-center py-4">Cargando citas...</div>
                  ) : weekAppointments.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">No hay citas programadas para la próxima semana</div>
                  ) : (
                    <div className="space-y-4">
                      {weekAppointments.map(appointment => (
                        <div 
                          key={appointment.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-all"
                          onClick={() => navigate(`/specialist/appointments/${appointment.id}`)}
                        >
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-4">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{appointment.patient.first_name} {appointment.patient.last_name}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(appointment.scheduled_at), 'EEEE d', { locale: es })} · {format(new Date(appointment.scheduled_at), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isSpecialist ? 'Mis Citas Hoy' : 'Total Usuarios'}
            </CardTitle>
            {isSpecialist ? <Calendar className="w-4 h-4 text-muted-foreground" /> : <Users className="w-4 h-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isSpecialist ? todayAppointments.length : 0}</div>
            <p className="text-xs text-muted-foreground">
              {isSpecialist ? 'Citas programadas para hoy' : 'Usuarios registrados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isSpecialist ? 'Citas en Progreso' : 'Total Pacientes'}
            </CardTitle>
            {isSpecialist ? <Play className="w-4 h-4 text-muted-foreground" /> : <UserPlus className="w-4 h-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isSpecialist ? (activeAppointment ? 1 : 0) : 0}</div>
            <p className="text-xs text-muted-foreground">
              {isSpecialist ? 'Citas que has tomado' : 'Pacientes registrados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isSpecialist ? 'Próximas Citas' : 'Citas del Día'}
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isSpecialist ? weekAppointments.length : 0}</div>
            <p className="text-xs text-muted-foreground">
              {isSpecialist ? 'En los próximos 7 días' : 'Citas programadas hoy'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
