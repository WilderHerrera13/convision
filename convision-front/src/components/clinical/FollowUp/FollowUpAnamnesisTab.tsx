import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FollowUpAnamnesisInput } from '@/services/clinicalRecordService';

const schema = z.object({
  control_reason: z.string().min(1, 'El motivo de control es requerido'),
  correction_satisfaction: z.enum(['muy_buena', 'buena', 'regular', 'mala']).optional(),
  subjective_changes: z.string().optional(),
  new_medications: z.string().optional(),
  systemic_changes: z.string().optional(),
  correction_usage: z.string().optional(),
  daily_usage_hours: z.string().optional(),
  obs_before_exam: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface FollowUpAnamnesisTabProps {
  defaultValues?: Partial<FollowUpAnamnesisInput>;
  onSave: (data: FollowUpAnamnesisInput) => Promise<void>;
  isSaving?: boolean;
}

const SATISFACTION_OPTIONS = [
  { value: 'muy_buena', label: 'Muy buena' },
  { value: 'buena', label: 'Buena' },
  { value: 'regular', label: 'Regular' },
  { value: 'mala', label: 'Mala' },
] as const;

const CORRECTION_USAGE_OPTIONS = [
  { value: 'siempre', label: 'Usa siempre' },
  { value: 'solo_leer', label: 'Solo para leer' },
  { value: 'solo_lejos', label: 'Solo para ver lejos' },
  { value: 'a_veces', label: 'A veces' },
  { value: 'no_usa', label: 'No usa' },
];

export function FollowUpAnamnesisTab({ defaultValues, onSave, isSaving }: FollowUpAnamnesisTabProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as FormData,
  });

  const satisfaction = watch('correction_satisfaction');

  const onSubmit = async (data: FormData) => {
    await onSave(data as FollowUpAnamnesisInput);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <label className="block text-sm font-medium text-[#0f0f12] mb-1">
          Motivo de control *
        </label>
        <p className="text-xs text-[#7d7d87] mb-2">¿Por qué regresa el paciente?</p>
        <textarea
          {...register('control_reason')}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Describa el motivo de este control..."
        />
        {errors.control_reason && (
          <p className="text-xs text-red-500 mt-1">{errors.control_reason.message}</p>
        )}
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Satisfacción con corrección actual</p>
        <div className="flex gap-2 flex-wrap">
          {SATISFACTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue('correction_satisfaction', opt.value)}
              className={`border rounded-lg px-4 py-2 text-sm cursor-pointer transition-colors ${
                satisfaction === opt.value
                  ? 'border-[#0f8f64] bg-[#e5f6ef] text-[#0f8f64]'
                  : 'border-[#e5e5e9] text-[#7d7d87] hover:border-[#0f8f64]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-1">Cambios subjetivos / síntomas nuevos</p>
        <p className="text-xs text-[#7d7d87] mb-2">¿Ha notado cambios en su visión o nuevos síntomas?</p>
        <textarea
          {...register('subjective_changes')}
          rows={3}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-1">Nuevos medicamentos</p>
        <p className="text-xs text-[#7d7d87] mb-2">¿Ha empezado o dejado algún medicamento?</p>
        <textarea
          {...register('new_medications')}
          rows={2}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-1">Cambios sistémicos</p>
        <p className="text-xs text-[#7d7d87] mb-2">Cambios en condiciones sistémicas (diabetes, hipertensión, etc.)</p>
        <textarea
          {...register('systemic_changes')}
          rows={2}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-3">Uso de corrección óptica</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Uso de corrección</label>
            <select
              {...register('correction_usage')}
              className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
            >
              <option value="">Seleccionar</option>
              {CORRECTION_USAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Horas de uso diario</label>
            <input
              {...register('daily_usage_hours')}
              type="text"
              placeholder="Ej: 8-10 horas"
              className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
            />
          </div>
        </div>
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-1">Observaciones previas al examen</p>
        <p className="text-xs text-[#7d7d87] mb-2">Notas adicionales antes del examen visual</p>
        <textarea
          {...register('obs_before_exam')}
          rows={3}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
        />
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
