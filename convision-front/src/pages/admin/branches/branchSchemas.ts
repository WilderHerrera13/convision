import { z } from 'zod';

export const branchFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido').or(z.literal('')),
  is_active: z.boolean(),
});

export type BranchFormInput = z.infer<typeof branchFormSchema>;

export const emptyBranchFormValues: BranchFormInput = {
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  is_active: true,
};
