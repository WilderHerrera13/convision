import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import rolesApi, { CreateRoleInput } from '@/services/roles';
import RoleFormShell from './RoleFormShell';

const RoleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roleId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: role, isLoading } = useQuery({
    queryKey: ['roles', roleId],
    queryFn: () => rolesApi.getRole(roleId),
    enabled: !!roleId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateRoleInput) => rolesApi.updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Rol actualizado', description: 'El rol ha sido actualizado exitosamente.' });
      navigate('/admin/roles');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <LoadingScreen variant="default" />;

  return (
    <RoleFormShell
      mode="edit"
      role={role}
      onSubmit={(data) => updateMutation.mutate(data)}
      onCancel={() => navigate('/admin/roles')}
      isPending={updateMutation.isPending}
    />
  );
};

export default RoleEditPage;
