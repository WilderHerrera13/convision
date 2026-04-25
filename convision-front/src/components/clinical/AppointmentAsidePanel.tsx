import type { Appointment } from '@/services/appointmentService';
import type { ClinicalRecord } from '@/services/clinicalRecordService';

const STEP_LABELS = ['Anamnesis', 'Examen Visual', 'Diagnóstico', 'Prescripción'];
const STEP_TIPS = [
  'Registra el motivo y los antecedentes. Esta información guía el examen clínico posterior.',
  'Registra la agudeza visual, refracción objetiva y subjetiva del paciente.',
  'Selecciona el diagnóstico CIE-10 principal y completa el plan de atención.',
  'Completa la fórmula óptica. Los valores se pre-llenan desde el examen subjetivo.',
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

interface Props {
  appt: Appointment;
  record: ClinicalRecord | null;
  activeStep: number;
}

export function AppointmentAsidePanel({ appt, record, activeStep }: Props) {
  const patientName = appt.patient?.full_name
    || (appt.patient?.first_name && appt.patient?.last_name
        ? `${appt.patient.first_name} ${appt.patient.last_name}`
        : 'Paciente');
  const initials = getInitials(patientName);
  const anamnesis = record?.anamnesis;

  const lastRx = appt.prescription;
  const stepLabel = STEP_LABELS[activeStep] ?? STEP_LABELS[0];
  const stepTip = STEP_TIPS[activeStep] ?? STEP_TIPS[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
        <div className="flex flex-col items-center pt-5 pb-0 px-5">
          <div className="w-[50px] h-[50px] rounded-full bg-[#e5f6ef] flex items-center justify-center mb-3">
            <span className="text-[15px] font-semibold text-[#0f8f64]">{initials}</span>
          </div>
          <p className="text-[14px] font-semibold text-[#0f0f12] text-center">{patientName}</p>
          {appt.patient && (
            <p className="text-[12px] text-[#7d7d87] text-center mt-0.5">
              {[
                (appt.patient as { gender?: string }).gender === 'M' ? 'Masculino' :
                (appt.patient as { gender?: string }).gender === 'F' ? 'Femenino' : null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          <span className="mt-2 mb-5 bg-[#e5f6ef] text-[#0f8f64] text-[11px] font-semibold px-3 py-0.5 rounded-full">
            Paciente activo
          </span>
        </div>

        <div className="h-px bg-[#e5e5e9]" />

        {lastRx ? (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-[#b4b5bc] tracking-[0.6px] uppercase mb-2">Última Fórmula</p>
            <p className="text-[12px] font-semibold text-[#0f0f12]">Receta disponible</p>
          </div>
        ) : anamnesis?.correction_type ? (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-[#b4b5bc] tracking-[0.6px] uppercase mb-2">Corrección actual</p>
            <p className="text-[12px] font-semibold text-[#0f0f12] capitalize">{anamnesis.correction_type}</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-[#b4b5bc] tracking-[0.6px] uppercase mb-2">Última Fórmula</p>
            <p className="text-[12px] text-[#7d7d87]">Sin fórmula previa</p>
          </div>
        )}

        <div className="h-px bg-[#e5e5e9]" />

        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-[#b4b5bc] tracking-[0.6px] uppercase mb-1">Paso actual</p>
          <p className="text-[12px] font-semibold text-[#0f8f64]">
            {activeStep + 1} de 4 — {stepLabel}
          </p>
        </div>
      </div>

      <div className="bg-[#e5f6ef] border border-[#0f8f64] rounded-[8px] p-4">
        <p className="text-[13px] font-semibold text-[#0f8f64] mb-1.5">
          {activeStep + 1} de 4 — {stepLabel}
        </p>
        <p className="text-[12px] text-[#0f8f64] leading-relaxed">{stepTip}</p>
      </div>
    </div>
  );
}
