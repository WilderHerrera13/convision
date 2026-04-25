import { useForm } from 'react-hook-form';
import type { FollowUpFormulaInput, PrescriptionInput } from '@/services/clinicalRecordService';

interface UpdateFormulaTabProps {
  previousPrescription?: PrescriptionInput;
  defaultValues?: Partial<FollowUpFormulaInput>;
  primaryDiagnosisCode?: string;
  onSave: (data: FollowUpFormulaInput) => Promise<void>;
  onSign: () => void;
  isSaving?: boolean;
}

const EYES = [
  { eye: 'od', label: 'OD' },
  { eye: 'oi', label: 'OI' },
] as const;

function validUntilDate(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function UpdateFormulaTab({
  previousPrescription,
  defaultValues,
  primaryDiagnosisCode,
  onSave,
  onSign,
  isSaving,
}: UpdateFormulaTabProps) {
  const { register, handleSubmit, watch, setValue } = useForm<FollowUpFormulaInput>({
    defaultValues: { formula_decision: 'mantener', new_validity_months: 12, ...defaultValues },
  });

  const decision = watch('formula_decision');
  const validityMonths = watch('new_validity_months') || 12;
  const isMantener = decision === 'mantener';

  const onSubmit = async (data: FollowUpFormulaInput) => {
    await onSave(data);
  };

  function prevVal(field: keyof PrescriptionInput): string {
    const v = previousPrescription?.[field];
    return v != null ? String(v) : '';
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Decisión sobre la fórmula</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'mantener', title: 'Mantener fórmula actual', desc: 'La fórmula actual sigue siendo válida.' },
            { value: 'actualizar', title: 'Actualizar fórmula', desc: 'Nueva medición indica cambio necesario.' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue('formula_decision', opt.value as 'mantener' | 'actualizar')}
              className={`border-2 rounded-xl p-4 text-left transition-colors ${
                decision === opt.value
                  ? 'border-[#0f8f64] bg-[#e5f6ef]'
                  : 'border-[#e5e5e9] bg-white hover:border-[#0f8f64]'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${decision === opt.value ? 'text-[#0f8f64]' : 'text-[#0f0f12]'}`}>
                {opt.title}
              </p>
              <p className="text-xs text-[#7d7d87]">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

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
            {EYES.map(({ eye, label }) => {
              const cls = isMantener
                ? 'w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1 bg-[#f5f5f6] text-[#0f8f64] font-medium'
                : 'w-16 text-xs text-center border border-[#e5e5e9] rounded px-1 py-1 bg-white';
              return (
                <tr key={eye}>
                  <td className="text-xs font-medium text-[#0f0f12] py-1">{label}</td>
                  {(['sph', 'cyl', 'axis', 'avcc', 'add', 'dp'] as const).map(field => {
                    const name = `${field}_${eye}` as keyof PrescriptionInput;
                    const prev = prevVal(name);
                    if (field === 'avcc') {
                      return (
                        <td key={field} className="py-1 text-center">
                          <input
                            type="text"
                            defaultValue={isMantener ? prev : ''}
                            placeholder={!isMantener && prev ? `Ant: ${prev}` : ''}
                            disabled={isMantener}
                            className={cls}
                          />
                        </td>
                      );
                    }
                    const step = field === 'axis' || field === 'dp' ? '1' : '0.25';
                    return (
                      <td key={field} className="py-1 text-center">
                        <input
                          type="number"
                          step={step}
                          defaultValue={isMantener ? prev : ''}
                          placeholder={!isMantener && prev ? `Ant: ${prev}` : ''}
                          disabled={isMantener}
                          className={cls}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Nueva Vigencia</p>
        <div className="flex items-center gap-3">
          <select
            {...register('new_validity_months', { valueAsNumber: true })}
            className="border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
          <p className="text-sm text-[#7d7d87]">Válida hasta: {validUntilDate(validityMonths)}</p>
        </div>
      </div>

      <div className="bg-[#f5f5f6] border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#7d7d87] mb-2 uppercase tracking-wide">RIPS Auto</p>
        <div className="space-y-1">
          <div className="flex gap-2 text-xs">
            <span className="text-[#7d7d87]">CUPS:</span>
            <span className="font-mono font-medium text-[#0f0f12]">890307</span>
          </div>
          {primaryDiagnosisCode && (
            <div className="flex gap-2 text-xs">
              <span className="text-[#7d7d87]">CIE-10:</span>
              <span className="font-mono font-medium text-[#0f0f12]">{primaryDiagnosisCode}</span>
            </div>
          )}
          <div className="flex gap-2 text-xs">
            <span className="text-[#7d7d87]">Tipo:</span>
            <span className="text-[#0f0f12]">Control optométrico</span>
          </div>
        </div>
      </div>

      <div className="bg-[#f5f5f6] border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Firma</p>
        <button
          type="button"
          onClick={onSign}
          className="w-full bg-[#0f8f64] text-white py-3 rounded-lg hover:bg-[#0a7050] font-medium"
        >
          Firmar y cerrar control
        </button>
        <p className="text-xs text-[#7d7d87] mt-2 text-center">
          Ley 650/2001 Art. 24 — La fórmula óptica es un documento legal
        </p>
        <p className="text-xs text-[#7d7d87] text-center">
          Decreto 2200/2005 — Control optométrico
        </p>
      </div>
    </form>
  );
}
