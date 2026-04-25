import { useForm } from 'react-hook-form';
import type { VisualExamInput } from '@/services/clinicalRecordService';

interface VisualExamTabProps {
  defaultValues?: Partial<VisualExamInput>;
  onSave: (data: VisualExamInput) => Promise<void>;
  isSaving?: boolean;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e5e5e9] rounded-xl p-4 mb-4">
      <p className="text-sm font-medium text-[#0f0f12] mb-3">{title}</p>
      {children}
    </div>
  );
}

function TableInput({ register, name, step, type = 'text' }: { register: any; name: string; step?: string; type?: string }) {
  return (
    <input
      type={type}
      step={step}
      {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
      className="w-24 text-center text-xs border border-[#e5e5e9] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
    />
  );
}

export function VisualExamTab({ defaultValues, onSave, isSaving }: VisualExamTabProps) {
  const { register, handleSubmit } = useForm<VisualExamInput>({ defaultValues });

  const onSubmit = async (data: VisualExamInput) => {
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
      <SectionCard title="Agudeza Visual">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-[#7d7d87] pb-2 w-32"></th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">OD</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">OI</th>
            </tr>
          </thead>
          <tbody className="space-y-1">
            {[
              { label: 'AV sc lejos', od: 'av_sc_od', oi: 'av_sc_oi' },
              { label: 'AV sc cerca', od: 'av_near_sc_od', oi: 'av_near_sc_oi' },
              { label: 'AV cc lejos', od: 'av_cc_od', oi: 'av_cc_oi' },
              { label: 'AV cc cerca', od: 'av_near_cc_od', oi: 'av_near_cc_oi' },
            ].map(row => (
              <tr key={row.label}>
                <td className="text-xs text-[#7d7d87] pr-2 py-1">{row.label}</td>
                <td className="text-center py-1"><TableInput register={register} name={row.od} /></td>
                <td className="text-center py-1"><TableInput register={register} name={row.oi} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Refracción Objetiva (Autoref)">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-[#7d7d87] pb-2 w-12">Ojo</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Esfera</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Cilindro</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Eje</th>
            </tr>
          </thead>
          <tbody>
            {[{ eye: 'od', label: 'OD' }, { eye: 'oi', label: 'OI' }].map(({ eye, label }) => (
              <tr key={eye}>
                <td className="text-xs font-medium text-[#0f0f12] py-1">{label}</td>
                <td className="text-center py-1"><TableInput register={register} name={`autoref_sph_${eye}`} type="number" step="0.25" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`autoref_cyl_${eye}`} type="number" step="0.25" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`autoref_axis_${eye}`} type="number" step="1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Refracción Subjetiva">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-[#7d7d87] pb-2 w-12">Ojo</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Esfera</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Cilindro</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Eje</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">AV</th>
            </tr>
          </thead>
          <tbody>
            {[{ eye: 'od', label: 'OD' }, { eye: 'oi', label: 'OI' }].map(({ eye, label }) => (
              <tr key={eye}>
                <td className="text-xs font-medium text-[#0f0f12] py-1">{label}</td>
                <td className="text-center py-1"><TableInput register={register} name={`subj_sph_${eye}`} type="number" step="0.25" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`subj_cyl_${eye}`} type="number" step="0.25" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`subj_axis_${eye}`} type="number" step="1" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`subj_av_${eye}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          <label className="text-xs text-[#7d7d87]">Adición</label>
          <input type="number" step="0.25" {...register('addition', { valueAsNumber: true })} className="ml-2 w-24 text-xs border border-[#e5e5e9] rounded px-2 py-1" />
        </div>
      </SectionCard>

      <SectionCard title="Queratometría">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-[#7d7d87] pb-2 w-12">Ojo</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">K1</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">K2</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Eje</th>
            </tr>
          </thead>
          <tbody>
            {[{ eye: 'od', label: 'OD' }, { eye: 'oi', label: 'OI' }].map(({ eye, label }) => (
              <tr key={eye}>
                <td className="text-xs font-medium text-[#0f0f12] py-1">{label}</td>
                <td className="text-center py-1"><TableInput register={register} name={`kero_k1_${eye}`} type="number" step="0.01" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`kero_k2_${eye}`} type="number" step="0.01" /></td>
                <td className="text-center py-1"><TableInput register={register} name={`kero_axis_${eye}`} type="number" step="1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Presión Intraocular (PIO)">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Método</label>
            <select {...register('iop_method')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
              <option value="">Seleccionar</option>
              <option value="goldman">Goldman</option>
              <option value="air">No-Contacto</option>
              <option value="icare">iCare</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">PIO OD (mmHg)</label>
            <input type="number" step="0.5" {...register('iop_od', { valueAsNumber: true })} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">PIO OI (mmHg)</label>
            <input type="number" step="0.5" {...register('iop_oi', { valueAsNumber: true })} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Biomicroscopía (Segmento Anterior)">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Córnea OD', name: 'biomi_cornea_od' }, { label: 'Córnea OI', name: 'biomi_cornea_oi' },
            { label: 'Cristalino OD', name: 'biomi_lens_od' }, { label: 'Cristalino OI', name: 'biomi_lens_oi' },
            { label: 'Conjuntiva OD', name: 'biomi_conj_od' }, { label: 'Conjuntiva OI', name: 'biomi_conj_oi' },
            { label: 'C. Anterior OD', name: 'biomi_ac_od' }, { label: 'C. Anterior OI', name: 'biomi_ac_oi' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs text-[#7d7d87] mb-1">{f.label}</label>
              <textarea {...register(f.name)} rows={2} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Fondo de Ojo (Segmento Posterior)">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Vítreo OD', name: 'fundus_vitreous_od' }, { label: 'Vítreo OI', name: 'fundus_vitreous_oi' },
            { label: 'Disco OD', name: 'fundus_disc_od' }, { label: 'Disco OI', name: 'fundus_disc_oi' },
            { label: 'Mácula OD', name: 'fundus_macula_od' }, { label: 'Mácula OI', name: 'fundus_macula_oi' },
            { label: 'Periferia OD', name: 'fundus_periph_od' }, { label: 'Periferia OI', name: 'fundus_periph_oi' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs text-[#7d7d87] mb-1">{f.label}</label>
              <textarea {...register(f.name)} rows={2} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Motilidad Ocular">
        <textarea
          {...register('ocular_motility')}
          rows={3}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Describe la motilidad ocular..."
        />
      </SectionCard>

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
