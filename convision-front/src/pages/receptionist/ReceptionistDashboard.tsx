import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, ChevronRight, CheckCircle2, User, ShoppingBag, AlertCircle, RefreshCw, DollarSign, Percent } from 'lucide-react';
import { appointmentsService } from '@/services/appointmentsService';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface Appointment {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    identification: string;
  };
  specialist: {
    id: number;
    name: string;
  };
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;

}

const ReceptionistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);



  // Debugging function to verify specific appointment status
  const verifyAppointmentStatus = async (appointmentId: number) => {
    try {
      const appointment = await appointmentsService.getAppointmentById(appointmentId);
      console.log(`Direct fetch - Appointment ${appointmentId}: status=${appointment.status}`);
      return appointment.status === 'completed';
    } catch (error) {
      console.error(`Error fetching appointment ${appointmentId}:`, error);
      return false;
    }
  };

  // Function to check if an appointment is truly completed
  const isAppointmentTrulyCompleted = (appointment: Appointment): boolean => {
    // Ensure status is explicitly completed
    if (appointment.status !== 'completed') {
      return false;
    }
    
      // Appointment is completed - no prescription check needed for receptionists
    
    return true;
  };

  // Use useCallback to be able to call this function from different places
  const fetchCompletedAppointments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      console.log("Fetching completed appointments...");
      
      // Make the API request with explicit filtering for completed status
      // Add a cache-busting timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await appointmentsService.getAppointments({
        filters: { status: 'completed' },
        perPage: 20,
        sort: 'updated_at,desc',
        view: `${timestamp}` // Add as a query param to bust cache
      });
      
      console.log(`API returned ${response.data.length} appointments with completed status`);
      
      // Debug: Check for any inconsistencies in statuses
      const incorrectStatusAppointments = response.data.filter(a => a.status !== 'completed');
      if (incorrectStatusAppointments.length > 0) {
        console.error('Warning: Found appointments with incorrect status:', 
          incorrectStatusAppointments.map(a => ({ id: a.id, status: a.status }))
        );
      }
      
      // Apply strict filtering to ensure only truly completed appointments are shown
      const strictlyCompletedAppointments = response.data.filter(appointment => 
        isAppointmentTrulyCompleted(appointment)
      );
      
      console.log(`After strict filtering: ${strictlyCompletedAppointments.length} truly completed appointments`);
      
      // Set only the truly completed appointments
      setCompletedAppointments(strictlyCompletedAppointments);

      if (!showLoading) {
        toast({
          title: "Lista actualizada",
          description: `Se han cargado ${strictlyCompletedAppointments.length} citas completadas.`,
        });
      }
    } catch (error) {
      console.error('Error fetching completed appointments:', error);
      if (!showLoading) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las citas completadas. Intente de nuevo.",
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCompletedAppointments();
  }, [fetchCompletedAppointments]);

  // Auto-refresh mechanism to check for completed sales
  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-refresh every 30 seconds to check for completed sales
      fetchCompletedAppointments(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchCompletedAppointments]);

  // Add a refresh button to the UI
  const handleRefresh = () => {
    fetchCompletedAppointments(false);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-start bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">Panel de Recepcionista</h1>
      
      {/* Completed Appointments Banner */}
      {isLoading ? (
        <div className="w-full mb-8 bg-white p-8 rounded-lg shadow-sm border">
          <div className="h-8 w-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-center mt-2 text-gray-500">Cargando citas completadas...</p>
        </div>
      ) : completedAppointments.length > 0 ? (
        <div className="w-full mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Citas Completadas Recientes</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Requieren Atención
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="h-8 gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
          
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-md mb-4">
            <CardHeader className="pb-2 border-b border-green-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-green-600" /> 
                  Citas listas para Ventas
                </CardTitle>
              </div>
              <CardDescription className="text-green-700">
                Las siguientes citas han sido completadas por especialistas y requieren que inicies el proceso de venta
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4 w-full">
                {completedAppointments.map(appointment => (
                  <div 
                    key={appointment.id}
                    onClick={() => navigate(`/receptionist/appointments/${appointment.id}`)}
                    className="cursor-pointer transition-transform hover:scale-[1.01]"
                  >
                    <Card className="border-2 border-green-500 bg-white shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-green-500 text-white p-1.5 rounded-full">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg text-green-800">Cita Completada</CardTitle>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 px-3">
                            Completada
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-500">Paciente</div>
                            <div className="font-medium flex items-center">
                              <User className="h-4 w-4 mr-1 text-gray-400" />
                              {appointment.patient.first_name} {appointment.patient.last_name}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Fecha</div>
                            <div className="font-medium">
                              {format(new Date(appointment.scheduled_at), 'dd/MM/yyyy • HH:mm')}
                            </div>
                          </div>
                        </div>
                        

                        
                        <div className="flex justify-end items-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-green-500/40 text-green-700 hover:bg-green-100 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/receptionist/appointments/${appointment.id}`);
                            }}
                          >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Iniciar venta <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="w-full mb-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
          <div className="flex items-center mb-2">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-blue-800">Sin Citas Completadas Pendientes</h2>
          </div>
          <p className="text-blue-700 ml-12">No hay citas completadas recientes que requieran iniciar una venta.</p>
        </div>
      )}
      
      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/receptionist/catalog')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-convision-primary" /> Catálogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Consulta y gestiona el catálogo de productos ópticos.</p>
            <Button className="mt-4 w-full" variant="outline" onClick={e => { e.stopPropagation(); navigate('/receptionist/catalog'); }}>Ir al Catálogo</Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/receptionist/appointments')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-convision-primary" /> Citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Gestiona las citas de los pacientes y agenda nuevas citas.</p>
            <Button className="mt-4 w-full" variant="outline" onClick={e => { e.stopPropagation(); navigate('/receptionist/appointments'); }}>Ir a Citas</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mt-6">
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/receptionist/sales')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-convision-primary" /> Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Gestiona ventas y consulta el historial de transacciones.</p>
            <Button className="mt-4 w-full" variant="outline" onClick={e => { e.stopPropagation(); navigate('/receptionist/sales'); }}>Ir a Ventas</Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/receptionist/discount-requests')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-6 h-6 text-convision-primary" /> Descuentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Consulta y gestiona los descuentos disponibles en el sistema.</p>
            <Button className="mt-4 w-full" variant="outline" onClick={e => { e.stopPropagation(); navigate('/receptionist/discount-requests'); }}>Ver Descuentos</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceptionistDashboard; 