import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import type { DiagnosisInput } from '@/services/clinicalRecordService';
import { DatePicker } from '@/components/ui/date-picker';

interface Props {
  defaultValues?: Partial<DiagnosisInput>;
  onSave: (data: DiagnosisInput) => Promise<void>;
  onBack?: () => void;
  isSaving?: boolean;
}

const FREQUENT = [
  { code: 'H520', desc: 'Hipermetropía' },
  { code: 'H521', desc: 'Miopía simple' },
  { code: 'H522', desc: 'Astigmatismo' },
  { code: 'H523', desc: 'Anisometropía' },
  { code: 'H524', desc: 'Presbicia' },
  { code: 'Z010', desc: 'Rutina' },
  { code: 'H400', desc: 'Glaucoma' },
  { code: 'H041', desc: 'Ojo seco' },
];

const OPTICAL = ['Gafas VL', 'Gafas VP', 'Progresivos', 'Bifocal FT-28', 'Lentes de contacto', 'Sin corrección'];

const DIAG_TYPES = [
  { value: 1 as const, label: '1 — Impresión diagnóstica' },
  { value: 2 as const, label: '2 — Confirmado' },
  { value: 3 as const, label: '3 — Recurrente' },
];

function Cie10Field({ label, code, desc, onCodeChange, onDescChange }: {
  label: string; code: string; desc: string;
  onCodeChange: (v: string) => void; onDescChange: (v: string) => void;
}) {
  const filled = !!code;
  return (
    <div className={`border rounded-[6px] px-3 pt-1.5 pb-2.5 ${filled ? 'border-[#0f8f64] bg-[#e5f6ef]' : 'border-[#e0e0e4] bg-white'}`}>
      <p className={`text-[11px] font-medium mb-1.5 ${filled ? 'text-[#0f8f64]' : 'text-[#7d7d87]'}`}>{label}</p>
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={e => onCodeChange(e.target.value.toUpperCase())}
          placeholder="CIE-10"
          maxLength={10}
          className={`w-16 text-center text-[12px] font-semibold rounded-[4px] px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0f8f64] ${filled ? 'bg-[#0f8f64] text-white' : 'bg-[#f5f5f6] text-[#7d7d87]'}`}
        />
        <input
          value={desc}
          onChange={e => onDescChange(e.target.value)}
          placeholder="Buscar código o descripción..."
          className="flex-1 text-[13px] bg-transparent focus:outline-none text-[#121215] placeholder:text-[#b4b5bc]"
        />
      </div>
    </div>
  );
}

