import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronRight, Pause, RotateCcw, CheckCircle2, AlertTriangle, X, Check, Play,
  AlertCircle,
} from 'lucide-react';
import {
  getAppointmentById,
  takeAppointment,
  pauseAppointment,
  resumeAppointment,
  completeAppointment,
  type Appointment,
} from '../../services/appointmentService';
import { AppointmentClinicalForm } from '@/components/clinical/AppointmentClinicalForm';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled:   { label: 'Pendiente',   bg: 'bg-[#fff6e3]',  text: 'text-[#b57218]' },
  in_progress: { label: 'En curso',    bg: 'bg-[#e5f6ef]',  text: 'text-[#0f8f64]' },
  paused:      { label: 'Pausada',     bg: 'bg-[#eff1ff]',  text: 'text-[#3a71f7]' },
  completed:   { label: 'Completada',  bg: 'bg-[#f0f0f2]',  text: 'text-[#7d7d87]' },
  cancelled:   { label: 'Cancelada',   bg: 'bg-[#ffeeed]',  text: 'text-[#b82626]' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const h = date.getHours() % 12 || 12;
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} · ${h}:${m} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function getPatientName(appt: Appointment): string {
  if (appt.patient?.full_name) return appt.patient.full_name;
  if (appt.patient?.first_name && appt.patient?.last_name) return `${appt.patient.first_name} ${appt.patient.last_name}`;
  return 'Paciente';
}

