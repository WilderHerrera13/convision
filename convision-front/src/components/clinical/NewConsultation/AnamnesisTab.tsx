import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AnamnesisInput } from '@/services/clinicalRecordService';
import { AnamnesisSection1 } from './AnamnesisSection1';
import { AnamnesisSection2 } from './AnamnesisSection2';
import { AnamnesisSection3 } from './AnamnesisSection3';
import { AnamnesisSection4 } from './AnamnesisSection4';
import { AnamnesisSection5 } from './AnamnesisSection5';

const schema = z.object({
  reason_for_visit: z.string().min(1, 'El motivo de consulta es requerido'),
  onset: z.string().optional(),
  duration: z.string().optional(),
  character: z.string().optional(),
  associated_symptoms: z.array(z.string()).optional(),
  has_diabetes: z.string().optional(),
  diabetes_diagnosis_year: z.string().optional(),
  diabetes_hba1c: z.string().optional(),
  has_hypertension: z.string().optional(),
  hypertension_diagnosis_year: z.string().optional(),
  hypertension_medication: z.string().optional(),
  allergies: z.string().optional(),
  current_medications: z.string().optional(),
  other_systemic_conditions: z.array(z.string()).optional(),
  previous_eye_surgeries: z.string().optional(),
  lens_use: z.string().optional(),
  correction_type: z.string().optional(),
  lens_satisfaction: z.string().optional(),
  previous_ocular_trauma: z.string().optional(),
  previous_ocular_pathologies: z.string().optional(),
  family_ophthalmic_conditions: z.array(z.string()).optional(),
  family_observations: z.string().optional(),
  takes_corticosteroids: z.boolean().optional(),
  takes_hydroxychloroquine: z.boolean().optional(),
  takes_tamsulosin: z.boolean().optional(),
  takes_antihistamines: z.boolean().optional(),
  takes_antihypertensives: z.boolean().optional(),
  takes_amiodarone: z.boolean().optional(),
});

export type AnamnesisFormData = z.infer<typeof schema>;

interface AnamnesisTabProps {
  defaultValues?: Partial<AnamnesisInput>;
  onSave: (data: AnamnesisInput) => Promise<void>;
  isSaving?: boolean;
}

export function AnamnesisTab({ defaultValues, onSave, isSaving }: AnamnesisTabProps) {
  const methods = useForm<AnamnesisFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      associated_symptoms: [],
      other_systemic_conditions: [],
      family_ophthalmic_conditions: [],
      takes_corticosteroids: false,
      takes_hydroxychloroquine: false,
      takes_tamsulosin: false,
      takes_antihistamines: false,
      takes_antihypertensives: false,
      takes_amiodarone: false,
      ...defaultValues,
    },
  });

  const onSubmit = async (data: AnamnesisFormData) => {
    await onSave(data as AnamnesisInput);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="px-8 py-7">
        <AnamnesisSection1 />
        <AnamnesisSection2 />
        <AnamnesisSection3 />
        <AnamnesisSection4 />
        <AnamnesisSection5 />

        <div className="mt-8">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#0f8f64] text-white h-9 px-6 rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Siguiente: Examen Visual →'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
