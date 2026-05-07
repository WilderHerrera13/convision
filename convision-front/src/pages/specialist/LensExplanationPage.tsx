import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { LensCanvas } from '@/components/lens-canvas/LensCanvas';
import {
  getLensAnnotation,
  saveLensAnnotation,
  type CanvasPath,
} from '@/services/lensAnnotationService';
import { getAppointmentById, type Appointment } from '@/services/appointmentService';

function getPatientName(appt: Appointment): string {
  if (appt.patient?.full_name) return appt.patient.full_name;
  if (appt.patient?.first_name && appt.patient?.last_name) return `${appt.patient.first_name} ${appt.patient.last_name}`;
  return 'Paciente';
}

export default function LensExplanationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apptId = parseInt(id ?? '0', 10);

  const { data: appt, isLoading: isLoadingAppt } = useQuery({
    queryKey: ['appointment', apptId],
    queryFn: async () => (await getAppointmentById(apptId)).data as Appointment,
    enabled: apptId > 0,
  });

  const { data: lensData, isLoading: isLoadingLens } = useQuery({
    queryKey: ['lens-annotation', apptId],
    queryFn: async () => {
      const res = await getLensAnnotation(apptId);
      return res.data;
    },
    enabled: apptId > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ imageData, paths }: { imageData: string; paths: CanvasPath[] }) => {
      await saveLensAnnotation(apptId, {
        lens_annotation_image: imageData,
        lens_annotation_paths: paths,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lens-annotation', apptId] });
      toast({ title: 'Anotaciones guardadas', description: 'La explicación de lentes fue guardada correctamente.' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la explicación.' });
    },
  });

  const handleSave = async (imageData: string, paths: CanvasPath[]) => {
    await saveMutation.mutateAsync({ imageData, paths });
  };

  const patientName = appt ? getPatientName(appt) : '';
  const isClinical = appt?.status === 'in_progress' || appt?.status === 'paused';

  useEffect(() => {
    if (appt && !isClinical) {
      navigate(`/specialist/appointments/${apptId}`, { replace: true });
    }
  }, [appt, isClinical, apptId, navigate]);

  if (isLoadingAppt || isLoadingLens) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-[60px] bg-white border-b border-[#ebebee] shrink-0" />
        <div className="flex-1 bg-[#f5f5f6] flex items-center justify-center">
          <p className="text-[13px] text-[#7d7d87]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!appt || !isClinical) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-[#ebebee] h-[60px] shrink-0 flex items-center justify-between px-6">
        <div className="flex flex-col justify-center gap-0.5 min-w-0">
          <div className="flex items-center gap-1 text-[12px] text-[#7d7d87]">
            <button className="hover:text-[#121215]" onClick={() => navigate('/specialist/appointments')}>Citas</button>
            <ChevronRight className="size-3 text-[#d1d1d8]" />
            <button className="hover:text-[#121215]" onClick={() => navigate(`/specialist/appointments/${apptId}`)}>
              Historia Clínica #{apptId}
            </button>
            <ChevronRight className="size-3 text-[#d1d1d8]" />
            <span className="text-[#0f0f12] font-semibold">Explicación de Lentes</span>
          </div>
          <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-none">
            Explicación de Lentes · {patientName}
          </h1>
        </div>

        <button
          onClick={() => navigate(`/specialist/appointments/${apptId}`)}
          className="flex items-center gap-1.5 h-9 px-4 border border-[#e5e5e9] rounded-[6px] text-[13px] font-semibold text-[#121215] bg-white hover:bg-[#f5f5f6]"
        >
          <ArrowLeft className="size-3.5" />
          Volver a la consulta
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <LensCanvas
          initialImage={lensData?.lens_annotation_image ?? null}
          initialPaths={lensData?.lens_annotation_paths ?? null}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
        />
      </div>
    </div>
  );
}
