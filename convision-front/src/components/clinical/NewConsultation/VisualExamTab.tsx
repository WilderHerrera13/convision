import { useForm } from 'react-hook-form';
import type { UseFormRegister } from 'react-hook-form';
import type { VisualExamInput } from '@/services/clinicalRecordService';

interface VisualExamTabProps {
  defaultValues?: Partial<VisualExamInput>;
  onSave: (data: VisualExamInput) => Promise<void>;
  onBack?: () => void;
  isSaving?: boolean;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e5e5e9] rounded-xl overflow-hidden mb-5">
      <div className="bg-[#f9f9fa] border-b border-[#e5e5e9] px-4 py-2.5">
        <p className="text-[13px] font-semibold text-[#0f0f12]">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NumInput({ register, name, step = '0.25' }: { register: UseFormRegister<VisualExamInput>; name: keyof VisualExamInput; step?: string }) {
  return (
    <input
      type="number"
      step={step}
      {...register(name, { valueAsNumber: true })}
      className="w-full text-center text-xs border border-[#e5e5e9] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white"
    />
  );
}

function TextInput({ register, name }: { register: UseFormRegister<VisualExamInput>; name: keyof VisualExamInput }) {
  return (
    <input
      type="text"
      {...register(name)}
      className="w-full text-center text-xs border border-[#e5e5e9] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white"
    />
  );
}

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-center text-[11px] font-semibold text-[#7d7d87] pb-2 px-2">{children}</th>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <td className="text-[12px] text-[#3d3d44] font-medium pr-3 whitespace-nowrap py-1.5 w-36">{children}</td>
  );
}

function EyeLabel({ children }: { children: React.ReactNode }) {
  return (
    <td className="text-[12px] font-semibold text-[#0f0f12] pr-3 py-1.5 w-10">{children}</td>
  );
}

