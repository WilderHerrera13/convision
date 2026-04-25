import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { DiagnosisInput } from '@/services/clinicalRecordService';

interface RelatedDiagnosis {
  code: string;
  desc: string;
}

interface DiagnosisTabProps {
  defaultValues?: Partial<DiagnosisInput>;
  onSave: (data: DiagnosisInput) => Promise<void>;
  isSaving?: boolean;
}

export function DiagnosisTab({ defaultValues, onSave, isSaving }: DiagnosisTabProps) {
  const { register, handleSubmit, watch } = useForm<DiagnosisInput>({
    defaultValues: { diagnosis_type: 1, ...defaultValues },
  });

  const [related, setRelated] = useState<RelatedDiagnosis[]>([]);

  const primaryCode = watch('primary_code') || '';
  const diagnosisType = watch('diagnosis_type');

  const diagnosisTypeLabel = (t: number | undefined) => {
    if (t === 1) return 'Impresión diagnóstica';
    if (t === 2) return 'Diagnóstico confirmado';
    return 'Diagnóstico recurrente';
  };

  const requiresReferral = watch('requires_referral');

  const addRelated = () => {
    if (related.length < 3) setRelated(prev => [...prev, { code: '', desc: '' }]);
  };

  const removeRelated = (i: number) => {
    setRelated(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateRelated = (i: number, field: 'code' | 'desc', value: string) => {
    setRelated(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const onSubmit = async (data: DiagnosisInput) => {
    const payload: DiagnosisInput = {
      ...data,
      related_1_code: related[0]?.code,
      related_1_desc: related[0]?.desc,
      related_2_code: related[1]?.code,
      related_2_desc: related[1]?.desc,
      related_3_code: related[2]?.code,
      related_3_desc: related[2]?.desc,
      cups: '890205',
    };
    await onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Diagnóstico Principal</p>
        <div className="flex gap-3 mb-3">
          <div className="w-28">
            <label className="block text-xs text-[#7d7d87] mb-1">Código CIE-10 *</label>
            <input
              {...register('primary_code', { required: true })}
              className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
              placeholder="H52.1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[#7d7d87] mb-1">Descripción *</label>
            <input
              {...register('primary_description', { required: true })}
              className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
              placeholder="Descripción del diagnóstico"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#7d7d87] mb-2">Tipo de diagnóstico</label>
          <div className="flex gap-4">
            {([1, 2, 3] as const).map(t => (
              <label key={t} className={`flex items-center gap-2 text-sm cursor-pointer border rounded-lg px-3 py-1.5 ${Number(diagnosisType) === t ? 'border-[#0f8f64] bg-[#e5f6ef]' : 'border-[#e5e5e9]'}`}>
                <input type="radio" {...register('diagnosis_type')} value={t} className="accent-[#0f8f64]" />
                {diagnosisTypeLabel(t)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Diagnósticos Relacionados</p>
        <div className="space-y-2">
          {related.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={r.code}
                onChange={e => updateRelated(i, 'code', e.target.value)}
                className="w-24 border border-[#e5e5e9] rounded-lg p-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
                placeholder="Código"
              />
              <input
                value={r.desc}
                onChange={e => updateRelated(i, 'desc', e.target.value)}
                className="flex-1 border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
                placeholder="Descripción"
              />
              <button type="button" onClick={() => removeRelated(i)} className="text-red-400 text-sm px-2">✕</button>
            </div>
          ))}
        </div>
        {related.length < 3 && (
          <button type="button" onClick={addRelated} className="mt-2 text-[#0f8f64] text-sm hover:underline">
            + Agregar diagnóstico relacionado
          </button>
        )}
      </div>

      <div className="bg-[#f5f5f6] border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#7d7d87] mb-2">RIPS PREVIEW (Res. 2275/2023)</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-[#7d7d87]">CUPS:</span> <span className="font-mono font-medium">890205</span></div>
          <div><span className="text-[#7d7d87]">CIE-10:</span> <span className="font-mono font-medium">{primaryCode || '—'}</span></div>
          <div><span className="text-[#7d7d87]">Tipo:</span> <span className="font-medium">{diagnosisTypeLabel(Number(diagnosisType))}</span></div>
        </div>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-[#0f0f12]">Plan de Atención</p>
        <div>
          <label className="block text-xs text-[#7d7d87] mb-1">Corrección óptica</label>
          <select {...register('optical_correction_plan')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
            <option value="">Seleccionar</option>
            <option value="gafas_vl">Gafas VL</option>
            <option value="gafas_vp">Gafas VP</option>
            <option value="progresivos">Progresivos</option>
            <option value="bifocal">Bifocal</option>
            <option value="lc">Lentes de contacto</option>
            <option value="sin_correccion">Sin corrección</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#7d7d87] mb-1">Educación al paciente</label>
          <textarea {...register('patient_education')} rows={3} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Próximo control</label>
            <input type="date" {...register('next_control_date')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Tipo de control</label>
            <select {...register('next_control_reason')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
              <option value="">Seleccionar</option>
              <option value="rutina">Rutina</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('requires_referral')} className="accent-[#0f8f64]" />
            ¿Requiere remisión?
          </label>
          {requiresReferral && (
            <textarea
              {...register('referral_notes')}
              rows={2}
              className="mt-2 w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
              placeholder="A qué especialidad..."
            />
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-[#0f8f64] text-white py-2.5 rounded-lg hover:bg-[#0a7050] font-medium text-sm disabled:opacity-60"
      >
        {isSaving ? 'Guardando...' : 'Siguiente'}
      </button>
    </form>
  );
}
