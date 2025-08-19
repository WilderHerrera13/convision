import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PrescriptionForm from '@/components/PrescriptionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import api from '@/lib/axios';

interface Appointment {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
  };
  status: string;
  specialist_id: number;
  taken_by_id?: number;
}

const PrescriptionCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appointmentId = searchParams.get('appointment_id');

  useEffect(() => {
    if (!appointmentId) {
      setError('ID de cita requerido');
      setLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        const response = await api.get(`/api/v1/appointments/${appointmentId}`);
        const appointmentData = response.data.data;
        
        console.log('API Response:', appointmentData);
        
        // Validate that we have the required data
        if (!appointmentData) {
          setError('No se recibió información de la cita');
          return;
        }
        
        if (!appointmentData.patient) {
          console.log('Patient data missing in response:', appointmentData);
          setError('La información del paciente no está disponible en la respuesta de la API');
          return;
        }
        
        setAppointment(appointmentData);
      } catch (error) {
        console.error('Error fetching appointment:', error);
        setError('No se pudo cargar la información de la cita');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  const handleComplete = () => {
    navigate('/specialist/appointments');
  };

  const handleCancel = () => {
    navigate(-1);
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

  if (error || !appointment) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error || 'No se pudo cargar la información de la cita'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointmentId) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                ID de cita requerido. Por favor, acceda a esta página desde una cita válida.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/specialist/appointments')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Ir a Citas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patientName = appointment?.patient 
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}` 
    : 'Paciente desconocido';

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-5xl mx-auto">
        <PrescriptionForm
          appointmentId={parseInt(appointmentId)}
          patientName={patientName}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default PrescriptionCreate; 