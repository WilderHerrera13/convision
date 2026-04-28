import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/services/appointmentService';
import {
  getClinicalRecord,
  createClinicalRecord,
  upsertAnamnesis,
  upsertVisualExam,
  upsertDiagnosis,
  upsertPrescription,
  type AnamnesisInput,
  type VisualExamInput,
  type DiagnosisInput,
  type PrescriptionInput,
  type ClinicalRecord,
} from '@/services/clinicalRecordService';
import { AnamnesisTab } from './NewConsultation/AnamnesisTab';
import { VisualExamTab } from './NewConsultation/VisualExamTab';
import { DiagnosisTab } from './NewConsultation/DiagnosisTab';
import { PrescriptionTab } from './NewConsultation/PrescriptionTab';
import { AppointmentAsidePanel } from './AppointmentAsidePanel';

const TAB_LABELS = ['1. Anamnesis', '2. Examen Visual', '3. Diagnóstico', '4. Prescripción'];

interface Props {
  apptId: number;
  appt: Appointment;
}

export function AppointmentClinicalForm({ apptId, appt }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [savedVisualExam, setSavedVisualExam] = useState<VisualExamInput | undefined>();

  useQuery({
    queryKey: ['clinical-record', apptId],
    queryFn: async () => {
      try {
        const res = await getClinicalRecord(apptId);
        setRecord(res.data);
        return res.data;
      } catch {
        const created = await createClinicalRecord(apptId, 'new_consultation');
        setRecord(created.data);
        return created.data;
      }
    },
    enabled: apptId > 0,
  });

  const handleSaveAnamnesis = useCallback(async (data: AnamnesisInput) => {
    setIsSaving(true);
    try {
      const res = await upsertAnamnesis(apptId, data);
      setRecord(res.data);
      queryClient.invalidateQueries({ queryKey: ['clinical-record', apptId] });
      toast({ title: 'Anamnesis guardada' });
      setActiveTab(1);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la anamnesis.' });
    } finally {
      setIsSaving(false);
    }
  }, [apptId, queryClient, toast]);

  const handleSaveVisualExam = useCallback(async (data: VisualExamInput) => {
    setIsSaving(true);
    try {
      await upsertVisualExam(apptId, data);
      setSavedVisualExam(data);
      queryClient.invalidateQueries({ queryKey: ['clinical-record', apptId] });
      toast({ title: 'Examen visual guardado' });
      setActiveTab(2);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el examen visual.' });
    } finally {
      setIsSaving(false);
    }
  }, [apptId, queryClient, toast]);

  const handleSaveDiagnosis = useCallback(async (data: DiagnosisInput) => {
    setIsSaving(true);
    try {
      const res = await upsertDiagnosis(apptId, data);
      setRecord(res.data);
      queryClient.invalidateQueries({ queryKey: ['clinical-record', apptId] });
      toast({ title: 'Diagnóstico guardado' });
      setActiveTab(3);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el diagnóstico.' });
    } finally {
      setIsSaving(false);
    }
  }, [apptId, queryClient, toast]);

  const handleSavePrescription = useCallback(async (data: PrescriptionInput) => {
    setIsSaving(true);
    try {
      await upsertPrescription(apptId, data);
      queryClient.invalidateQueries({ queryKey: ['clinical-record', apptId] });
      toast({ title: 'Fórmula óptica guardada' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la fórmula óptica.' });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [apptId, queryClient, toast]);

  const handleSign = useCallback(() => {
    navigate(`/specialist/appointments/${apptId}/prescription-preview`);
  }, [apptId, navigate]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden bg-[#f5f5f6] p-5 flex gap-5">
        <div className="flex-1 min-w-0 flex flex-col bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
          <div className="bg-[#fafafb] border-b border-[#e5e5e9] flex shrink-0">
            {TAB_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`flex-1 h-[46px] text-[12px] relative transition-colors ${
                  activeTab === i
                    ? 'bg-white font-semibold text-[#0f0f12]'
                    : 'font-normal text-[#7d7d87] hover:text-[#121215]'
                }`}
              >
                {label}
                {activeTab === i && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0f8f64]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scroll-pt-[54px]">
            {activeTab === 0 && (
              <AnamnesisTab
                key={`anamnesis-${record?.id ?? 0}`}
                defaultValues={record?.anamnesis}
                onSave={handleSaveAnamnesis}
                isSaving={isSaving}
              />
            )}
            {activeTab === 1 && (
              <VisualExamTab
                key={`visual-exam-${record?.id ?? 0}`}
                defaultValues={record?.visual_exam}
                onSave={handleSaveVisualExam}
                onBack={() => setActiveTab(0)}
                isSaving={isSaving}
              />
            )}
            {activeTab === 2 && (
              <DiagnosisTab
                key={`diagnosis-${record?.id ?? 0}`}
                defaultValues={record?.diagnosis}
                onSave={handleSaveDiagnosis}
                onBack={() => setActiveTab(1)}
                isSaving={isSaving}
              />
            )}
            {activeTab === 3 && (
              <PrescriptionTab
                key={`prescription-${record?.id ?? 0}`}
                defaultValues={record?.prescription}
                visualExamData={savedVisualExam || record?.visual_exam}
                onSave={handleSavePrescription}
                onBack={() => setActiveTab(2)}
                onSign={handleSign}
                isSaving={isSaving}
              />
            )}
          </div>
        </div>

        <div className="w-[332px] shrink-0 overflow-y-auto">
          <AppointmentAsidePanel appt={appt} record={record} activeStep={activeTab} />
        </div>
      </div>

      <div className="h-[52px] bg-white border-t border-[#e5e5e9] flex items-center px-6 shrink-0">
        <p className="text-[12px] text-[#7d7d87]">
          Los cambios se guardan automáticamente · Campos con * son obligatorios
        </p>
      </div>
    </div>
  );
}
