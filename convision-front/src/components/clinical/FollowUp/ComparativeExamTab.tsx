import { useForm } from 'react-hook-form';
import type { VisualExamInput } from '@/services/clinicalRecordService';

interface ComparativeExamTabProps {
  previousExam?: VisualExamInput;
  defaultValues?: Partial<VisualExamInput>;
  onSave: (data: VisualExamInput) => Promise<void>;
  isSaving?: boolean;
}

function PrevCell({ value }: { value?: string | number }) {
  return (
    <span className="text-[#0f8f64] font-medium text-xs">
      {value != null && value !== '' ? String(value) : '—'}
    </span>
  );
}

function NumInput({ register, name, step = '0.25' }: { register: any; name: string; step?: string }) {
  return (
    <input
      type="number"
      step={step}
      {...register(name, { valueAsNumber: true })}
      className="w-20 text-center text-xs border border-[#e5e5e9] rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
    />
  );
}

function TextInput({ register, name }: { register: any; name: string }) {
  return (
    <input
      type="text"
      {...register(name)}
      className="w-20 text-center text-xs border border-[#e5e5e9] rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
    />
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e5e5e9] rounded-xl p-4 mb-4">
      <p className="text-sm font-medium text-[#0f0f12] mb-3">{title}</p>
      {children}
    </div>
  );
}

const NO_PREV = <span className="text-xs text-[#bdbdc7] italic">—</span>;

