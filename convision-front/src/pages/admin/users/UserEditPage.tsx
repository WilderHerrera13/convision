import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { userService, type User } from '@/services/userService';
import { branchService } from '@/services/branchService';
import UserFormShell from './UserFormShell';
import {
  branchFormDefaultsFromAssignments,
  editUserFormSchema,
  toBranchAssignPayload,
  type AdminUserFormInput,
} from './userSchemas';

const UserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = id ? Number(id) : NaN;

  const { data: loaded, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getById(userId),
    enabled: Number.isFinite(userId),
  });

  const form = useForm<AdminUserFormInput>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: '',
      last_name: '',
      email: '',
      identification: '',
      phone: '',
      password: '',
      confirm_password: '',
      role: 'receptionist',
      branch_ids: [],
      primary_branch_id: null,
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!loaded) return;
    const br = branchFormDefaultsFromAssignments(loaded.branch_assignments);
    reset({
      name: loaded.name,
      last_name: loaded.last_name || '',
      email: loaded.email,
      identification: loaded.identification || '',
      phone: loaded.phone || '',
      password: '',
      confirm_password: '',
      role: loaded.role,
      branch_ids: br.branch_ids,
      primary_branch_id: br.primary_branch_id,
    });
  }, [loaded, reset]);

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      navigate('/admin/users', { replace: true });
    }
  }, [userId, navigate]);

  const onSubmit = async (data: AdminUserFormInput) => {
    if (!Number.isFinite(userId)) return;
    setIsSubmitting(true);
    try {
      const payload: Parameters<typeof userService.update>[1] = {
        name: data.name,
        last_name: data.last_name,
        email: data.email,
        identification: data.identification,
        phone: data.phone || '',
        role: data.role,
      };
      if (data.password) {
        payload.password = data.password;
      }
      await userService.update(userId, payload);
      const assignments = toBranchAssignPayload(data.role, data.branch_ids, data.primary_branch_id);
      await branchService.assignUserBranches(userId, assignments);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast({
        title: 'Usuario actualizado',
        description: `${data.name} ${data.last_name} se actualizó correctamente.`,
      });
      navigate('/admin/users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar el usuario';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!Number.isFinite(userId)) {
    return null;
  }

  if (isLoading || !loaded) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[420px] w-full rounded-lg" />
      </div>
    );
  }

  const fullName = [loaded.name, loaded.last_name].filter(Boolean).join(' ');
  const roleLabel =
    loaded.role === 'admin' ? 'Administrador' : loaded.role === 'specialist' ? 'Especialista' : 'Recepcionista';

  return (
    <UserFormShell
      mode="edit"
      title="Editar Usuario"
      breadcrumb="Administración / Editar Usuario"
      form={form}
      onSubmit={onSubmit}
      onCancel={() => navigate('/admin/users')}
      isSubmitting={isSubmitting}
      submitLabel="Guardar cambios"
      asideUser={loaded as User}
      footerNote={`Editando: ${fullName} · ${roleLabel}`}
    />
  );
};

export default UserEditPage;
