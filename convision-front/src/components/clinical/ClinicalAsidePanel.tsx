interface PatientInfo {
  name: string;
  id_number: string;
  age: number;
  avatar_url?: string;
}

interface CurrentFormula {
  od: string;
  oi: string;
  valid_until: string;
  is_expiring: boolean;
}

interface ActiveDiagnosis {
  code: string;
  description: string;
}

interface ClinicalAsidePanelProps {
  patient: PatientInfo;
  currentFormula?: CurrentFormula;
  activeDiagnosis?: ActiveDiagnosis;
  currentStep: number;
  totalSteps: number;
  legalNote?: string;
  tipText?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

export function ClinicalAsidePanel({
  patient,
  currentFormula,
  activeDiagnosis,
  currentStep,
  totalSteps,
  legalNote,
  tipText,
}: ClinicalAsidePanelProps) {
  return (
    <div className="bg-white border border-[#e5e5e9] rounded-xl p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        {patient.avatar_url ? (
          <img src={patient.avatar_url} alt={patient.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#e5f6ef] text-[#0f8f64] flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {getInitials(patient.name)}
          </div>
        )}
        <div>
          <p className="font-semibold text-[#0f0f12] text-sm leading-tight">{patient.name}</p>
          <p className="text-xs text-[#7d7d87]">{patient.id_number}</p>
          <p className="text-xs text-[#7d7d87]">{patient.age} años</p>
        </div>
      </div>

      {currentFormula && (
        <div className="bg-[#e5f6ef] border border-[#effcf5] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#0f8f64] mb-1">Fórmula vigente</p>
          <p className="text-xs text-[#0f0f12]">OD: {currentFormula.od}</p>
          <p className="text-xs text-[#0f0f12]">OI: {currentFormula.oi}</p>
          <p className="text-xs text-[#7d7d87] mt-1">Válida hasta: {currentFormula.valid_until}</p>
          {currentFormula.is_expiring && (
            <div className="mt-2 bg-[#fff6e3] border border-[#f0e0b0] rounded px-2 py-1">
              <p className="text-xs text-[#b57218]">Fórmula próxima a vencer</p>
            </div>
          )}
        </div>
      )}

      {activeDiagnosis && (
        <div>
          <p className="text-xs font-semibold text-[#7d7d87] mb-1">DX ACTIVO</p>
          <span className="bg-[#eff1ff] text-[#3a71f7] rounded px-2 py-0.5 text-xs font-mono">
            {activeDiagnosis.code}
          </span>
          <p className="text-xs text-[#0f0f12] mt-1">{activeDiagnosis.description}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-[#7d7d87] mb-2">PROGRESO</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < currentStep ? 'bg-[#0f8f64]' : i === currentStep - 1 ? 'bg-[#0f8f64]' : 'bg-[#e5e5e9]'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[#0f0f12]">Paso {currentStep} de {totalSteps}</p>
        </div>
      </div>

      {tipText && (
        <div className="border-l-4 border-[#0f8f64] bg-white p-3 text-sm text-[#0f0f12] rounded-r">
          <p className="text-xs font-semibold text-[#0f8f64] mb-1">Consejo</p>
          <p className="text-xs">{tipText}</p>
        </div>
      )}

      <div className="mt-auto">
        <p className="text-xs text-[#7d7d87]">
          {legalNote || 'Res. 1995/1999 · Ley 650/2001 Art. 24 · RIPS Res. 2275/2023'}
        </p>
      </div>
    </div>
  );
}
