import { z } from 'zod';

export const laboratoryFormSchema = z.object({
  name: z.string().min(1, 'El nombre del laboratorio es obligatorio'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .refine((s) => s.trim() === '' || z.string().email().safeParse(s.trim()).success, {
      message: 'Correo electrónico inválido',
    }),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

export type LaboratoryFormInput = z.infer<typeof laboratoryFormSchema>;
