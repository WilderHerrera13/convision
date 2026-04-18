import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import UserFormShell from './UserFormShell';
import { createUserFormSchema, type AdminUserFormInput } from './userSchemas';

const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdminUserFormInput>({
    resolver: zodResolver(createUserFormSchema),
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

  const onSubmit = async (data: AdminUserFormInput) => {
    setIsSubmitting(true);
    try {
      await userService.create({
        name: data.name,
        last_name: data.last_name,
        email: data.email,
        identification: data.identification,
        phone: data.phone || '',
        password: data.password,
        role: data.role,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuario creado', description: `${data.name} ${data.last_name} se registró correctamente.` });
      navigate('/admin/users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear el usuario';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserFormShell
      mode="create"
      title="Nuevo Usuario"
      breadcrumb="Administración / Nuevo Usuario"
      form={form}
      onSubmit={onSubmit}
      onCancel={() => navigate('/admin/users')}
      isSubmitting={isSubmitting}
      submitLabel="Crear Usuario"
      footerNote="Campos marcados con * son obligatorios"
    />
  );
};

export default UserCreatePage;
