import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/services/appointmentService';
import {
  getClinicalRecord,
  createClinicalRecord,
  upsertAnamnesis,
  type AnamnesisInput,
  type ClinicalRecord,
} from '@/services/clinicalRecordService';
import { AnamnesisTab } from './NewConsultation/AnamnesisTab';
import { AppointmentAsidePanel } from './AppointmentAsidePanel';

const TAB_LABELS = ['1. Anamnesis', '2. Examen Visual', '3. Diagnóstico', '4. Prescripción'];

interface Props {
  apptId: number;
  appt: Appointment;
}

export function AppointmentClinicalForm({ apptId, appt }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [record, setRecord] = useState<ClinicalRecord | null>(null);

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

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f5f5f6] p-5">
        <div className="flex gap-5 min-h-full items-stretch">
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

            <div className="flex-1 overflow-y-auto">
              {activeTab === 0 && (
                <AnamnesisTab
                  defaultValues={record?.anamnesis}
                  onSave={handleSaveAnamnesis}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 1 && (
                <div className="px-8 py-10 text-center text-[13px] text-[#7d7d87]">
                  Examen visual — próximamente
                </div>
              )}
              {activeTab === 2 && (
                <div className="px-8 py-10 text-center text-[13px] text-[#7d7d87]">
                  Diagnóstico — próximamente
                </div>
              )}
              {activeTab === 3 && (
                <div className="px-8 py-10 text-center text-[13px] text-[#7d7d87]">
                  Prescripción — próximamente
                </div>
              )}
            </div>
          </div>

          <div className="w-[332px] shrink-0 self-start">
            <AppointmentAsidePanel appt={appt} record={record} activeStep={activeTab} />
          </div>
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
