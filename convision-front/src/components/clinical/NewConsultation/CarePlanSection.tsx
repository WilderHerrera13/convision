import { Controller, type Control, type UseFormRegister } from 'react-hook-form';
import { format } from 'date-fns';
import type { DiagnosisInput } from '@/services/clinicalRecordService';
import { DatePicker } from '@/components/ui/date-picker';

const OPTICAL = ['Gafas VL', 'Gafas VP', 'Progresivos', 'Bifocal FT-28', 'Lentes de contacto', 'Sin corrección'];

interface Props {
  register: UseFormRegister<DiagnosisInput>;
  control: Control<DiagnosisInput>;
  optical?: string;
  onSelectOptical: (value: string) => void;
}

export function CarePlanSection({ register, control, optical, onSelectOptical }: Props) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-[#121215] mb-1">Plan de atención</p>
      <hr className="border-[#e5e5e9] mb-3" />

      <div className="mb-4">
        <p className="text-[11px] font-medium text-[#121215] mb-2">Corrección óptica indicada</p>
        <div className="flex flex-wrap gap-2">
          {OPTICAL.map((opt) => {
            const active = optical === opt;
            return (
              <button key={opt} type="button"
                onClick={() => onSelectOptical(active ? '' : opt)}
                className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${active ? 'bg-[#e5f6ef] border-[#0f8f64] text-[#0f8f64] font-semibold' : 'bg-[#f5f5f6] border-[#e0e0e4] text-[#7d7d87] hover:border-[#0f8f64] hover:text-[#0f8f64]'}`}>
                {opt}
              </button>
            );
          })}
        </div>
        <input type="hidden" {...register('optical_correction_plan')} value={optical ?? ''} readOnly />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Recomendaciones y educación al paciente</label>
        <textarea
          {...register('patient_education')}
          rows={3}
          placeholder="Indicaciones, contraindicaciones u observaciones..."
          className="w-full border border-[#e0e0e4] rounded-[6px] px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none placeholder:text-[#b4b5bc]"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Próximo control sugerido</p>
          <Controller
            control={control}
            name="next_control_date"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Seleccionar fecha"
                useInputTrigger
                minDate={new Date()}
              />
            )}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Motivo del control</label>
          <select
            {...register('next_control_reason')}
            className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white"
          >
            <option value="">Seleccionar</option>
            <option value="Control rutina">Control rutina</option>
            <option value="Seguimiento">Seguimiento</option>
            <option value="Urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#121215] mb-1.5">¿Requiere remisión a Oftalmología?</label>
          <select
            {...register('requires_referral', { setValueAs: (v) => v === 'true' || v === true })}
            className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white"
          >
            <option value="false">No — manejo en optometría</option>
            <option value="true">Sí — remitir</option>
          </select>
        </div>
      </div>

      <div className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[6px] px-3 py-2 text-[11px] text-[#7d7d87]">
        CIE-11 (preparación migración — Res. 1442/2024)
      </div>
    </div>
  );
}
