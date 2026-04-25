import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getAppointmentById,
  takeAppointment,
  pauseAppointment,
  resumeAppointment,
  completeAppointment,
  type Appointment,
} from '../../services/appointmentService';

interface ConflictModalProps {
  open: boolean;
  activeAppointmentId: number;
  onPauseAndTake: () => void;
  onGoToActive: () => void;
  onClose: () => void;
}

function ConflictModal({ open, activeAppointmentId, onPauseAndTake, onGoToActive, onClose }: ConflictModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Ya tienes una cita en curso</h2>
        <p className="text-gray-600 mb-4">
          Tienes la cita #{activeAppointmentId} activa. ¿Qué deseas hacer?
        </p>
        <div className="flex gap-3 flex-col">
          <button
            className="w-full bg-[#0f8f64] text-white rounded-md py-2 hover:bg-[#0a7050]"
            onClick={onPauseAndTake}
          >
            Pausar y tomar esta cita
          </button>
          <button
            className="w-full border border-gray-300 text-gray-700 rounded-md py-2 hover:bg-gray-50"
            onClick={onGoToActive}
          >
            Ir a mi cita activa
          </button>
          <button
            className="w-full text-gray-500 text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function useElapsedTimer(startedAt?: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const TABS = [
  'Resumen',
  'Historia clínica',
  'Anotaciones',
  'Evolución',
  'Prescripción',
  'Notas internas',
];

function getPatientName(appt: Appointment): string {
  if (appt.patient?.full_name) return appt.patient.full_name;
  if (appt.patient?.first_name && appt.patient?.last_name) {
    return `${appt.patient.first_name} ${appt.patient.last_name}`;
  }
  return 'Paciente';
}

function getPatientId(appt: Appointment): string {
  return appt.patient?.id_number || appt.patient?.identification || '';
}

