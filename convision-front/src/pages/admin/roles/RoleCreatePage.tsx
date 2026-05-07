import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import rolesApi, { CreateRoleInput } from '@/services/roles';
import RoleFormShell from './RoleFormShell';

const RoleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateRoleInput) => rolesApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Rol creado', description: 'El rol ha sido creado exitosamente.' });
      navigate('/admin/roles');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <RoleFormShell
      mode="create"
      onSubmit={(data) => createMutation.mutate(data)}
      onCancel={() => navigate('/admin/roles')}
      isPending={createMutation.isPending}
    />
  );
};

export default RoleCreatePage;
