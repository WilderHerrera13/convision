import * as z from 'zod';

export type UserBranchAssignmentItem = {
  branch_id: number;
  is_primary: boolean;
  name?: string;
};

export type AdminUserFormInput = {
  name: string;
  last_name: string;
  email: string;
  identification: string;
  phone: string;
  password: string;
  confirm_password: string;
  role: 'admin' | 'specialist' | 'receptionist';
  branch_ids: number[];
  primary_branch_id: number | null;
};

const passwordStrong = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ]).+$/, 'Debe incluir al menos una letra');

const phoneOptional = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || v.length >= 10, 'Mínimo 10 caracteres');

const branchFields = {
  branch_ids: z.array(z.number().int().positive()),
  primary_branch_id: z.number().int().positive().nullable(),
};

function branchRefine<T extends { role: string; branch_ids: number[]; primary_branch_id: number | null }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.role === 'admin') return;
  if (data.role !== 'specialist' && data.role !== 'receptionist') return;
  if (data.branch_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecciona al menos una sede.',
      path: ['branch_ids'],
    });
    return;
  }
  const primary =
    data.branch_ids.length === 1
      ? data.branch_ids[0]
      : data.primary_branch_id && data.branch_ids.includes(data.primary_branch_id)
        ? data.primary_branch_id
        : null;
  if (primary == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Indica la sede principal.',
      path: ['primary_branch_id'],
    });
  }
}

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
    ...branchFields,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })
  .superRefine((data, ctx) => branchRefine(data, ctx));

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
    ...branchFields,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })
  .refine((d) => !d.password || passwordStrong.safeParse(d.password).success, {
    message: 'Mínimo 8 caracteres con letras y números',
    path: ['password'],
  })
  .superRefine((data, ctx) => branchRefine(data, ctx));

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export function branchFormDefaultsFromAssignments(
  list: UserBranchAssignmentItem[] | undefined,
): { branch_ids: number[]; primary_branch_id: number | null } {
  if (!list?.length) return { branch_ids: [], primary_branch_id: null };
  const branch_ids = list.map((a) => a.branch_id);
  const primary = list.find((a) => a.is_primary)?.branch_id ?? branch_ids[0] ?? null;
  return { branch_ids, primary_branch_id: primary };
}

export function toBranchAssignPayload(
  role: AdminUserFormInput['role'],
  branch_ids: number[],
  primary_branch_id: number | null,
): { branch_id: number; is_primary: boolean }[] {
  if (role === 'admin') return [];
  if (branch_ids.length === 0) return [];
  const primary =
    branch_ids.length === 1
      ? branch_ids[0]
      : primary_branch_id && branch_ids.includes(primary_branch_id)
        ? primary_branch_id
        : branch_ids[0];
  return branch_ids.map((id) => ({ branch_id: id, is_primary: id === primary }));
}
