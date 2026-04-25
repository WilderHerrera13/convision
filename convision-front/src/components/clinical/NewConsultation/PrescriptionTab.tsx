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

interface PrescriptionTabProps {
  defaultValues?: Partial<PrescriptionInput>;
  visualExamData?: VisualExamInput;
  onSave: (data: PrescriptionInput) => Promise<void>;
  onSign: () => void;
  isSaving?: boolean;
}

export function PrescriptionTab({ defaultValues, visualExamData, onSave, onSign, isSaving }: PrescriptionTabProps) {
  const { register, handleSubmit, setValue, watch } = useForm<PrescriptionInput>({
    defaultValues: { validity_months: 12, ...defaultValues },
  });

  const [activeTreatments, setActiveTreatments] = useState<string[]>(defaultValues?.treatments || []);
  const validityMonths = watch('validity_months') || 12;

  useEffect(() => {
    if (visualExamData) {
      if (visualExamData.subj_sph_od !== undefined) setValue('sph_od', visualExamData.subj_sph_od);
      if (visualExamData.subj_cyl_od !== undefined) setValue('cyl_od', visualExamData.subj_cyl_od);
      if (visualExamData.subj_axis_od !== undefined) setValue('axis_od', visualExamData.subj_axis_od);
      if (visualExamData.subj_sph_oi !== undefined) setValue('sph_oi', visualExamData.subj_sph_oi);
      if (visualExamData.subj_cyl_oi !== undefined) setValue('cyl_oi', visualExamData.subj_cyl_oi);
      if (visualExamData.subj_axis_oi !== undefined) setValue('axis_oi', visualExamData.subj_axis_oi);
    }
  }, [visualExamData, setValue]);

  const toggleTreatment = (key: string) => {
    setActiveTreatments(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  const validUntilDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(validityMonths));
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const onSubmit = async (data: PrescriptionInput) => {
    await onSave({ ...data, treatments: activeTreatments });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Fórmula Óptica</p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-[#7d7d87] pb-2 w-12">Ojo</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Esférico</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Cilindro</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Eje</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">AV cc</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Adición</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">DP</th>
            </tr>
          </thead>
          <tbody>
            {[{ eye: 'od', label: 'OD' }, { eye: 'oi', label: 'OI' }].map(({ eye, label }) => (
              <tr key={eye}>
                <td className="text-xs font-medium text-[#0f0f12] py-1">{label}</td>
                <td className="py-1 text-center">
                  <input type="number" step="0.25" {...register(`sph_${eye}` as keyof PrescriptionInput, { valueAsNumber: true })} className="w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1" />
                </td>
                <td className="py-1 text-center">
                  <input type="number" step="0.25" {...register(`cyl_${eye}` as keyof PrescriptionInput, { valueAsNumber: true })} className="w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1" />
                </td>
                <td className="py-1 text-center">
                  <input type="number" step="1" {...register(`axis_${eye}` as keyof PrescriptionInput, { valueAsNumber: true })} className="w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1" />
                </td>
                <td className="py-1 text-center">
                  <input type="text" {...register(`avcc_${eye}` as keyof PrescriptionInput)} className="w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1" />
                </td>
                <td className="py-1 text-center">
                  <input type="number" step="0.25" {...register(`add_${eye}` as keyof PrescriptionInput, { valueAsNumber: true })} className="w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1" />
                </td>
                <td className="py-1 text-center">
                  <input type="number" step="0.5" {...register(`dp_${eye}` as keyof PrescriptionInput, { valueAsNumber: true })} className="w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Tipo de Lente</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Tipo</label>
            <select {...register('lens_type')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
              <option value="">Seleccionar</option>
              <option value="monofocal">Monofocal</option>
              <option value="bifocal">Bifocal</option>
              <option value="progresivo">Progresivo</option>
              <option value="ocupacional">Ocupacional</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Material</label>
            <select {...register('lens_material')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
              <option value="">Seleccionar</option>
              <option value="policarbonato">Policarbonato</option>
              <option value="cr39">CR-39</option>
              <option value="trivex">Trivex</option>
              <option value="alto_indice">Alto índice</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Uso</label>
            <select {...register('lens_use')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
              <option value="">Seleccionar</option>
              <option value="permanente">Permanente</option>
              <option value="lectura">Lectura</option>
              <option value="intermitente">Intermitente</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-[#7d7d87] mb-1">Altura de montaje (mm)</label>
          <input type="number" step="0.5" {...register('mounting_height', { valueAsNumber: true })} className="w-32 border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
        </div>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Tratamientos</p>
        <div className="flex flex-wrap gap-2">
          {TREATMENTS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => toggleTreatment(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                activeTreatments.includes(t.key)
                  ? 'bg-[#e5f6ef] border-[#0f8f64] text-[#0f8f64]'
                  : 'border-[#e5e5e9] text-[#7d7d87] hover:border-[#0f8f64]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Vigencia</p>
        <div className="flex items-center gap-3">
          <select {...register('validity_months', { valueAsNumber: true })} className="border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
          <p className="text-sm text-[#7d7d87]">Válida hasta: {validUntilDate()}</p>
        </div>
      </div>

      <div className="bg-[#f5f5f6] border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Firma</p>
        <div className="mb-3">
          <label className="block text-xs text-[#7d7d87] mb-1">Tarjeta profesional (T.P.)</label>
          <input
            {...register('professional_tp')}
            className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
            placeholder="CTNPO-XXXX"
          />
        </div>
        <button
          type="button"
          onClick={onSign}
          className="w-full bg-[#0f8f64] text-white py-3 rounded-lg hover:bg-[#0a7050] font-medium"
        >
          Firmar y completar consulta
        </button>
        <p className="text-xs text-[#7d7d87] mt-2 text-center">
          Ley 650/2001 Art. 24 — La fórmula óptica es un documento legal
        </p>
      </div>
    </form>
  );
}
