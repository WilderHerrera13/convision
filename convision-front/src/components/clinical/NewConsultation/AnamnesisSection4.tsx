import { useFormContext, Controller } from 'react-hook-form';
import type { AnamnesisFormData } from './AnamnesisTab';

const FAMILY_CONDITIONS = ['Glaucoma', 'Diabetes', 'Miopía alta', 'DMAE', 'Cataratas', 'Estrabismo', 'Retinitis'];

const inputCls = 'w-full border border-[#e0e0e4] rounded-[6px] px-3 h-9 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]';

export function AnamnesisSection4() {
  const { register, control } = useFormContext<AnamnesisFormData>();

  return (
    <div className="mt-6">
      <p className="text-[13px] font-semibold text-[#121215]">4. Antecedentes familiares oftálmicos</p>
      <div className="h-px bg-[#e5e5e9] my-3" />

      <Controller
        name="family_ophthalmic_conditions"
        control={control}
        render={({ field }) => (
          <div className="flex flex-wrap gap-4 mb-4">
            {FAMILY_CONDITIONS.map(cond => {
              const checked = (field.value ?? []).includes(cond);
              return (
                <label key={cond} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    readOnly={false}
                    aria-readonly={false}
                    checked={checked}
                    onChange={() => {
                      const current = field.value ?? [];
                      field.onChange(checked ? current.filter(x => x !== cond) : [...current, cond]);
                    }}
                    className="w-3 h-3 border border-[#e0e0e4] rounded-sm accent-[#0f8f64]"
                  />
                  <span className="text-[12px] text-[#121215]">{cond}</span>
                </label>
              );
            })}
          </div>
        )}
      />

      <div>
        <p className="text-[11px] font-medium text-[#121215] mb-1.5">Observaciones familiares</p>
        <input {...register('family_observations')} className={inputCls} />
      </div>
    </div>
  );
}
