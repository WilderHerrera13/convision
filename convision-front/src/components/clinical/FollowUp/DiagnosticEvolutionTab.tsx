import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FollowUpEvolutionInput } from '@/services/clinicalRecordService';

interface ActiveDiagnosis {
  code: string;
  description: string;
  type: number;
}

interface DiagnosticEvolutionTabProps {
  activeDiagnoses?: ActiveDiagnosis[];
  defaultValues?: Partial<FollowUpEvolutionInput>;
  onSave: (data: FollowUpEvolutionInput) => Promise<void>;
  isSaving?: boolean;
}

const schema = z.object({
  diagnostic_evolution: z.enum(['estable', 'progresa', 'mejora', 'remite']),
  evolution_description: z.string().optional(),
  new_diag_code: z.string().optional(),
  new_diag_desc: z.string().optional(),
  optical_decision: z.enum(['mantener', 'actualizar', 'suspender']).optional(),
  next_control_date: z.string().optional(),
  next_control_interval: z.string().optional(),
  patient_education: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EVOLUTION_OPTIONS = [
  { value: 'estable', label: 'Estable', color: '#0f8f64', bg: '#e5f6ef' },
  { value: 'progresa', label: 'Progresa', color: '#c0392b', bg: '#fdf0ef' },
  { value: 'mejora', label: 'Mejora', color: '#b57218', bg: '#fff6e3' },
  { value: 'remite', label: 'Remite', color: '#7d7d87', bg: '#f5f5f6' },
] as const;

const DIAGNOSIS_TYPES: Record<number, string> = { 1: 'Principal', 2: 'Relacionado', 3: 'Complicación' };

const OPTICAL_OPTIONS = [
  { value: 'mantener', label: 'Mantener' },
  { value: 'actualizar', label: 'Actualizar' },
  { value: 'suspender', label: 'Suspender' },
] as const;

const INTERVAL_OPTIONS = ['1 mes', '3 meses', '6 meses', '1 año'];

export function DiagnosticEvolutionTab({ activeDiagnoses, defaultValues, onSave, isSaving }: DiagnosticEvolutionTabProps) {
  const [showNewDx, setShowNewDx] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as FormData,
  });

  const evolution = watch('diagnostic_evolution');
  const opticalDecision = watch('optical_decision');

  const onSubmit = async (data: FormData) => {
    await onSave(data as FollowUpEvolutionInput);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Diagnósticos Activos</p>
        {activeDiagnoses && activeDiagnoses.length > 0 ? (
          activeDiagnoses.map((dx, i) => (
            <div key={i} className="border border-[#0f8f64] bg-[#e5f6ef] rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white border border-[#0f8f64] text-[#0f8f64] rounded px-2 py-0.5 text-xs font-mono">
                  {dx.code}
                </span>
                <span className="text-xs text-[#7d7d87]">{DIAGNOSIS_TYPES[dx.type] || 'Diagnóstico'}</span>
              </div>
              <p className="font-medium text-[#0f0f12] text-sm">{dx.description}</p>
            </div>
          ))
        ) : (
          <div className="bg-[#f5f5f6] border border-[#e5e5e9] rounded-xl p-4 text-sm text-[#7d7d87] text-center">
            No se encontraron diagnósticos activos
          </div>
        )}
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Evolución Diagnóstica *</p>
        <div className="grid grid-cols-2 gap-2">
          {EVOLUTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue('diagnostic_evolution', opt.value)}
              style={evolution === opt.value ? { borderColor: opt.color, backgroundColor: opt.bg, color: opt.color } : {}}
              className={`border-2 rounded-xl p-3 text-sm font-medium text-left transition-colors ${
                evolution === opt.value
                  ? 'border-2'
                  : 'border border-[#e5e5e9] bg-white text-[#7d7d87] hover:border-[#0f8f64]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.diagnostic_evolution && (
          <p className="text-xs text-red-500 mt-1">Seleccione la evolución diagnóstica</p>
        )}
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-2">Descripción de la evolución</p>
        <textarea
          {...register('evolution_description')}
          rows={4}
          placeholder="Describa en detalle la evolución del cuadro clínico..."
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#0f0f12]">¿Cambio de diagnóstico principal?</p>
          <button
            type="button"
            onClick={() => setShowNewDx(v => !v)}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${showNewDx ? 'bg-[#0f8f64]' : 'bg-[#e5e5e9]'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${showNewDx ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {showNewDx && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-[#7d7d87] mb-1">Nuevo código CIE-10</label>
              <input {...register('new_diag_code')} placeholder="Ej: H52.1" className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
            </div>
            <div>
              <label className="block text-xs text-[#7d7d87] mb-1">Descripción</label>
              <input {...register('new_diag_desc')} placeholder="Descripción del diagnóstico" className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
            </div>
          </div>
        )}
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Plan de Continuidad</p>
        <div className="mb-3">
          <p className="text-xs text-[#7d7d87] mb-2">Decisión sobre corrección óptica</p>
          <div className="flex gap-2">
            {OPTICAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('optical_decision', opt.value)}
                className={`border rounded-lg px-4 py-2 text-sm transition-colors ${
                  opticalDecision === opt.value
                    ? 'border-[#0f8f64] bg-[#e5f6ef] text-[#0f8f64]'
                    : 'border-[#e5e5e9] text-[#7d7d87] hover:border-[#0f8f64]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Próximo control</label>
            <input type="date" {...register('next_control_date')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" />
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Intervalo</label>
            <select {...register('next_control_interval')} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]">
              <option value="">Seleccionar</option>
              {INTERVAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#7d7d87] mb-1">Educación al paciente</label>
          <textarea {...register('patient_education')} rows={3} className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]" placeholder="Instrucciones y recomendaciones para el paciente..." />
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
