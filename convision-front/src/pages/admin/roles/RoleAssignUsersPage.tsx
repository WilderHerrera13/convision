import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import rolesApi, { RoleUser } from '@/services/roles';
import { userService } from '@/services/userService';

function getInitials(name: string, lastName?: string) {
  const full = [name, lastName].filter(Boolean).join(' ');
  return full
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const RoleAssignUsersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roleId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: role } = useQuery({
    queryKey: ['roles', roleId],
    queryFn: () => rolesApi.getRole(roleId),
    enabled: !!roleId,
  });

  const { data: assignedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['role-users', roleId],
    queryFn: () => rolesApi.getRoleUsers(roleId),
    enabled: !!roleId,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['users-search', searchQuery],
    queryFn: () => userService.getUsers({ page: 1, per_page: 10, search: searchQuery }),
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const assignMutation = useMutation({
    mutationFn: (userId: number) => rolesApi.assignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-users', roleId] });
      setSearchQuery('');
      setShowSuggestions(false);
      toast({ title: 'Usuario asignado', description: 'El usuario ha sido asignado al rol exitosamente.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => rolesApi.removeRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-users', roleId] });
      toast({ title: 'Usuario removido', description: 'El usuario ha sido removido del rol.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const assignedIds = new Set(assignedUsers.map((u) => u.id));
  const suggestions = (searchResults?.users ?? []).filter((u) => !assignedIds.has(u.id));

  const roleName = role?.name ?? 'Rol';

  return (
    <PageLayout
      title={`${roleName} — Usuarios asignados`}
      subtitle="Gestión de Roles / Asignar Usuarios"
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <Button variant="outline" className="min-w-[140px]" onClick={() => navigate('/admin/roles')}>
          Volver
        </Button>
      }
    >
      <div className="flex gap-6 items-start">
        <Card className="flex-1 min-w-0 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5">
              <p className="text-[15px] font-semibold text-[#0f0f12]">
                Usuarios asignados ({assignedUsers.length})
              </p>
              <p className="text-[12px] text-[#7d7d87] mt-0.5">
                Los usuarios listados tienen los permisos del rol {roleName}
              </p>
            </div>

            <div className="relative mb-4 max-w-[360px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#7d7d87]" />
              <Input
                className="pl-9 text-[13px]"
                placeholder="Buscar usuario para asignar..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-[#e5e5e9] rounded-md shadow-lg overflow-hidden">
                  {suggestions.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f5f8] text-left"
                      onClick={() => assignMutation.mutate(user.id)}
                    >
                      <div className="size-8 rounded-full bg-convision-light flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-semibold text-convision-primary">
                          {getInitials(user.name, user.last_name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#0f0f12]">{user.name} {user.last_name}</p>
                        <p className="text-[11px] text-[#7d7d87]">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingUsers ? (
              <div className="py-8 text-center text-[12px] text-[#7d7d87]">Cargando usuarios...</div>
            ) : assignedUsers.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[#7d7d87]">
                No hay usuarios asignados a este rol
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#f0f0f4]">
                {assignedUsers.map((user: RoleUser) => (
                  <div key={user.id} className="flex items-center gap-4 py-4">
                    <div className="size-9 rounded-full bg-convision-light flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-semibold text-convision-primary">
                        {getInitials(user.name, user.last_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0f0f12]">{user.name} {user.last_name}</p>
                      <p className="text-[11px] text-[#7d7d87]">{user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-[#7d7d87] hover:text-red-500 hover:bg-red-50"
                      onClick={() => removeMutation.mutate(user.id)}
                      disabled={removeMutation.isPending}
                      title="Remover del rol"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="w-[332px] shrink-0">
          <Card className="border border-[#ebebee] shadow-sm bg-[#f8f8fb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Diamond className="size-3 text-convision-primary fill-convision-primary shrink-0" />
                <p className="text-[12px] font-semibold text-[#0f0f12]">Asignación de roles</p>
              </div>
              <p className="text-[11px] text-[#4b4b57] leading-[1.6]">
                Los usuarios pueden tener múltiples roles. Los permisos se combinan: un usuario con "Vendedor" y "Supervisor" tendrá acceso a los módulos de ambos roles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default RoleAssignUsersPage;