export function ComparativeExamTab({ previousExam, defaultValues, onSave, isSaving }: ComparativeExamTabProps) {
  const { register, handleSubmit } = useForm<VisualExamInput>({ defaultValues });

  const onSubmit = async (data: VisualExamInput) => {
    await onSave(data);
  };

  const hasPrev = !!previousExam;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
      {!hasPrev && (
        <div className="mb-4 bg-[#f5f5f6] border border-[#e5e5e9] rounded-xl p-3 text-sm text-[#7d7d87]">
          Sin datos previos — primera visita del paciente.
        </div>
      )}

      <SectionCard title="Agudeza Visual">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-[#7d7d87] pb-2 w-32"></th>
              {hasPrev && <th className="text-center text-xs font-semibold text-[#0f8f64] pb-2">Visita anterior</th>}
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">OD</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">OI</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'AV sc lejos', od: 'av_sc_od', oi: 'av_sc_oi' },
              { label: 'AV sc cerca', od: 'av_near_sc_od', oi: 'av_near_sc_oi' },
              { label: 'AV cc lejos', od: 'av_cc_od', oi: 'av_cc_oi' },
              { label: 'AV cc cerca', od: 'av_near_cc_od', oi: 'av_near_cc_oi' },
            ].map(row => (
              <tr key={row.label}>
                <td className="text-xs text-[#7d7d87] pr-2 py-1">{row.label}</td>
                {hasPrev && (
                  <td className="text-center py-1">
                    <PrevCell value={previousExam?.[row.od as keyof VisualExamInput] as string} />
                    {' / '}
                    <PrevCell value={previousExam?.[row.oi as keyof VisualExamInput] as string} />
                  </td>
                )}
                <td className="text-center py-1"><TextInput register={register} name={row.od} /></td>
                <td className="text-center py-1"><TextInput register={register} name={row.oi} /></td>
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
              {hasPrev && <th className="text-center text-xs font-semibold text-[#0f8f64] pb-2">Visita anterior (Esf/Cil/Eje)</th>}
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Esfera</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Cilindro</th>
              <th className="text-center text-xs font-semibold text-[#7d7d87] pb-2">Eje</th>
            </tr>
          </thead>
          <tbody>
            {[{ eye: 'od', label: 'OD' }, { eye: 'oi', label: 'OI' }].map(({ eye, label }) => (
              <tr key={eye}>
                <td className="text-xs font-medium text-[#0f0f12] py-1">{label}</td>
                {hasPrev && (
                  <td className="text-center py-1 text-[#0f8f64] text-xs font-medium">
                    <PrevCell value={previousExam?.[`autoref_sph_${eye}` as keyof VisualExamInput] as number} />
                    {' / '}
                    <PrevCell value={previousExam?.[`autoref_cyl_${eye}` as keyof VisualExamInput] as number} />
                    {' / '}
                    <PrevCell value={previousExam?.[`autoref_axis_${eye}` as keyof VisualExamInput] as number} />
                  </td>
                )}
                <td className="text-center py-1"><NumInput register={register} name={`autoref_sph_${eye}`} /></td>
                <td className="text-center py-1"><NumInput register={register} name={`autoref_cyl_${eye}`} /></td>
                <td className="text-center py-1"><NumInput register={register} name={`autoref_axis_${eye}`} step="1" /></td>
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
              {hasPrev && <th className="text-center text-xs font-semibold text-[#0f8f64] pb-2">Visita anterior</th>}
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
                {hasPrev && (
                  <td className="text-center py-1 text-[#0f8f64] text-xs font-medium">
                    <PrevCell value={previousExam?.[`subj_sph_${eye}` as keyof VisualExamInput] as number} />
                    {' / '}
                    <PrevCell value={previousExam?.[`subj_cyl_${eye}` as keyof VisualExamInput] as number} />
                    {' / '}
                    <PrevCell value={previousExam?.[`subj_axis_${eye}` as keyof VisualExamInput] as number} />
                  </td>
                )}
                <td className="text-center py-1"><NumInput register={register} name={`subj_sph_${eye}`} /></td>
                <td className="text-center py-1"><NumInput register={register} name={`subj_cyl_${eye}`} /></td>
                <td className="text-center py-1"><NumInput register={register} name={`subj_axis_${eye}`} step="1" /></td>
                <td className="text-center py-1"><TextInput register={register} name={`subj_av_${eye}`} /></td>
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
            <label className="block text-xs text-[#7d7d87] mb-1">
              PIO OD {hasPrev && previousExam?.iop_od && <span className="text-[#0f8f64]">(ant: {previousExam.iop_od})</span>}
            </label>
            <input type="number" step="0.5" {...register('iop_od', { valueAsNumber: true })} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">
              PIO OI {hasPrev && previousExam?.iop_oi && <span className="text-[#0f8f64]">(ant: {previousExam.iop_oi})</span>}
            </label>
            <input type="number" step="0.5" {...register('iop_oi', { valueAsNumber: true })} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Biomicroscopía (Segmento Anterior)">
        {hasPrev && (
          <div className="mb-3 bg-[#e5f6ef] border border-[#effcf5] rounded p-2 text-sm text-[#0f8f64]">
            <p className="text-xs font-semibold mb-1">Visita anterior</p>
            <p className="text-xs">Córnea OD: {previousExam?.biomi_cornea_od || '—'} | OI: {previousExam?.biomi_cornea_oi || '—'}</p>
            <p className="text-xs">Cristalino OD: {previousExam?.biomi_lens_od || '—'} | OI: {previousExam?.biomi_lens_oi || '—'}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Córnea OD', name: 'biomi_cornea_od' }, { label: 'Córnea OI', name: 'biomi_cornea_oi' },
            { label: 'Cristalino OD', name: 'biomi_lens_od' }, { label: 'Cristalino OI', name: 'biomi_lens_oi' },
            { label: 'Conjuntiva OD', name: 'biomi_conj_od' }, { label: 'Conjuntiva OI', name: 'biomi_conj_oi' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs text-[#7d7d87] mb-1">{f.label}</label>
              <textarea {...register(f.name)} rows={2} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Fondo de Ojo">
        {hasPrev && (
          <div className="mb-3 bg-[#e5f6ef] border border-[#effcf5] rounded p-2 text-sm text-[#0f8f64]">
            <p className="text-xs font-semibold mb-1">Visita anterior</p>
            <p className="text-xs">Disco OD: {previousExam?.fundus_disc_od || '—'} | OI: {previousExam?.fundus_disc_oi || '—'}</p>
            <p className="text-xs">Mácula OD: {previousExam?.fundus_macula_od || '—'} | OI: {previousExam?.fundus_macula_oi || '—'}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Disco OD', name: 'fundus_disc_od' }, { label: 'Disco OI', name: 'fundus_disc_oi' },
            { label: 'Mácula OD', name: 'fundus_macula_od' }, { label: 'Mácula OI', name: 'fundus_macula_oi' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs text-[#7d7d87] mb-1">{f.label}</label>
              <textarea {...register(f.name)} rows={2} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
            </div>
          ))}
        </div>
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
