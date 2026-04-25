import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAppointmentById } from '@/services/appointmentService';
import {
  createClinicalRecord,
  getClinicalRecord,
  upsertVisualExam,
  upsertFollowUpAnamnesis,
  upsertFollowUpEvolution,
  upsertFollowUpFormula,
  getPreviousClinicalRecord,
  type FollowUpAnamnesisInput,
  type FollowUpEvolutionInput,
  type FollowUpFormulaInput,
  type VisualExamInput,
  type ClinicalRecord,
} from '@/services/clinicalRecordService';
import { ClinicalAsidePanel } from '@/components/clinical/ClinicalAsidePanel';
import { ClinicalTabBar } from '@/components/clinical/ClinicalTabBar';
import { FollowUpAnamnesisTab } from '@/components/clinical/FollowUp/FollowUpAnamnesisTab';
import { ComparativeExamTab } from '@/components/clinical/FollowUp/ComparativeExamTab';
import { DiagnosticEvolutionTab } from '@/components/clinical/FollowUp/DiagnosticEvolutionTab';
import { UpdateFormulaTab } from '@/components/clinical/FollowUp/UpdateFormulaTab';

const TAB_LABELS = ['Anamnesis Control', 'Examen Comparativo', 'Evolución Diagnóstica', 'Actualizar Fórmula'];

function SignModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold text-[#0f0f12] mb-2">Firmar control</h2>
        <p className="text-sm text-[#7d7d87] mb-4">
          Al firmar, se completará el control y se actualizará la fórmula óptica como documento legal.
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
            Cerrar control
          </button>
        </div>
      </div>
    </div>
  );
}

function isExpiringWithin30Days(validUntil?: string): boolean {
  if (!validUntil) return false;
  const diff = new Date(validUntil).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

export default function ClinicalHistoryFollowUpPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apptId = parseInt(id || '0');

  const [activeTab, setActiveTab] = useState(0);
  const [stepsCompleted, setStepsCompleted] = useState([false, false, false, false]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [previousRecord, setPreviousRecord] = useState<ClinicalRecord | null>(null);

  const { data: appt } = useQuery({
    queryKey: ['appointment', apptId],
    queryFn: () => getAppointmentById(apptId).then(r => r.data),
    enabled: apptId > 0,
  });

  useQuery({
    queryKey: ['clinical-record-followup', apptId],
    queryFn: async () => {
      try {
        const res = await getClinicalRecord(apptId);
        setRecord(res.data);
        return res.data;
      } catch {
        const created = await createClinicalRecord(apptId, 'follow_up');
        setRecord(created.data);
        return created.data;
      }
    },
    enabled: apptId > 0,
  });

  useQuery({
    queryKey: ['previous-clinical-record', apptId, appt?.patient?.id],
    queryFn: async () => {
      if (!appt?.patient?.id) return null;
      try {
        const res = await getPreviousClinicalRecord(appt.patient.id, apptId);
        setPreviousRecord(res.data);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: apptId > 0 && !!appt?.patient?.id,
  });

  const markCompleted = useCallback((tabIndex: number) => {
    setStepsCompleted(prev => {
      const next = [...prev];
      next[tabIndex] = true;
      return next;
    });
  }, []);

  const handleSaveAnamnesis = async (data: FollowUpAnamnesisInput) => {
    setIsSaving(true);
    try {
      await upsertFollowUpAnamnesis(apptId, data);
      markCompleted(0);
      setActiveTab(1);
    } finally { setIsSaving(false); }
  };

  const handleSaveVisualExam = async (data: VisualExamInput) => {
    setIsSaving(true);
    try {
      await upsertVisualExam(apptId, data);
      markCompleted(1);
      setActiveTab(2);
    } finally { setIsSaving(false); }
  };

  const handleSaveEvolution = async (data: FollowUpEvolutionInput) => {
    setIsSaving(true);
    try {
      await upsertFollowUpEvolution(apptId, data);
      markCompleted(2);
      setActiveTab(3);
    } finally { setIsSaving(false); }
  };

  const handleSaveFormula = async (data: FollowUpFormulaInput) => {
    setIsSaving(true);
    try {
      await upsertFollowUpFormula(apptId, data);
      markCompleted(3);
    } finally { setIsSaving(false); }
  };

  const handleSign = () => setShowSignModal(true);
  const handleConfirmSign = () => {
    setShowSignModal(false);
    navigate('/specialist/appointments');
  };

  const patient = appt?.patient;
  const patientInfo = { name: patient?.full_name || 'Paciente', id_number: patient?.id_number || '', age: 0 };

  const prevPrescription = previousRecord?.prescription;
  const prevValidUntil = prevPrescription?.valid_until;
  const currentFormula = prevPrescription
    ? {
        od: prevPrescription.sph_od != null ? `${prevPrescription.sph_od >= 0 ? '+' : ''}${prevPrescription.sph_od}` : '—',
        oi: prevPrescription.sph_oi != null ? `${prevPrescription.sph_oi >= 0 ? '+' : ''}${prevPrescription.sph_oi}` : '—',
        valid_until: prevValidUntil ? new Date(prevValidUntil).toLocaleDateString('es-CO') : 'Sin fecha',
        is_expiring: isExpiringWithin30Days(prevValidUntil),
      }
    : undefined;

  const prevDiagnosis = previousRecord?.diagnosis;
  const activeDiagnoses = prevDiagnosis
    ? [{ code: prevDiagnosis.primary_code, description: prevDiagnosis.primary_description, type: 1 }]
    : [];

  const tabs = TAB_LABELS.map((label, i) => ({ label, completed: stepsCompleted[i] }));

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex flex-1 overflow-hidden">
        <ClinicalAsidePanel
          patient={patientInfo}
          currentFormula={currentFormula}
          activeDiagnosis={prevDiagnosis ? { code: prevDiagnosis.primary_code, description: prevDiagnosis.primary_description } : undefined}
          currentStep={activeTab + 1}
          totalSteps={4}
          legalNote="Res. 1995/1999 | CUPS: 890307 — Control Optometría"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ClinicalTabBar tabs={tabs} activeIndex={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 overflow-y-auto bg-[#f5f5f6] p-6">
            <div className="max-w-2xl mx-auto bg-white border border-[#e5e5e9] rounded-xl p-6">
              {activeTab === 0 && (
                <FollowUpAnamnesisTab
                  defaultValues={record?.anamnesis as unknown as FollowUpAnamnesisInput}
                  onSave={handleSaveAnamnesis}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 1 && (
                <ComparativeExamTab
                  previousExam={previousRecord?.visual_exam}
                  defaultValues={record?.visual_exam}
                  onSave={handleSaveVisualExam}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 2 && (
                <DiagnosticEvolutionTab
                  activeDiagnoses={activeDiagnoses}
                  onSave={handleSaveEvolution}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 3 && (
                <UpdateFormulaTab
                  previousPrescription={prevPrescription}
                  primaryDiagnosisCode={prevDiagnosis?.primary_code}
                  onSave={handleSaveFormula}
                  onSign={handleSign}
                  isSaving={isSaving}
                />
              )}
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-[#e5e5e9] bg-white px-6 py-3">
            <p className="text-xs text-[#7d7d87]">
              Res. 1995/1999 — Historia Clínica Obligatoria | CUPS: 890307 | Ley 650/2001 Art. 24 — Control Optometría
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
