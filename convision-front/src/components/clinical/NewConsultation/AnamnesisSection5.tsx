import { useFormContext } from 'react-hook-form';
import type { AnamnesisFormData } from './AnamnesisTab';

interface DrugFlag {
  field: keyof AnamnesisFormData;
  label: string;
  risk: string;
  level: 'red' | 'yellow';
}

const DRUG_FLAGS: DrugFlag[] = [
  { field: 'takes_corticosteroids',    label: 'Corticoides sistémicos',    risk: 'Riesgo glaucoma + catarata',          level: 'red'    },
  { field: 'takes_hydroxychloroquine', label: 'Hidroxicloroquina',          risk: 'Riesgo retinopatía por cloroquina',   level: 'red'    },
  { field: 'takes_tamsulosin',         label: 'Tamsulosina / α-bloqueantes', risk: 'Síndrome iris flácido (si cirugía)', level: 'red'    },
  { field: 'takes_antihistamines',     label: 'Antihistamínicos',           risk: 'Resequedad ocular',                   level: 'yellow' },
  { field: 'takes_antihypertensives',  label: 'Antihipertensivos',          risk: 'Presión intraocular baja',            level: 'yellow' },
  { field: 'takes_amiodarone',         label: 'Amiodarona',                 risk: 'Depósitos corneales',                 level: 'yellow' },
];

export function AnamnesisSection5() {
  const { register } = useFormContext<AnamnesisFormData>();

  return (
    <div className="mt-6">
      <p className="text-[13px] font-semibold text-[#121215]">5. Antecedentes farmacológicos con impacto ocular</p>
      <div className="h-px bg-[#e5e5e9] my-3" />

      <div className="bg-[#fff6e3] border border-[#b57218] rounded-[4px] px-3 py-2 mb-3">
        <p className="text-[10px] text-[#b57218]">
          Banderas rojas: estos fármacos tienen impacto ocular documentado. Marca los que el paciente usa actualmente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {DRUG_FLAGS.map(({ field, label, risk, level }) => (
          <label
            key={field}
            className={`flex items-center gap-3 px-3 h-9 rounded-[6px] border cursor-pointer ${
              level === 'red'
                ? 'bg-[#ffeeed] border-[#b82626]'
                : 'bg-[#fff6e3] border-[#b57218]'
            }`}
          >
            <input
              type="checkbox"
              readOnly={false}
              aria-readonly={false}
              {...register(field)}
              className="w-3 h-3 border border-[#e0e0e4] rounded-sm accent-[#0f8f64] shrink-0"
            />
            <span className="text-[12px] font-semibold text-[#121215] flex-1">{label}</span>
            <span className={`text-[11px] ${level === 'red' ? 'text-[#b82626]' : 'text-[#b57218]'}`}>
              {risk}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
