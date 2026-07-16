import { useForm } from 'react-hook-form';
import type { DiagnosisInput } from '@/services/clinicalRecordService';
import { Icd10ComboboxField } from './Icd10ComboboxField';
import { DiagnosisSummaryPanel } from './DiagnosisSummaryPanel';
import { CarePlanSection } from './CarePlanSection';

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

const DIAG_TYPES = [
  { value: 1 as const, label: '1 — Impresión diagnóstica' },
  { value: 2 as const, label: '2 — Confirmado' },
  { value: 3 as const, label: '3 — Recurrente' },
];

export function DiagnosisTab({ defaultValues, onSave, onBack, isSaving }: Props) {
  const { register, handleSubmit, setValue, watch, control } = useForm<DiagnosisInput>({
    defaultValues: { diagnosis_type: 1, requires_referral: false, ...defaultValues },
  });

  const pc = watch('primary_code') ?? '';
  const pd = watch('primary_description') ?? '';
  const dt = watch('diagnosis_type');
  const optical = watch('optical_correction_plan');
  const setForm = (name: 'primary_code' | 'primary_description' | 'optical_correction_plan' | 'related_1_code' | 'related_1_desc' | 'related_2_code' | 'related_2_desc' | 'related_3_code' | 'related_3_desc', value: string) => {
    setValue(name, value, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
  };
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
        <Icd10ComboboxField
          label="Diagnóstico principal CIE-10 *"
          code={pc} desc={pd}
          onSelect={(code, desc) => { setForm('primary_code', code); setForm('primary_description', desc); }}
          onClear={() => { setForm('primary_code', ''); setForm('primary_description', ''); }}
        />
        <input type="hidden" {...register('primary_code', { required: true })} value={pc} readOnly />
        <input type="hidden" {...register('primary_description', { required: true })} value={pd} readOnly />

        <div className="mt-3">
          <p className="text-[11px] font-medium text-[#121215] mb-2">Tipo de diagnóstico *</p>
          <div className="flex gap-6">
            {DIAG_TYPES.map(t => (
              <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="diagnosis_type"
                  value={t.value}
                  checked={Number(dt) === t.value}
                  onChange={() => setValue('diagnosis_type', t.value, { shouldDirty: true, shouldValidate: true, shouldTouch: true })}
                  className="accent-[#0f8f64]"
                />
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
                  onClick={() => { setForm('primary_code', f.code); setForm('primary_description', f.desc); }}
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
          <Icd10ComboboxField label="Relacionado 1 (CIE-10)" code={r1c} desc={r1d}
            onSelect={(code, desc) => { setForm('related_1_code', code); setForm('related_1_desc', desc); }}
            onClear={() => { setForm('related_1_code', ''); setForm('related_1_desc', ''); }} />
          <Icd10ComboboxField label="Relacionado 2 (CIE-10)" code={r2c} desc={r2d}
            onSelect={(code, desc) => { setForm('related_2_code', code); setForm('related_2_desc', desc); }}
            onClear={() => { setForm('related_2_code', ''); setForm('related_2_desc', ''); }} />
          <Icd10ComboboxField label="Relacionado 3 (CIE-10)" code={r3c} desc={r3d}
            onSelect={(code, desc) => { setForm('related_3_code', code); setForm('related_3_desc', desc); }}
            onClear={() => { setForm('related_3_code', ''); setForm('related_3_desc', ''); }} />
        </div>
        <input type="hidden" {...register('related_1_code')} />
        <input type="hidden" {...register('related_1_desc')} />
        <input type="hidden" {...register('related_2_code')} />
        <input type="hidden" {...register('related_2_desc')} />
        <input type="hidden" {...register('related_3_code')} />
        <input type="hidden" {...register('related_3_desc')} />

        <DiagnosisSummaryPanel
          primaryCode={pc}
          primaryDesc={pd}
          diagnosisTypeLabel={DIAG_TYPES.find(t => t.value === Number(dt))?.label.split(' — ')[1] ?? 'Impresión'}
          relatedList={relatedList}
        />
      </div>

      <CarePlanSection
        register={register}
        control={control}
        optical={optical}
        onSelectOptical={(value) => setForm('optical_correction_plan', value)}
      />

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