function ConflictModal({ open, activeId, onPauseAndTake, onGoToActive, onClose }: {
  open: boolean; activeId: number;
  onPauseAndTake: () => void; onGoToActive: () => void; onClose: () => void;
}) {
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);
  useEffect(() => {
    if (!open || !activeId) return;
    setActiveAppt(null);
    getAppointmentById(activeId).then(r => setActiveAppt(r.data as Appointment)).catch(() => {});
  }, [open, activeId]);
  if (!open) return null;
  const name = activeAppt ? getPatientName(activeAppt) : '';
  return (
    <div className="fixed inset-0 bg-[rgba(15,15,18,0.5)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] w-full max-w-[520px] overflow-hidden">
        <div className="flex items-start gap-4 px-6 pt-5 pb-5">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#b82626]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-[#0f0f12]">Ya tienes una cita en curso</p>
            <p className="text-[12px] text-[#7d7d87] mt-0.5">Solo puedes atender una cita a la vez</p>
          </div>
          <button onClick={onClose} className="text-[#7d7d87] hover:text-[#121215]"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pb-5 space-y-3">
          <p className="text-[13px] text-[#121215]">{name ? <>Estás atendiendo a <span className="font-semibold">{name}</span>.</> : <>Cita #{activeId} activa.</>}</p>
          {(['Pausar la cita actual y reanudarla luego', 'O completarla y luego tomar esta'] as const).map(t => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#0f8f64] flex items-center justify-center shrink-0">
                <Check className="w-2 h-2 text-white" strokeWidth={3} />
              </div>
              <span className="text-[12px] text-[#121215]">{t}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#f0f0f2] px-6 py-4 flex items-center gap-3">
          <button onClick={onClose} className="text-[12px] font-medium text-[#7d7d87] mr-auto">Cancelar</button>
          <button onClick={onPauseAndTake} className="flex items-center gap-1.5 px-4 h-9 border border-[#e5e5e9] rounded-[6px] text-[13px] font-semibold text-[#121215] bg-white hover:bg-[#f5f5f6]">
            <Pause className="w-3 h-3 text-[#b57218]" /> Pausar y tomar esta
          </button>
          <button onClick={onGoToActive} className="flex items-center gap-1.5 px-4 h-9 bg-[#0f8f64] rounded-[6px] text-[13px] font-semibold text-white hover:bg-[#0a7050]">
            <Play className="w-2.5 h-2.5 fill-white" /> Ir a mi cita activa →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SpecialistAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [conflict, setConflict] = useState({ open: false, activeId: 0 });
  const apptId = parseInt(id ?? '0', 10);

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', apptId],
    queryFn: async () => (await getAppointmentById(apptId)).data as Appointment,
    enabled: apptId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['appointment', apptId] });
    queryClient.invalidateQueries({ queryKey: ['specialist-appointments'] });
  };

  const takeMut = useMutation({
    mutationFn: () => takeAppointment(apptId),
    onSuccess: () => { toast({ title: 'Cita tomada' }); invalidate(); },
    onError: (e: unknown) => {
      const ax = e as { response?: { status?: number; data?: { error_type?: string; current_appointment_id?: number; message?: string } } };
      if (ax.response?.status === 409 || ax.response?.data?.error_type === 'appointment_in_progress') {
        setConflict({ open: true, activeId: ax.response?.data?.current_appointment_id ?? 0 });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: ax.response?.data?.message ?? 'No se pudo tomar la cita.' });
      }
    },
  });

  const pauseMut = useMutation({
    mutationFn: () => pauseAppointment(apptId),
    onSuccess: () => { toast({ title: 'Cita pausada' }); invalidate(); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast({ variant: 'destructive', title: 'Error', description: msg ?? 'No se pudo pausar.' });
    },
  });

  const resumeMut = useMutation({
    mutationFn: () => resumeAppointment(apptId),
    onSuccess: () => { toast({ title: 'Cita reanudada' }); invalidate(); },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { error_type?: string; current_appointment_id?: number; message?: string } } };
      if (ax.response?.data?.error_type === 'appointment_in_progress') {
        setConflict({ open: true, activeId: ax.response?.data?.current_appointment_id ?? 0 });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: ax.response?.data?.message ?? 'No se pudo reanudar.' });
      }
    },
  });

  const completeMut = useMutation({
    mutationFn: () => completeAppointment(apptId),
    onSuccess: () => { toast({ title: 'Cita completada' }); navigate('/specialist/appointments'); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast({ variant: 'destructive', title: 'Error', description: msg ?? 'No se pudo completar.' });
    },
  });

  const handlePauseAndTake = async () => {
    setConflict(p => ({ ...p, open: false }));
    try { await pauseAppointment(conflict.activeId); takeMut.mutate(); }
    catch { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo pausar la cita activa.' }); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-[60px] bg-white border-b border-[#ebebee] shrink-0" />
        <div className="flex-1 bg-[#f5f5f6] flex items-center justify-center">
          <p className="text-[13px] text-[#7d7d87]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-[60px] bg-white border-b border-[#ebebee] shrink-0" />
        <div className="flex-1 bg-[#f5f5f6] flex items-center justify-center">
          <p className="text-[13px] text-[#7d7d87]">Cita no encontrada</p>
        </div>
      </div>
    );
  }

  const patientName = getPatientName(appt);
  const initials = getInitials(patientName);
  const statusCfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.scheduled;
  const isClinical = appt.status === 'in_progress' || appt.status === 'paused' || appt.status === 'completed';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-white border-b border-[#ebebee] h-[60px] shrink-0 flex items-center justify-between px-6">
        <div className="flex flex-col justify-center gap-0.5 min-w-0">
          <div className="flex items-center gap-1 text-[12px] text-[#7d7d87]">
            <button className="hover:text-[#121215]" onClick={() => navigate('/specialist/appointments')}>Citas</button>
            <ChevronRight className="size-3 text-[#d1d1d8]" />
            <span className="text-[#0f0f12] font-semibold">
              {isClinical ? `Historia Clínica #${apptId}` : `Cita #${apptId}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-none whitespace-nowrap">
              {isClinical ? `Consulta · ${patientName}` : `Cita de ${patientName}`}
            </h1>
            {isClinical && (
              <p className="text-[12px] text-[#7d7d87]">{formatDateTime(appt.scheduled_at)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </span>
          {!isClinical && (
            <button className="h-9 px-4 border border-[#e5e5e9] rounded-[6px] text-[13px] font-semibold text-[#121215] bg-white hover:bg-[#f5f5f6]"
              onClick={() => navigate('/specialist/appointments')}>
              Volver a agenda
            </button>
          )}
          {appt.status === 'scheduled' && (
            <button className="h-9 px-5 bg-[#0f8f64] text-white rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] flex items-center gap-1.5 disabled:opacity-50"
              onClick={() => takeMut.mutate()} disabled={takeMut.isPending}>
              {takeMut.isPending ? 'Tomando...' : 'Tomar cita ahora'}<ChevronRight className="size-3.5" />
            </button>
          )}
          {appt.status === 'in_progress' && (<>
            <button className="h-9 px-4 border border-[#e5e5e9] rounded-[6px] text-[13px] font-semibold text-[#121215] bg-white hover:bg-[#f5f5f6] flex items-center gap-1.5 disabled:opacity-50"
              onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending}>
              <Pause className="size-3.5" />{pauseMut.isPending ? 'Pausando...' : 'Pausar consulta'}
            </button>
            <button className="h-9 px-5 bg-[#0f8f64] text-white rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] flex items-center gap-1.5 disabled:opacity-50"
              onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
              <CheckCircle2 className="size-3.5" />{completeMut.isPending ? 'Completando...' : 'Completar consulta'}
            </button>
          </>)}
          {appt.status === 'paused' && (<>
            <button className="h-9 px-4 bg-[#0f8f64] text-white rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] flex items-center gap-1.5 disabled:opacity-50"
              onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
              <RotateCcw className="size-3.5" />{resumeMut.isPending ? 'Reanudando...' : 'Reanudar'}
            </button>
            <button className="h-9 px-4 border border-[#e5e5e9] rounded-[6px] text-[13px] font-semibold text-[#121215] bg-white hover:bg-[#f5f5f6] disabled:opacity-50"
              onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
              {completeMut.isPending ? 'Completando...' : 'Completar'}
            </button>
          </>)}
        </div>
      </div>

      {/* Body */}
      {isClinical ? (
        <AppointmentClinicalForm apptId={apptId} appt={appt} />
      ) : (
        <div className="flex-1 overflow-y-auto bg-[#f5f5f6] p-6">
          <div className="grid grid-cols-[1fr_360px] gap-4">
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-[#ebebee] rounded-[8px] p-6">
                <p className="text-[13px] font-semibold text-[#0f0f12] mb-1">Listo para iniciar la atención</p>
                <p className="text-[12px] text-[#7d7d87] mb-3">Al tomar la cita pasarás a estado En curso.</p>
                <div className="flex items-start gap-2 bg-[#fff6e3] border border-[#f4c778] rounded-[6px] px-3 py-2.5 mb-4">
                  <AlertCircle className="size-4 text-[#b57218] shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-[#b57218] leading-relaxed">Solo puedes tener una cita activa a la vez.</p>
                </div>
                <div className="flex justify-end">
                  <button className="h-9 px-5 bg-[#0f8f64] text-white rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] flex items-center gap-1.5 disabled:opacity-50"
                    onClick={() => takeMut.mutate()} disabled={takeMut.isPending}>
                    {takeMut.isPending ? 'Tomando...' : 'Tomar cita ahora'}<ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="bg-white border border-[#ebebee] rounded-[8px] p-6">
                <p className="text-[13px] font-semibold text-[#0f0f12] mb-3">Datos de la cita</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-[0.6px] mb-1">Fecha y hora</p>
                    <p className="text-[13px] font-semibold text-[#0f0f12]">{formatDateTime(appt.scheduled_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-[0.6px] mb-1">Motivo</p>
                    <p className="text-[13px] font-semibold text-[#0f0f12]">{appt.reason ?? '—'}</p>
                  </div>
                </div>
                {appt.notes && (<>
                  <div className="h-px bg-[#f0f0f2] my-4" />
                  <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-[0.6px] mb-1">Notas de recepción</p>
                  <p className="text-[13px] text-[#121215]">{appt.notes}</p>
                </>)}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-[#ebebee] rounded-[8px] p-6">
                <div className="flex flex-col items-center mb-4">
                  <div className="size-16 bg-[#e5f6ef] rounded-full flex items-center justify-center mb-3">
                    <span className="text-[18px] font-semibold text-[#0f8f64]">{initials}</span>
                  </div>
                  <p className="text-[16px] font-semibold text-[#0f0f12]">{patientName}</p>
                  <span className="mt-2 bg-[#e5f6ef] text-[#0f8f64] text-[11px] font-semibold px-3 py-0.5 rounded-full">Paciente activo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConflictModal
        open={conflict.open}
        activeId={conflict.activeId}
        onPauseAndTake={handlePauseAndTake}
        onGoToActive={() => { setConflict(p => ({ ...p, open: false })); navigate(`/specialist/appointments/${conflict.activeId}`); }}
        onClose={() => setConflict(p => ({ ...p, open: false }))}
      />
    </div>
  );
}
