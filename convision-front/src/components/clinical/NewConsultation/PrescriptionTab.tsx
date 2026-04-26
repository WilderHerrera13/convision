import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { PrescriptionInput, VisualExamInput } from '@/services/clinicalRecordService';

const TREATMENTS = [
  { key: 'antirreflejo', label: 'Antirreflejo' },
  { key: 'fotocromatico', label: 'Fotocromático' },
  { key: 'filtro_luz_azul', label: 'Filtro luz azul' },
  { key: 'endurecido', label: 'Endurecido' },
  { key: 'hidrofobico', label: 'Hidrofóbico' },
];

interface Props {
  defaultValues?: Partial<PrescriptionInput>;
  visualExamData?: Partial<VisualExamInput>;
  onSave: (data: PrescriptionInput) => Promise<void>;
  onBack?: () => void;
  onSign: () => void;
  isSaving?: boolean;
}

function OpticalInput({ name, register, step = '0.25', width = 'w-[72px]' }: {
  name: string; register: ReturnType<typeof useForm>['register']; step?: string; width?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      {...register(name, { valueAsNumber: true })}
      className={`${width} text-center text-[12px] border border-[#e0e0e4] rounded-[4px] px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0f8f64] text-[#121215]`}
    />
  );
}

export function PrescriptionTab({ defaultValues, visualExamData, onSave, onBack, onSign, isSaving }: Props) {
  const { register, handleSubmit, setValue, watch } = useForm<PrescriptionInput>({
    defaultValues: { validity_months: 12, ...defaultValues },
  });

  const [activeTreatments, setActiveTreatments] = useState<string[]>(defaultValues?.treatments ?? []);
  const [prefilled, setPrefilled] = useState(false);

  const validityMonths = watch('validity_months') ?? 12;

  useEffect(() => {
    if (!visualExamData) return;
    const fields: Array<[keyof PrescriptionInput, keyof VisualExamInput]> = [
      ['sph_od', 'subj_sph_od'], ['cyl_od', 'subj_cyl_od'], ['axis_od', 'subj_axis_od'],
      ['sph_oi', 'subj_sph_oi'], ['cyl_oi', 'subj_cyl_oi'], ['axis_oi', 'subj_axis_oi'],
      ['add_od', 'addition'], ['add_oi', 'addition'],
    ];
    let filled = false;
    fields.forEach(([target, source]) => {
      const val = visualExamData[source];
      if (val !== undefined && val !== null) {
        setValue(target, val as never);
        filled = true;
      }
    });
    if (filled) setPrefilled(true);
  }, [visualExamData, setValue]);

  const toggleTreatment = (key: string) => {
    setActiveTreatments(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);
  };

  const validUntilDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(validityMonths));
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const onSubmit = async (data: PrescriptionInput) => {
    await onSave({ ...data, treatments: activeTreatments });
  };

  const handleSignClick = handleSubmit(async (formData) => {
    try {
      await onSave({ ...formData, treatments: activeTreatments });
      onSign();
    } catch {
      // error already surfaced by parent's onSave
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">

      {prefilled && (
        <div className="flex items-center gap-2 bg-[#e5f6ef] border border-[#0f8f64] rounded-[6px] px-3 py-2">
          <span className="text-[#0f8f64] text-[11px] font-semibold">✓ Valores pre-cargados desde la refracción subjetiva del examen visual</span>
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Fórmula óptica</p>
        <hr className="border-[#e5e5e9] mb-3" />
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#fafafb] border border-[#e5e5e9]">
                <th className="px-3 py-2 text-left font-semibold text-[#7d7d87] w-12">Ojo</th>
                <th className="px-2 py-2 text-center font-semibold text-[#7d7d87]">Esférico</th>
                <th className="px-2 py-2 text-center font-semibold text-[#7d7d87]">Cilindro</th>
                <th className="px-2 py-2 text-center font-semibold text-[#7d7d87]">Eje</th>
                <th className="px-2 py-2 text-center font-semibold text-[#7d7d87]">AV c/c</th>
                <th className="px-2 py-2 text-center font-semibold text-[#7d7d87]">Adición</th>
                <th className="px-2 py-2 text-center font-semibold text-[#7d7d87]">D.P.</th>
              </tr>
            </thead>
            <tbody>
              {([['od', 'OD'], ['oi', 'OI']] as const).map(([eye, label]) => (
                <tr key={eye} className="border-b border-[#e5e5e9]">
                  <td className="px-3 py-2">
                    <span className="bg-[#121215] text-white text-[10px] font-bold rounded-[3px] px-1.5 py-0.5">{label}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <OpticalInput name={`sph_${eye}`} register={register} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <OpticalInput name={`cyl_${eye}`} register={register} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <OpticalInput name={`axis_${eye}`} register={register} step="1" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="text"
                      {...register(`avcc_${eye}` as keyof PrescriptionInput)}
                      className="w-[72px] text-center text-[12px] border border-[#e0e0e4] rounded-[4px] px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0f8f64] text-[#121215]"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <OpticalInput name={`add_${eye}`} register={register} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <OpticalInput name={`dp_${eye}`} register={register} step="0.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Especificaciones del lente</p>
        <hr className="border-[#e5e5e9] mb-3" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Tipo de lente</label>
            <select {...register('lens_type')} className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white">
              <option value="">Seleccionar</option>
              <option value="monofocal">Monofocal</option>
              <option value="bifocal">Bifocal</option>
              <option value="progresivo">Progresivo</option>
              <option value="ocupacional">Ocupacional</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Material</label>
            <select {...register('lens_material')} className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white">
              <option value="">Seleccionar</option>
              <option value="policarbonato">Policarbonato</option>
              <option value="cr39">CR-39</option>
              <option value="trivex">Trivex</option>
              <option value="alto_indice">Alto índice</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Uso indicado</label>
            <select {...register('lens_use')} className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white">
              <option value="">Seleccionar</option>
              <option value="permanente">Permanente</option>
              <option value="lectura">Lectura</option>
              <option value="intermitente">Intermitente</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Vigencia (meses)</label>
            <select {...register('validity_months', { valueAsNumber: true })} className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] text-[#121215] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white">
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
            <p className="text-[11px] text-[#7d7d87] mt-1">Válida hasta: {validUntilDate()}</p>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Altura de montaje (mm)</label>
            <input
              type="number"
              step="0.5"
              {...register('mounting_height', { valueAsNumber: true })}
              placeholder="Ej: 18.0"
              className="w-full border border-[#e0e0e4] rounded-[6px] px-2 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] placeholder:text-[#b4b5bc]"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Tratamientos</p>
        <hr className="border-[#e5e5e9] mb-3" />
        <div className="flex flex-wrap gap-2">
          {TREATMENTS.map(t => {
            const active = activeTreatments.includes(t.key);
            return (
              <button key={t.key} type="button" onClick={() => toggleTreatment(t.key)}
                className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${active ? 'bg-[#e5f6ef] border-[#0f8f64] text-[#0f8f64] font-semibold' : 'bg-[#f5f5f6] border-[#e0e0e4] text-[#7d7d87] hover:border-[#0f8f64] hover:text-[#0f8f64]'}`}>
                {t.label}
              </button>
            );
          })}
        </div>
        {activeTreatments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeTreatments.map(k => (
              <span key={k} className="bg-[#0f8f64] text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
                {TREATMENTS.find(t => t.key === k)?.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[13px] font-semibold text-[#121215] mb-1">Firma y cierre</p>
        <hr className="border-[#e5e5e9] mb-3" />
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-[#121215] mb-1.5">Tarjeta profesional (T.P. CTNPO)</label>
          <input
            {...register('professional_tp')}
            placeholder="CTNPO-XXXX"
            className="w-full border border-[#e0e0e4] rounded-[6px] px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64] placeholder:text-[#b4b5bc]"
          />
        </div>
        <div className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[6px] px-3 py-2 text-[11px] text-[#7d7d87] mb-3">
          Ley 650/2001 Art. 24 — La fórmula óptica es un documento legal con vigencia máxima de 12 meses (Decreto 2200/2005)
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onBack && (
          <button type="button" onClick={onBack}
            className="border border-[#e0e0e4] bg-white text-[#121215] h-9 px-5 rounded-[6px] text-[13px] font-semibold hover:bg-[#f5f5f6] transition-colors">
            ← Diagnóstico
          </button>
        )}
        <div className="flex gap-3 ml-auto">
          <button type="submit" disabled={isSaving}
            className="border border-[#0f8f64] text-[#0f8f64] bg-white h-9 px-5 rounded-[6px] text-[13px] font-semibold hover:bg-[#e5f6ef] transition-colors disabled:opacity-50">
            {isSaving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button type="button" onClick={handleSignClick} disabled={isSaving}
            className="bg-[#0f8f64] text-white h-9 px-6 rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] transition-colors disabled:opacity-50">
            Firmar y completar consulta →
          </button>
        </div>
      </div>
    </form>
  );
}
