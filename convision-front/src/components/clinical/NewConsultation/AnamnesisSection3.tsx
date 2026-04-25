import { useFormContext, Controller } from 'react-hook-form';
import type { AnamnesisFormData } from './AnamnesisTab';

const inputCls = 'w-full border border-[#e0e0e4] rounded-[6px] px-3 h-9 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]';
const selectCls = `${inputCls} bg-[#f5f5f6] text-[#7d7d87]`;

export function AnamnesisSection3() {
  const { register, control } = useFormContext<AnamnesisFormData>();

  return (
    <div className="mt-6">
      <p className="text-[13px] font-semibold text-[#121215]">3. Antecedentes oculares</p>
      <div className="h-px bg-[#e5e5e9] my-3" />

      <div className="mb-3">
        <p className="text-[11px] font-medium text-[#121215] mb-1.5">Cirugías oculares previas (tipo · fecha · ojo)</p>
        <input {...register('previous_eye_surgeries')} className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Uso actual de lentes</p>
          <Controller
            name="lens_use"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectCls}>
                <option value="">Sí / No / Primera vez</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
                <option value="primera_vez">Primera vez</option>
              </select>
            )}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Tipo de corrección</p>
          <Controller
            name="correction_type"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectCls}>
                <option value="">Monofocal / Bifocal / Progresivo</option>
                <option value="monofocal">Monofocal</option>
                <option value="bifocal">Bifocal</option>
                <option value="progresivo">Progresivo</option>
                <option value="lc">Lentes de contacto</option>
              </select>
            )}
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Satisfacción actual</p>
          <Controller
            name="lens_satisfaction"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectCls}>
                <option value="">Confortable / Regular / Molesta</option>
                <option value="confortable">Confortable</option>
                <option value="regular">Regular</option>
                <option value="molesta">Molesta</option>
              </select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Trauma ocular previo</p>
          <input {...register('previous_ocular_trauma')} className={inputCls} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Patologías oculares previas — CIE-10</p>
          <input {...register('previous_ocular_pathologies')} className={inputCls} />
        </div>
      </div>
    </div>
  );
}
