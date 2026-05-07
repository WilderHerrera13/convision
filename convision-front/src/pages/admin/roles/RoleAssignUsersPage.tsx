import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import rolesApi, { RoleUser, Permission } from '@/services/roles';
import { userService } from '@/services/userService';
import { labelModule } from '@/lib/permission-labels';

const CRUD_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
const CRUD_LABELS: Record<(typeof CRUD_ACTIONS)[number], string> = {
  view: 'VER',
  create: 'CREAR',
  edit: 'EDITAR',
  delete: 'ELIMINAR',
};

function buildPermMatrix(permissions: Permission[]): Map<string, Set<string>> {
  const matrix = new Map<string, Set<string>>();
  for (const p of permissions) {
    if (!matrix.has(p.module)) matrix.set(p.module, new Set());
    matrix.get(p.module)!.add(p.action);
  }
  return matrix;
}

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
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');

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
  const suggestions = (searchResults?.data ?? []).filter((u) => !assignedIds.has(u.id));

  const roleName = role?.name ?? 'Rol';

  const permMatrix = buildPermMatrix(role?.permissions ?? []);
  const permModules = Array.from(permMatrix.keys()).sort((a, b) =>
    labelModule(a).localeCompare(labelModule(b)),
  );

  return (
    <PageLayout
      title={`${roleName} — Detalle`}
      subtitle="Gestión de Roles / Detalle del rol"
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="min-w-[140px]" onClick={() => navigate('/admin/roles')}>
            Volver
          </Button>
          <Button
            className="min-w-[140px] bg-convision-primary text-white hover:bg-convision-dark"
            onClick={() => navigate(`/admin/roles/${roleId}/edit`)}
          >
            Editar rol
          </Button>
        </div>
      }
    >
      <div className="flex gap-6 items-start">
        <Card className="flex-1 min-w-0 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
          <div className="border-b border-[#e5e5e9] bg-[#fafafb] flex">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-5 h-12 text-[12px] font-semibold border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-convision-primary text-[#0f0f12] bg-white'
                  : 'border-transparent text-[#7d7d87] hover:text-[#0f0f12]'
              }`}
            >
              Usuarios asignados
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`px-5 h-12 text-[12px] font-semibold border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-convision-primary text-[#0f0f12] bg-white'
                  : 'border-transparent text-[#7d7d87] hover:text-[#0f0f12]'
              }`}
            >
              Permisos del rol
            </button>
          </div>

          <CardContent className="p-6">
            {activeTab === 'users' && (
              <>
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
              </>
            )}

            {activeTab === 'permissions' && (
              <>
                <div className="mb-5">
                  <p className="text-[15px] font-semibold text-[#0f0f12]">Matriz de permisos</p>
                  <p className="text-[12px] text-[#7d7d87] mt-0.5">
                    Accesos que otorga el rol <span className="font-medium text-[#0f0f12]">{roleName}</span>
                  </p>
                </div>

                {permModules.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-[#7d7d87]">
                    Este rol no tiene permisos configurados
                  </div>
                ) : (
                  <div>
                    <div className="flex h-8 items-center bg-[#f9f9fb]">
                      <div className="flex-1 pl-2">
                        <span className="text-[9px] font-semibold tracking-[0.8px] text-[#7d7d87]">MÓDULO</span>
                      </div>
                      {CRUD_ACTIONS.map((action) => (
                        <div
                          key={action}
                          className="flex w-[100px] shrink-0 items-center justify-center border-l border-[#ebebee]"
                        >
                          <span className="text-[9px] font-semibold tracking-[0.8px] text-[#7d7d87]">
                            {CRUD_LABELS[action]}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-[#e5e5e9]" />

                    {permModules.map((mod, idx) => {
                      const actions = permMatrix.get(mod)!;
                      return (
                        <div key={mod}>
                          <div className={`flex h-9 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                            <div className="flex-1 pl-2">
                              <span className="text-[12px] text-[#0f0f12]">{labelModule(mod)}</span>
                            </div>
                            {CRUD_ACTIONS.map((action) => (
                              <div
                                key={action}
                                className="flex w-[100px] shrink-0 items-center justify-center border-l border-[#ebebee]"
                              >
                                {actions.has(action) ? (
                                  <span className="size-2 rounded-[4px] bg-[#228b52]" />
                                ) : (
                                  <span className="h-0.5 w-3.5 rounded-sm bg-[#dcdce0]" />
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="h-px bg-[#f0f0f2]" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="w-[332px] shrink-0 flex flex-col gap-4">
          {activeTab === 'users' ? (
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
          ) : (
            <>
              <Card className="overflow-hidden border border-[#ebebee] shadow-sm">
                <div className="border-b border-[#e5e5e9] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#0f0f12]">
                    <span className="mr-2 text-[10px] text-convision-primary">◆</span>
                    Lectura de la matriz
                  </p>
                </div>
                <CardContent className="space-y-3 p-4 text-[12px]">
                  <div className="flex gap-2 items-center">
                    <span className="size-2 rounded-[4px] bg-[#228b52] shrink-0" />
                    <p className="text-[11px] text-[#4b4b57]">Permiso otorgado por este rol</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="h-0.5 w-3.5 rounded-sm bg-[#dcdce0] shrink-0" />
                    <p className="text-[11px] text-[#4b4b57]">Permiso no incluido en este rol</p>
                  </div>
                </CardContent>
              </Card>
              <div className="rounded-lg border border-[#c5d3f8] bg-[#eff1ff] p-3.5 text-[#3a71f7]">
                <p className="text-[13px] font-semibold">
                  <span className="mr-2 text-[10px]">◆</span>
                  Permisos acumulativos
                </p>
                <p className="mt-2 text-[12px] leading-snug">
                  Si el usuario tiene varios roles, los accesos se suman. Un permiso en cualquier rol lo otorga.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default RoleAssignUsersPage;
