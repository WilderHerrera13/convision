import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AnamnesisInput } from '@/services/clinicalRecordService';

const schema = z.object({
  reason_for_visit: z.string().min(1, 'El motivo de consulta es requerido'),
  systemic_background: z.string().optional(),
  ocular_background: z.string().optional(),
  family_background: z.string().optional(),
  pharmacological_background: z.string().optional(),
  current_correction_type: z.enum(['gafas_vl', 'gafas_vp', 'progresivos', 'lc', 'ninguna', '']).optional(),
  current_correction_time: z.string().optional(),
});

type AnamnesisFormData = z.infer<typeof schema>;

interface AnamnesisTabProps {
  defaultValues?: Partial<AnamnesisInput>;
  onSave: (data: AnamnesisInput) => Promise<void>;
  isSaving?: boolean;
}

export function AnamnesisTab({ defaultValues, onSave, isSaving }: AnamnesisTabProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<AnamnesisFormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as AnamnesisFormData,
  });

  const onSubmit = async (data: AnamnesisFormData) => {
    await onSave(data as AnamnesisInput);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <label className="block text-sm font-medium text-[#0f0f12] mb-1">Motivo de consulta *</label>
        <textarea
          {...register('reason_for_visit')}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Describa el motivo principal de la consulta"
        />
        {errors.reason_for_visit && (
          <p className="text-xs text-red-500 mt-1">{errors.reason_for_visit.message}</p>
        )}
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-2">Antecedentes sistémicos</p>
        <textarea
          {...register('systemic_background')}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Hipertensión, Diabetes, Alergias, Artritis, Tiroides, Otros..."
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-2">Antecedentes oculares</p>
        <textarea
          {...register('ocular_background')}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Cirugía ocular, Trauma ocular, Glaucoma, Cataratas, Otras enfermedades oculares..."
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-2">Antecedentes familiares</p>
        <textarea
          {...register('family_background')}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Glaucoma familiar, Diabetes familiar, Otras enfermedades familiares..."
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-2">Antecedentes farmacológicos</p>
        <textarea
          {...register('pharmacological_background')}
          className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
          placeholder="Medicamentos actuales..."
        />
      </div>

      <div className="border border-[#e5e5e9] rounded-xl p-4">
        <p className="text-sm font-medium text-[#0f0f12] mb-2">Corrección óptica en uso</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Tipo de corrección</label>
            <select
              {...register('current_correction_type')}
              className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
            >
              <option value="">Seleccionar</option>
              <option value="ninguna">Ninguna</option>
              <option value="gafas_vl">Gafas VL</option>
              <option value="gafas_vp">Gafas VP</option>
              <option value="progresivos">Progresivos</option>
              <option value="lc">Lentes de contacto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#7d7d87] mb-1">Tiempo de uso</label>
            <input
              {...register('current_correction_time')}
              className="w-full border border-[#e5e5e9] rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f8f64]"
              placeholder="Ej: 2 años"
            />
          </div>
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