export default function SpecialistAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('Resumen');
  const [conflictModal, setConflictModal] = useState<{ open: boolean; activeId: number }>({
    open: false,
    activeId: 0,
  });

  const apptId = parseInt(id ?? '0', 10);

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', apptId],
    queryFn: async () => {
      const res = await getAppointmentById(apptId);
      return res.data as Appointment;
    },
    enabled: apptId > 0,
    refetchInterval: (query) => {
      const data = query.state.data as Appointment | undefined;
      return data?.status === 'in_progress' ? 30000 : false;
    },
  });

  const elapsed = useElapsedTimer(appt?.status === 'in_progress' ? appt.started_at : undefined);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['appointment', apptId] });
    queryClient.invalidateQueries({ queryKey: ['specialist-appointments'] });
  };

  const takeMutation = useMutation({
    mutationFn: () => takeAppointment(apptId),
    onSuccess: () => {
      toast({ title: 'Cita tomada', description: 'Has iniciado la atención de esta cita.' });
      invalidateQueries();
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { status?: number; data?: { error_type?: string; current_appointment_id?: number; message?: string } } };
      if (axiosError.response?.status === 409 || axiosError.response?.data?.error_type === 'appointment_in_progress') {
        const activeId = axiosError.response?.data?.current_appointment_id ?? 0;
        setConflictModal({ open: true, activeId });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: axiosError.response?.data?.message ?? 'No se pudo tomar la cita.',
        });
      }
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseAppointment(apptId),
    onSuccess: () => {
      toast({ title: 'Cita pausada', description: 'Puedes reanudarla más tarde.' });
      invalidateQueries();
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast({ variant: 'destructive', title: 'Error', description: msg ?? 'No se pudo pausar la cita.' });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeAppointment(apptId),
    onSuccess: () => {
      toast({ title: 'Cita reanudada', description: 'Has reanudado la atención.' });
      invalidateQueries();
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { error_type?: string; current_appointment_id?: number; message?: string } } };
      if (axiosError.response?.data?.error_type === 'appointment_in_progress') {
        const activeId = axiosError.response?.data?.current_appointment_id ?? 0;
        setConflictModal({ open: true, activeId });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: axiosError.response?.data?.message ?? 'No se pudo reanudar la cita.',
        });
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeAppointment(apptId),
    onSuccess: () => {
      toast({ title: 'Cita completada', description: 'La cita ha sido marcada como completada.' });
      navigate('/specialist/appointments');
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast({ variant: 'destructive', title: 'Error', description: msg ?? 'No se pudo completar la cita.' });
    },
  });

  const handlePauseAndTake = async () => {
    setConflictModal(prev => ({ ...prev, open: false }));
    try {
      await pauseAppointment(conflictModal.activeId);
      takeMutation.mutate();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo pausar la cita activa.' });
    }
  };

  if (isLoading) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!appt) return <div className="p-6 text-gray-500">Cita no encontrada</div>;

  const patientName = getPatientName(appt);
  const patientIdNumber = getPatientId(appt);
  const isActive = appt.status === 'in_progress' || appt.status === 'paused';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          className="text-gray-500 hover:text-gray-700 text-sm"
          onClick={() => navigate('/specialist/appointments')}
        >
          ← Volver a la agenda
        </button>
        {appt.status === 'in_progress' && (
          <div className="bg-[#0f8f64] text-white px-4 py-2 rounded-full text-sm font-mono">
            {patientName} · {elapsed}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold">{patientName}</h2>
        {patientIdNumber && <p className="text-sm text-gray-500">{patientIdNumber}</p>}
        <p className="text-sm text-gray-500">
          {new Date(appt.scheduled_at).toLocaleString('es-CO')}
        </p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        {appt.status === 'scheduled' && (
          <button
            className="bg-[#0f8f64] text-white px-6 py-2 rounded-md hover:bg-[#0a7050] disabled:opacity-50"
            onClick={() => takeMutation.mutate()}
            disabled={takeMutation.isPending}
          >
            {takeMutation.isPending ? 'Tomando...' : 'Tomar cita'}
          </button>
        )}
        {appt.status === 'in_progress' && (
          <>
            <button
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? 'Pausando...' : 'Pausar'}
            </button>
            <button
              className="bg-[#0f8f64] text-white px-6 py-2 rounded-md hover:bg-[#0a7050] disabled:opacity-50"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Completando...' : 'Completar'}
            </button>
          </>
        )}
        {appt.status === 'paused' && (
          <>
            <button
              className="bg-[#0f8f64] text-white px-6 py-2 rounded-md hover:bg-[#0a7050] disabled:opacity-50"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
            >
              {resumeMutation.isPending ? 'Reanudando...' : 'Reanudar'}
            </button>
            <button
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Completando...' : 'Completar'}
            </button>
          </>
        )}
      </div>

      {isActive && (
        <>
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-[#0f8f64] text-[#0f8f64]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {activeTab === 'Historia clínica' ? (
              <button
                className="w-full bg-[#0f8f64] text-white py-2 rounded-md hover:bg-[#0a7050]"
                onClick={() => appt.patient?.id && navigate(`/specialist/patients/${appt.patient.id}/history?appointmentId=${appt.id}`)}
              >
                Ir a historia clínica
              </button>
            ) : activeTab === 'Prescripción' ? (
              <button
                className="w-full bg-[#0f8f64] text-white py-2 rounded-md hover:bg-[#0a7050]"
                onClick={() => navigate(`/specialist/prescriptions/create?appointment_id=${appt.id}`)}
              >
                Crear prescripción
              </button>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                Contenido de {activeTab}
              </p>
            )}
          </div>
        </>
      )}

      <ConflictModal
        open={conflictModal.open}
        activeAppointmentId={conflictModal.activeId}
        onPauseAndTake={handlePauseAndTake}
        onGoToActive={() => {
          setConflictModal(prev => ({ ...prev, open: false }));
          navigate(`/specialist/appointments/${conflictModal.activeId}`);
        }}
        onClose={() => setConflictModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
