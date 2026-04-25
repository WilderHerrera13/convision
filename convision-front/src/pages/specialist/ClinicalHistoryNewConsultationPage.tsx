import { useState, useCallback } from 'react';
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

function SignModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold text-[#0f0f12] mb-2">Firmar consulta</h2>
        <p className="text-sm text-[#7d7d87] mb-4">
          Al firmar, se completará la consulta y se generará la fórmula óptica como documento legal.
          Esta acción no se puede deshacer.
        </p>
        <p className="text-xs text-[#7d7d87] mb-4">
          Módulo de firma digital completo disponible en el siguiente paso.
        </p>
        <div className="flex gap-3">
          <button
            className="flex-1 border border-[#e5e5e9] text-[#0f0f12] py-2 rounded-lg text-sm hover:bg-[#f5f5f6]"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 bg-[#0f8f64] text-white py-2 rounded-lg text-sm hover:bg-[#0a7050]"
            onClick={onConfirm}
          >
            Completar consulta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClinicalHistoryNewConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apptId = parseInt(id || '0');

  const [activeTab, setActiveTab] = useState(0);
  const [stepsCompleted, setStepsCompleted] = useState([false, false, false, false]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [savedVisualExam, setSavedVisualExam] = useState<VisualExamInput | undefined>();
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
      await upsertAnamnesis(apptId, data);
      markCompleted(0);
      setActiveTab(1);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVisualExam = async (data: VisualExamInput) => {
    setIsSaving(true);
    try {
      await upsertVisualExam(apptId, data);
      setSavedVisualExam(data);
      markCompleted(1);
      setActiveTab(2);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDiagnosis = async (data: DiagnosisInput) => {
    setIsSaving(true);
    try {
      await upsertDiagnosis(apptId, data);
      markCompleted(2);
      setActiveTab(3);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrescription = async (data: PrescriptionInput) => {
    setIsSaving(true);
    try {
      await upsertPrescription(apptId, data);
      markCompleted(3);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSign = () => setShowSignModal(true);

  const handleConfirmSign = () => {
    setShowSignModal(false);
    navigate('/specialist/appointments');
  };

  const patient = appt?.patient;
  const patientInfo = {
    name: patient?.full_name || 'Paciente',
    id_number: patient?.id_number || '',
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
          <ClinicalTabBar
            tabs={tabs}
            activeIndex={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="flex-1 overflow-y-auto bg-[#f5f5f6] p-6">
            <div className="max-w-2xl mx-auto bg-white border border-[#e5e5e9] rounded-xl p-6">
              {activeTab === 0 && (
                <AnamnesisTab
                  defaultValues={record?.anamnesis}
                  onSave={handleSaveAnamnesis}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 1 && (
                <VisualExamTab
                  defaultValues={record?.visual_exam}
                  onSave={handleSaveVisualExam}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 2 && (
                <DiagnosisTab
                  defaultValues={record?.diagnosis}
                  onSave={handleSaveDiagnosis}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 3 && (
                <PrescriptionTab
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

      {showSignModal && (
        <SignModal onClose={() => setShowSignModal(false)} onConfirm={handleConfirmSign} />
      )}
    </div>
  );
}
