import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { userService, type User } from '@/services/userService';
import UserFormShell from './UserFormShell';
import type { AdminUserFormInput } from './userSchemas';
import { roleLabel } from './usersTableColumns';

const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = id ? Number(id) : NaN;

  const { data: loaded, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getById(userId),
    enabled: Number.isFinite(userId),
  });

  const form = useForm<AdminUserFormInput>({
    defaultValues: {
      name: '',
      last_name: '',
      email: '',
      identification: '',
      phone: '',
      password: '',
      confirm_password: '',
      role: 'receptionist',
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!loaded) return;
    reset({
      name: loaded.name,
      last_name: loaded.last_name || '',
      email: loaded.email,
      identification: loaded.identification || '',
      phone: loaded.phone || '',
      password: '',
      confirm_password: '',
      role: loaded.role,
    });
  }, [loaded, reset]);

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      navigate('/admin/users', { replace: true });
    }
  }, [userId, navigate]);

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
  const roleText = roleLabel[loaded.role];

  return (
    <UserFormShell
      mode="view"
      title="Detalle del usuario"
      breadcrumb="Administración / Detalle del usuario"
      form={form}
      onSubmit={async () => {}}
      onCancel={() => navigate('/admin/users')}
      isSubmitting={false}
      submitLabel=""
      asideUser={loaded as User}
      footerNote={`Solo lectura · ${fullName} · ${roleText}`}
      onEdit={() => navigate(`/admin/users/${loaded.id}/edit`)}
    />
  );
};

export default UserDetailPage;
