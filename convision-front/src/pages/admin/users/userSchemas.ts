import * as z from 'zod';

export type AdminUserFormInput = {
  name: string;
  last_name: string;
  email: string;
  identification: string;
  phone: string;
  password: string;
  confirm_password: string;
  role: 'admin' | 'specialist' | 'receptionist';
};

const passwordStrong = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/, 'Debe incluir letras y números');

const phoneOptional = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || v.length >= 10, 'Mínimo 10 caracteres');

export const createUserFormSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    last_name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    identification: z.string().min(8, 'Mínimo 8 caracteres'),
    phone: phoneOptional,
    password: passwordStrong,
    confirm_password: z.string().min(1, 'Confirma la contraseña'),
    role: z.enum(['admin', 'specialist', 'receptionist'], {
      required_error: 'Selecciona un rol',
    }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

export const editUserFormSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    last_name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    identification: z.string().min(8, 'Mínimo 8 caracteres'),
    phone: phoneOptional,
    password: z.string().optional().transform((v) => (v ?? '').trim()),
    confirm_password: z.string().optional().transform((v) => (v ?? '').trim()),
    role: z.enum(['admin', 'specialist', 'receptionist'], {
      required_error: 'Selecciona un rol',
    }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })
  .refine((d) => !d.password || passwordStrong.safeParse(d.password).success, {
    message: 'Mínimo 8 caracteres con letras y números',
    path: ['password'],
  });

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;