export function DiagnosisTab({ defaultValues, onSave, onBack, isSaving }: Props) {
  const { register, handleSubmit, setValue, watch, control } = useForm<DiagnosisInput>({
    defaultValues: { diagnosis_type: 1, requires_referral: false, ...defaultValues },
  });

  const pc = watch('primary_code') ?? '';
  const pd = watch('primary_description') ?? '';
  const dt = watch('diagnosis_type');
  const optical = watch('optical_correction_plan');
  const r1c = watch('related_1_code') ?? '';
  const r1d = watch('related_1_desc') ?? '';
  const r2c = watch('related_2_code') ?? '';
  const r2d = watch('related_2_desc') ?? '';
  const r3c = watch('related_3_code') ?? '';
  const r3d = watch('related_3_desc') ?? '';

  const onSubmit = async (data: DiagnosisInput) => {
    await onSave({ ...data, diagnosis_type: Number(data.diagnosis_type) as 1 | 2 | 3 });
  };

  const relatedList = [{ code: r1c, desc: r1d }, { code: r2c, desc: r2d }, { code: r3c, desc: r3d }].filter(x => x.code);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">

      {/* Diagnóstico principal */}
      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Diagnóstico principal (obligatorio)</p>
        <hr className="border-[#e5e5e9] mb-3" />
        <Cie10Field
          label="Diagnóstico principal CIE-10 *"
          code={pc} desc={pd}
          onCodeChange={v => setValue('primary_code', v)}
          onDescChange={v => setValue('primary_description', v)}
        />
        <input type="hidden" {...register('primary_code', { required: true })} />
        <input type="hidden" {...register('primary_description', { required: true })} />

        <div className="mt-3">
          <p className="text-[11px] font-medium text-[#121215] mb-2">Tipo de diagnóstico *</p>
          <div className="flex gap-6">
            {DIAG_TYPES.map(t => (
              <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value={t.value} {...register('diagnosis_type', { valueAsNumber: true })} className="accent-[#0f8f64]" />
                <span className="text-[12px] text-[#121215]">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[11px] text-[#7d7d87] mb-2">Diagnósticos frecuentes — óptica</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENT.map(f => {
              const active = pc === f.code;
              return (
                <button key={f.code} type="button"
                  onClick={() => { setValue('primary_code', f.code); setValue('primary_description', f.desc); }}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${active ? 'bg-[#e5f6ef] border-[#0f8f64] text-[#0f8f64] font-semibold' : 'bg-[#f5f5f6] border-[#e0e0e4] text-[#7d7d87] hover:border-[#0f8f64] hover:text-[#0f8f64]'}`}>
                  {f.code} · {f.desc}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Diagnósticos relacionados */}
      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Diagnósticos relacionados (hasta 3, opcionales)</p>
        <hr className="border-[#e5e5e9] mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <Cie10Field label="Relacionado 1 (CIE-10)" code={r1c} desc={r1d} onCodeChange={v => setValue('related_1_code', v)} onDescChange={v => setValue('related_1_desc', v)} />
          <Cie10Field label="Relacionado 2 (CIE-10)" code={r2c} desc={r2d} onCodeChange={v => setValue('related_2_code', v)} onDescChange={v => setValue('related_2_desc', v)} />
          <Cie10Field label="Relacionado 3 (CIE-10)" code={r3c} desc={r3d} onCodeChange={v => setValue('related_3_code', v)} onDescChange={v => setValue('related_3_desc', v)} />
        </div>
        <input type="hidden" {...register('related_1_code')} />
        <input type="hidden" {...register('related_1_desc')} />
        <input type="hidden" {...register('related_2_code')} />
        <input type="hidden" {...register('related_2_desc')} />
        <input type="hidden" {...register('related_3_code')} />
        <input type="hidden" {...register('related_3_desc')} />

        {(pc || relatedList.length > 0) && (
          <div className="mt-3 border border-[#0f8f64] bg-[#e5f6ef] rounded-[8px] p-3">
            <p className="text-[12px] font-semibold text-[#0f8f64] mb-2">Diagnósticos</p>
            <div className="flex flex-wrap gap-2">
              {pc && (
                <div className="border-[1.5px] border-[#0f8f64] rounded-[6px] px-3 py-2 flex items-start gap-2 bg-[#e5f6ef] min-w-0">
                  <span className="bg-[#0f8f64] text-white text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0">{pc}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#121215]">{pd}</p>
                    <div className="flex gap-1 mt-0.5">
                      <span className="bg-[#f5f5f6] text-[#7d7d87] text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5">
                        {DIAG_TYPES.find(t => t.value === Number(dt))?.label.split(' — ')[1] ?? 'Impresión'}
                      </span>
                      <span className="bg-[#0f8f64] text-white text-[10px] font-semibold rounded-full px-2 py-0.5">Principal</span>
                    </div>
                  </div>
                </div>
              )}
              {relatedList.map(x => (
                <div key={x.code} className="border border-[#e0e0e4] bg-[#f5f5f6] rounded-[6px] px-3 py-2 flex items-start gap-2">
                  <span className="bg-[#121215] text-white text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0">{x.code}</span>
                  <p className="text-[12px] font-semibold text-[#121215]">{x.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan de atención */}
      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Plan de atención</p>
        <hr className="border-[#e5e5e9] mb-3" />

        <div className="mb-4">
          <p className="text-[11px] font-medium text-[#121215] mb-2">Corrección óptica indicada</p>
          <div className="flex flex-wrap gap-2">
            {OPTICAL.map(opt => {
              const active = optical === opt;
              return (
                <button key={opt} type="button"
                  onClick={() => setValue('optical_correction_plan', active ? '' : opt)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${active ? 'bg-[#e5f6ef] border-[#0f8f64] text-[#0f8f64] font-semibold' : 'bg-[#f5f5f6] border-[#e0e0e4] text-[#7d7d87] hover:border-[#0f8f64] hover:text-[#0f8f64]'}`}>
                  {opt}
                </button>
              );
            })}
          </div>
          <input type="hidden" {...register('optical_correction_plan')} />
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
                  onChange={d => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
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
              {...register('requires_referral', { setValueAs: v => v === 'true' || v === true })}
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

      {/* Navegación */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack}
          className="border border-[#e0e0e4] bg-white text-[#121215] h-9 px-5 rounded-[6px] text-[13px] font-semibold hover:bg-[#f5f5f6] transition-colors">
          ← Examen Visual
        </button>
        <button type="submit" disabled={isSaving}
          className="bg-[#0f8f64] text-white h-9 px-6 rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] transition-colors disabled:opacity-50">
          {isSaving ? 'Guardando...' : 'Siguiente: Fórmula Óptica →'}
        </button>
      </div>
    </form>
  );
}
