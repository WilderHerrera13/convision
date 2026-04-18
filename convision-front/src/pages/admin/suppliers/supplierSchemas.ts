import { z } from 'zod';

export const supplierFormSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(1, 'Campo obligatorio'),
  personType: z.enum(['natural', 'juridica']),
  companySubtype: z.string().optional(),
  country: z.string().min(1, 'Campo obligatorio'),
  city: z.string().min(1, 'Campo obligatorio'),
  paymentMethod: z.string().min(1, 'Campo obligatorio'),
  paymentTermDays: z.string().min(1, 'Campo obligatorio'),
  discountPercent: z.string().optional(),
  creditLimit: z.string().optional(),
  notes: z.string().optional(),
  contactName: z.string().min(1, 'Campo obligatorio'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().min(1, 'Campo obligatorio'),
  phoneAlt: z.string().optional(),
  email: z.string().min(1, 'Campo obligatorio').email('Correo inválido'),
  website: z.string().optional(),
  address: z.string().min(1, 'Campo obligatorio'),
});

export type SupplierFormInput = z.infer<typeof supplierFormSchema>;
