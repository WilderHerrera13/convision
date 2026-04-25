import { useFormContext, Controller } from 'react-hook-form';
import type { AnamnesisFormData } from './AnamnesisTab';

const SYMPTOMS = ['Cefalea', 'Epífora', 'Fotofobia', 'Diplopía', 'Visión borrosa', 'Dolor ocular', 'Halos', 'C. extraño'];

export function AnamnesisSection1() {
  const { register, control, watch, formState: { errors } } = useFormContext<AnamnesisFormData>();
  const symptoms = watch('associated_symptoms') ?? [];

  return (
    <div>
      <p className="text-[13px] font-semibold text-[#121215]">1. Motivo de consulta y enfermedad actual</p>
      <div className="h-px bg-[#e5e5e9] my-3" />

      <p className="text-[11px] font-medium text-[#121215] mb-1.5">Motivo principal *</p>
      <textarea
        {...register('reason_for_visit')}
        rows={3}
        className="w-full border border-[#e0e0e4] rounded-[6px] px-3 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none"
      />
      {errors.reason_for_visit && (
        <p className="text-[11px] text-[#b82626] mt-1">{errors.reason_for_visit.message}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Inicio</p>
          <input
            {...register('onset')}
            className="w-full border border-[#e0e0e4] rounded-[6px] px-3 h-9 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Duración / evolución</p>
          <input
            {...register('duration')}
            className="w-full border border-[#e0e0e4] rounded-[6px] px-3 h-9 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#121215] mb-1.5">Carácter</p>
          <Controller
            name="character"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full border border-[#e0e0e4] rounded-[6px] px-3 h-9 text-[12px] text-[#7d7d87] bg-[#f5f5f6] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
              >
                <option value="">Continua / Intermitente / Progresiva</option>
                <option value="continua">Continua</option>
                <option value="intermitente">Intermitente</option>
                <option value="progresiva">Progresiva</option>
              </select>
            )}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-medium text-[#121215] mb-2">Síntomas asociados</p>
        <Controller
          name="associated_symptoms"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map(s => {
                const active = (field.value ?? []).includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const current = field.value ?? [];
                      field.onChange(active ? current.filter(x => x !== s) : [...current, s]);
                    }}
                    className={`h-6 px-3 rounded-full text-[11px] border transition-colors ${
                      active
                        ? 'bg-[#e5f6ef] border-[#0f8f64] text-[#0f8f64] font-medium'
                        : 'bg-[#f5f5f6] border-[#e0e0e4] text-[#7d7d87]'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
