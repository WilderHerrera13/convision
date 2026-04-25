import { useFormContext, Controller } from 'react-hook-form';
import type { AnamnesisFormData } from './AnamnesisTab';

const OTHER_CONDITIONS = ['Autoinmune', 'Oncológica', 'Neurológica', 'Renal / hepática', 'Tiroides'];

const inputCls = 'w-full border border-[#e0e0e4] rounded-[6px] px-3 h-9 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]';
const selectCls = `${inputCls} bg-[#f5f5f6] text-[#7d7d87]`;

export function AnamnesisSection2() {
  const { register, control, watch } = useFormContext<AnamnesisFormData>();
  const otherConditions = watch('other_systemic_conditions') ?? [];

  return (
    <div className="mt-6">
      <p className="text-[13px] font-semibold text-[#121215]">2. Antecedentes personales sistémicos</p>
      <div className="h-px bg-[#e5e5e9] my-3" />

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Diabetes mellitus</p>
          <Controller
            name="has_diabetes"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectCls}>
                <option value="">Sí / No</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            )}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Año diagnóstico</p>
          <input {...register('diabetes_diagnosis_year')} className={inputCls} placeholder="Ej: 2018" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Control HbA1c</p>
          <input {...register('diabetes_hba1c')} className={inputCls} placeholder="Ej: 6.5%" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Hipertensión arterial</p>
          <Controller
            name="has_hypertension"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectCls}>
                <option value="">Sí / No</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            )}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Año diagnóstico</p>
          <input {...register('hypertension_diagnosis_year')} className={inputCls} placeholder="Ej: 2015" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Medicación</p>
          <input {...register('hypertension_medication')} className={inputCls} placeholder="Nombre del medicamento" />
        </div>
      </div>

      <div className="mb-3">
        <p className="text-[11px] font-medium text-[#121215] mb-1.5">Alergias (medicamento / ambiental)</p>
        <input {...register('allergies')} className={inputCls} />
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-[11px] font-medium text-[#121215]">Medicamentos actuales</p>
          <span className="bg-[#e5f6ef] text-[#0f8f64] text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px]">CUM INVIMA</span>
        </div>
        <input {...register('current_medications')} className={inputCls} />
      </div>

      <div>
        <p className="text-[11px] font-medium text-[#7d7d87] mb-2">Otras condiciones sistémicas</p>
        <Controller
          name="other_systemic_conditions"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-4">
              {OTHER_CONDITIONS.map(cond => {
                const checked = (field.value ?? []).includes(cond);
                return (
                  <label key={cond} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
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
      </div>
    </div>
  );
}