export function VisualExamTab({ defaultValues, onSave, onBack, isSaving }: VisualExamTabProps) {
  const { register, handleSubmit } = useForm<VisualExamInput>({ defaultValues });

  const onSubmit = async (data: VisualExamInput) => {
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-1 py-2">

      {/* Agudeza Visual */}
      <SectionCard title="Agudeza Visual (Snellen)">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-36" />
              <ColHeader>OD</ColHeader>
              <ColHeader>OI</ColHeader>
            </tr>
          </thead>
          <tbody>
            <tr><RowLabel>Sin corrección — lejos</RowLabel><td className="py-1.5 px-1"><TextInput register={register} name="av_sc_od" /></td><td className="py-1.5 px-1"><TextInput register={register} name="av_sc_oi" /></td></tr>
            <tr><RowLabel>Sin corrección — cerca</RowLabel><td className="py-1.5 px-1"><TextInput register={register} name="av_near_sc_od" /></td><td className="py-1.5 px-1"><TextInput register={register} name="av_near_sc_oi" /></td></tr>
            <tr><RowLabel>Con corrección — lejos</RowLabel><td className="py-1.5 px-1"><TextInput register={register} name="av_cc_od" /></td><td className="py-1.5 px-1"><TextInput register={register} name="av_cc_oi" /></td></tr>
            <tr><RowLabel>Con corrección — cerca</RowLabel><td className="py-1.5 px-1"><TextInput register={register} name="av_near_cc_od" /></td><td className="py-1.5 px-1"><TextInput register={register} name="av_near_cc_oi" /></td></tr>
          </tbody>
        </table>
      </SectionCard>

      {/* Refracción Objetiva */}
      <SectionCard title="Refracción Objetiva (Autorefractometría)">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-10" />
              <ColHeader>Esfera</ColHeader>
              <ColHeader>Cilindro</ColHeader>
              <ColHeader>Eje</ColHeader>
            </tr>
          </thead>
          <tbody>
            {([['od', 'OD'], ['oi', 'OI']] as const).map(([eye, label]) => (
              <tr key={eye}>
                <EyeLabel>{label}</EyeLabel>
                <td className="py-1.5 px-1"><NumInput register={register} name={`autoref_sph_${eye}`} /></td>
                <td className="py-1.5 px-1"><NumInput register={register} name={`autoref_cyl_${eye}`} /></td>
                <td className="py-1.5 px-1"><NumInput register={register} name={`autoref_axis_${eye}`} step="1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Refracción Subjetiva */}
      <SectionCard title="Refracción Subjetiva">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-10" />
              <ColHeader>Esfera</ColHeader>
              <ColHeader>Cilindro</ColHeader>
              <ColHeader>Eje</ColHeader>
              <ColHeader>AV</ColHeader>
            </tr>
          </thead>
          <tbody>
            {([['od', 'OD'], ['oi', 'OI']] as const).map(([eye, label]) => (
              <tr key={eye}>
                <EyeLabel>{label}</EyeLabel>
                <td className="py-1.5 px-1"><NumInput register={register} name={`subj_sph_${eye}`} /></td>
                <td className="py-1.5 px-1"><NumInput register={register} name={`subj_cyl_${eye}`} /></td>
                <td className="py-1.5 px-1"><NumInput register={register} name={`subj_axis_${eye}`} step="1" /></td>
                <td className="py-1.5 px-1"><TextInput register={register} name={`subj_av_${eye}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[12px] font-medium text-[#3d3d44]">Adición</span>
          <div className="w-28">
            <NumInput register={register} name="addition" />
          </div>
        </div>
      </SectionCard>

      {/* Queratometría */}
      <SectionCard title="Queratometría">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-10" />
              <ColHeader>K1</ColHeader>
              <ColHeader>K2</ColHeader>
              <ColHeader>Eje</ColHeader>
            </tr>
          </thead>
          <tbody>
            {([['od', 'OD'], ['oi', 'OI']] as const).map(([eye, label]) => (
              <tr key={eye}>
                <EyeLabel>{label}</EyeLabel>
                <td className="py-1.5 px-1"><NumInput register={register} name={`kero_k1_${eye}`} step="0.01" /></td>
                <td className="py-1.5 px-1"><NumInput register={register} name={`kero_k2_${eye}`} step="0.01" /></td>
                <td className="py-1.5 px-1"><NumInput register={register} name={`kero_axis_${eye}`} step="1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Presión Intraocular */}
      <SectionCard title="Presión Intraocular (PIO)">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#7d7d87] mb-1.5">Método</label>
            <select
              {...register('iop_method')}
              className="w-full border border-[#e5e5e9] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64] bg-white"
            >
              <option value="">Seleccionar</option>
              <option value="goldman">Aplanación (Goldman)</option>
              <option value="air">No contacto (aire)</option>
              <option value="icare">iCare</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#7d7d87] mb-1.5">OD (mmHg)</label>
            <NumInput register={register} name="iop_od" step="0.5" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#7d7d87] mb-1.5">OI (mmHg)</label>
            <NumInput register={register} name="iop_oi" step="0.5" />
          </div>
        </div>
      </SectionCard>

      {/* Biomicroscopía */}
      <SectionCard title="Biomicroscopía (Segmento Anterior)">
        <div className="mb-2">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-3 mb-1.5">
            <span className="text-[11px] font-semibold text-[#7d7d87]">Estructura</span>
            <span className="text-[11px] font-semibold text-[#7d7d87] text-center">OD</span>
            <span className="text-[11px] font-semibold text-[#7d7d87] text-center">OI</span>
          </div>
          {[
            { label: 'Párpados', od: 'biomi_lids_od', oi: 'biomi_lids_oi' },
            { label: 'Conjuntiva', od: 'biomi_conj_od', oi: 'biomi_conj_oi' },
            { label: 'Córnea', od: 'biomi_cornea_od', oi: 'biomi_cornea_oi' },
            { label: 'Cámara anterior', od: 'biomi_ac_od', oi: 'biomi_ac_oi' },
            { label: 'Cristalino', od: 'biomi_lens_od', oi: 'biomi_lens_oi' },
          ].map(row => (
            <div key={row.label} className="grid grid-cols-[1fr_1fr_1fr] gap-x-3 mb-2">
              <div className="flex items-center">
                <span className="text-[12px] text-[#3d3d44] font-medium">{row.label}</span>
              </div>
              <textarea
                {...register(row.od)}
                rows={2}
                className="border border-[#e5e5e9] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none"
              />
              <textarea
                {...register(row.oi)}
                rows={2}
                className="border border-[#e5e5e9] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Fondo de Ojo */}
      <SectionCard title="Fondo de Ojo (Segmento Posterior)">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-3 mb-1.5">
          <span className="text-[11px] font-semibold text-[#7d7d87]">Estructura</span>
          <span className="text-[11px] font-semibold text-[#7d7d87] text-center">OD</span>
          <span className="text-[11px] font-semibold text-[#7d7d87] text-center">OI</span>
        </div>
        {[
          { label: 'Papila', od: 'fundus_disc_od', oi: 'fundus_disc_oi' },
          { label: 'Mácula', od: 'fundus_macula_od', oi: 'fundus_macula_oi' },
          { label: 'Vasos retinianos', od: 'fundus_vessels_od', oi: 'fundus_vessels_oi' },
          { label: 'Retina periférica', od: 'fundus_periph_od', oi: 'fundus_periph_oi' },
        ].map(row => (
          <div key={row.label} className="grid grid-cols-[1fr_1fr_1fr] gap-x-3 mb-2">
            <div className="flex items-center">
              <span className="text-[12px] text-[#3d3d44] font-medium">{row.label}</span>
            </div>
            <textarea
              {...register(row.od)}
              rows={2}
              className="border border-[#e5e5e9] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none"
            />
            <textarea
              {...register(row.oi)}
              rows={2}
              className="border border-[#e5e5e9] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none"
            />
          </div>
        ))}
      </SectionCard>

      {/* Motilidad Ocular */}
      <SectionCard title="Motilidad Ocular">
        <div className="space-y-3">
          {[
            { label: 'Versiones y ducciones', name: 'motility_versions' },
            { label: 'Test de Hirschberg', name: 'motility_hirschberg' },
            { label: 'Cover test', name: 'motility_cover_test' },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-[11px] font-semibold text-[#7d7d87] mb-1.5">{field.label}</label>
              <textarea
                {...register(field.name)}
                rows={2}
                className="w-full border border-[#e5e5e9] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64] resize-none"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] font-medium text-[#7d7d87] hover:text-[#0f0f12] transition-colors"
        >
          ← Anamnesis
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="bg-[#0f8f64] text-white h-9 px-6 rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Siguiente: Diagnóstico →'}
        </button>
      </div>
    </form>
  );
}
