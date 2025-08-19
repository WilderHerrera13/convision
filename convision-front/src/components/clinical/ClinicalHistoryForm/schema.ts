import * as z from 'zod';

// Enhanced form validation schema
export const clinicalHistorySchema = z.object({
  patient_id: z.number(),
  document: z.string()
    .refine((val) => !val || val.length === 0 || (val.length >= 7 && val.length <= 10), {
      message: 'El documento debe tener entre 7 y 10 dígitos'
    })
    .refine((val) => !val || val.length === 0 || /^\d+$/.test(val), {
      message: 'El documento solo puede contener números'
    }),
  name: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 100, {
      message: 'El nombre no debe exceder 100 caracteres'
    }),
  edad: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 3, {
      message: 'La edad no debe exceder 3 dígitos'
    })
    .refine((val) => !val || val.length === 0 || /^\d*$/.test(val), {
      message: 'La edad solo puede contener números'
    })
    .optional(),
  afiliacion: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 40, {
      message: 'La afiliación no debe exceder 40 caracteres'
    })
    .optional(),
  salud: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 40, {
      message: 'El campo salud no debe exceder 40 caracteres'
    })
    .optional(),
  ocupacion: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 40, {
      message: 'La ocupación no debe exceder 40 caracteres'
    })
    .optional(),
  ultimo_control_visual: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 30, {
      message: 'El último control visual no debe exceder 30 caracteres'
    }),
  tipo_consulta: z.string().default('CONSULTA DE PRIMERA VEZ POR OPTOMETRIA'),
  tipo_atencion: z.string().default('INTRAMURAL'),
  causa_externa: z.string().default('ENFERMEDAD GENERAL'),
  finalidad_consulta: z.string().default('OTRA'),
  // Acompañante y Responsable fields
  acompañante_no_aplica: z.boolean().default(true),
  acompañante_nombre: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 100, {
      message: 'El nombre del acompañante no debe exceder 100 caracteres'
    })
    .optional(),
  acompañante_documento: z.string()
    .refine((val) => !val || val.length === 0 || (val.length >= 7 && val.length <= 10), {
      message: 'El documento debe tener entre 7 y 10 dígitos'
    })
    .refine((val) => !val || val.length === 0 || /^\d*$/.test(val), {
      message: 'El documento solo puede contener números'
    })
    .optional(),
  acompañante_telefono: z.string()
    .refine((val) => !val || val.length === 0 || /^\d{10}$/.test(val), {
      message: 'Incorrecto numero de celular'
    })
    .optional(),
  responsable_no_aplica: z.boolean().default(true),
  responsable_nombre: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 100, {
      message: 'El nombre del responsable no debe exceder 100 caracteres'
    })
    .optional(),
  responsable_documento: z.string()
    .refine((val) => !val || val.length === 0 || (val.length >= 7 && val.length <= 10), {
      message: 'El documento debe tener entre 7 y 10 dígitos'
    })
    .refine((val) => !val || val.length === 0 || /^\d*$/.test(val), {
      message: 'El documento solo puede contener números'
    })
    .optional(),
  responsable_telefono: z.string()
    .refine((val) => !val || val.length === 0 || /^\d{10}$/.test(val), {
      message: 'Incorrecto numero de celular'
    })
    .optional(),
  // Motivo Consulta
  motivo_consulta: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 500, {
      message: 'El motivo de consulta no debe exceder 500 caracteres'
    })
    .optional(),
  // Antecedentes
  antecedentes_familiares: z.string().default('NO REFIERE'),
  antecedentes_personales: z.string().default('NO REFIERE'),
  antecedentes_laborales: z.string().default('NO REFIERE'),
  
  // Lensometria fields
  lensometria_od: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 50, {
      message: 'El valor de lensometría no debe exceder 50 caracteres'
    })
    .optional(),
  lensometria_oi: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 50, {
      message: 'El valor de lensometría no debe exceder 50 caracteres'
    })
    .optional(),
  lensometria_add: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 50, {
      message: 'El valor de lensometría no debe exceder 50 caracteres'
    })
    .optional(),

  // Agudeza Visual - Lejania fields
  agudeza_lejania_sc_1: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_lejania_cc_1: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_lejania_ph_1: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_lejania_sc_2: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_lejania_cc_2: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_lejania_ph_2: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),

  // Agudeza Visual - Cercania fields
  agudeza_cercania_sc_1: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_cercania_cc_1: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_cercania_ph_1: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_cercania_sc_2: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_cercania_cc_2: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),
  agudeza_cercania_ph_2: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 10, {
      message: 'La agudeza visual no debe exceder 10 caracteres'
    })
    .optional(),

  // New sections for examination
  examen_externo: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 1000, {
      message: 'El examen externo no debe exceder 1000 caracteres'
    })
    .optional(),
  oftalmoscopia: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 1000, {
      message: 'La oftalmoscopia no debe exceder 1000 caracteres'
    })
    .optional(),
  observaciones: z.string()
    .refine((val) => !val || val.length === 0 || val.length <= 1000, {
      message: 'Las observaciones no deben exceder 1000 caracteres'
    })
    .optional(),
}).superRefine((data, ctx) => {
  // Note: Conditional validation for required fields is now handled by soft red borders
  // We only add validation errors here for fields that have content but are invalid
  // Empty required fields are handled visually with soft red borders instead of validation errors
});

export type ClinicalHistoryFormValues = z.infer<typeof clinicalHistorySchema>; 