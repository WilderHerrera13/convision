import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAppointmentById } from '@/services/appointmentService';
import {
  createClinicalRecord,
  getClinicalRecord,
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
import { ClinicalAsidePanel } from '@/components/clinical/ClinicalAsidePanel';
import { ClinicalTabBar } from '@/components/clinical/ClinicalTabBar';
import { AnamnesisTab } from '@/components/clinical/NewConsultation/AnamnesisTab';
import { VisualExamTab } from '@/components/clinical/NewConsultation/VisualExamTab';
import { DiagnosisTab } from '@/components/clinical/NewConsultation/DiagnosisTab';
import { PrescriptionTab } from '@/components/clinical/NewConsultation/PrescriptionTab';

const TAB_LABELS = ['Anamnesis', 'Examen Visual', 'Diagnóstico', 'Prescripción'];
const TIP_TEXTS = [
  'Registre el motivo principal de consulta y todos los antecedentes relevantes del paciente.',
  'Registre la agudeza visual sin y con corrección, la refracción objetiva y subjetiva.',
  'Seleccione el diagnóstico principal CIE-10 y complete el plan de atención.',
  'Complete la fórmula óptica. Los valores se pre-llenan desde el examen visual subjetivo.',
];


export default function ClinicalHistoryNewConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apptId = parseInt(id || '0');

  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);
  const [stepsCompleted, setStepsCompleted] = useState([false, false, false, false]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedVisualExam, setSavedVisualExam] = useState<VisualExamInput | undefined>();
  const [savedDiagnosis, setSavedDiagnosis] = useState<DiagnosisInput | undefined>();
  const [savedPrescription, setSavedPrescription] = useState<PrescriptionInput | undefined>();
  const [record, setRecord] = useState<ClinicalRecord | null>(null);

  const { data: appt } = useQuery({
    queryKey: ['appointment', apptId],
    queryFn: () => getAppointmentById(apptId).then(r => r.data),
    enabled: apptId > 0,
  });

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

  const markCompleted = useCallback((tabIndex: number) => {
    setStepsCompleted(prev => {
      const next = [...prev];
      next[tabIndex] = true;
      return next;
    });
  }, []);

  const handleSaveAnamnesis = async (data: AnamnesisInput) => {
    setIsSaving(true);
    try {
      const res = await upsertAnamnesis(apptId, data);
      setRecord(res.data);
      markCompleted(0);
    } catch {
      // navigation still advances regardless of save outcome
    } finally {
      setActiveTab(1);
      setIsSaving(false);
    }
  };

  const handleSaveVisualExam = async (data: VisualExamInput) => {
    setIsSaving(true);
    try {
      const res = await upsertVisualExam(apptId, data);
      setRecord(res.data);
      setSavedVisualExam(data);
      markCompleted(1);
    } catch {
      // navigation still advances regardless of save outcome
    } finally {
      setActiveTab(2);
      setIsSaving(false);
    }
  };

  const handleSaveDiagnosis = async (data: DiagnosisInput) => {
    setIsSaving(true);
    try {
      const res = await upsertDiagnosis(apptId, data);
      setRecord(res.data);
      setSavedDiagnosis(data);
      markCompleted(2);
    } catch {
      // navigation still advances regardless of save outcome
    } finally {
      setActiveTab(3);
      setIsSaving(false);
    }
  };

  const handleSavePrescription = async (data: PrescriptionInput) => {
    setIsSaving(true);
    try {
      const res = await upsertPrescription(apptId, data);
      setRecord(res.data);
      setSavedPrescription(data);
      markCompleted(3);
    } finally { setIsSaving(false); }
  };

  const handleSign = () => navigate(`/specialist/appointments/${apptId}/prescription-preview`);


  const patient = appt?.patient;
  const patientInfo = {
    name:
      patient?.full_name ||
      (patient?.first_name && patient?.last_name ? `${patient.first_name} ${patient.last_name}` : '') ||
      'Paciente',
    id_number: patient?.id_number || patient?.identification || '',
    age: 0,
  };

  const tabs = TAB_LABELS.map((label, i) => ({ label, completed: stepsCompleted[i] }));

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex flex-1 overflow-hidden">
        <ClinicalAsidePanel
          patient={patientInfo}
          currentStep={activeTab + 1}
          totalSteps={4}
          tipText={TIP_TEXTS[activeTab]}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ClinicalTabBar tabs={tabs} activeIndex={activeTab} onTabChange={setActiveTab} />

          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#f5f5f6] p-6">
            <div className="max-w-2xl mx-auto bg-white border border-[#e5e5e9] rounded-xl p-6">
              {activeTab === 0 && (
                <AnamnesisTab key={`anamnesis-${record?.id ?? 0}`} defaultValues={record?.anamnesis} onSave={handleSaveAnamnesis} isSaving={isSaving} />
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
                <DiagnosisTab key={`diagnosis-${record?.id ?? 0}`} defaultValues={record?.diagnosis} onSave={handleSaveDiagnosis} onBack={() => setActiveTab(1)} isSaving={isSaving} />
              )}
              {activeTab === 3 && (
                <PrescriptionTab
                  key={`prescription-${record?.id ?? 0}`}
                  defaultValues={record?.prescription}
                  visualExamData={savedVisualExam || record?.visual_exam}
                  onSave={handleSavePrescription}
                  onSign={handleSign}
                  isSaving={isSaving}
                />
              )}
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-[#e5e5e9] bg-white px-6 py-3">
            <p className="text-xs text-[#7d7d87]">
              Res. 1995/1999 — Historia Clínica Obligatoria | CUPS: 890205 | Ley 650/2001 Art. 24
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
