import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import SearchableCombobox from '@/components/ui/SearchableCombobox';
import rolesApi, { Role } from '@/services/roles';
import { labelModule } from '@/lib/permission-labels';

const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
const ACTION_LABELS: Record<(typeof ACTIONS)[number], string> = {
  view: 'VER',
  create: 'CREAR',
  edit: 'EDITAR',
  delete: 'ELIMINAR',
};

interface Props {
  userId: number;
  readOnly?: boolean;
}

const UserRolesSection: React.FC<Props> = ({ userId, readOnly = false }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCombobox, setShowCombobox] = useState(false);

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => rolesApi.getUserRoles(userId),
    enabled: !!userId,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getForTable({ per_page: 100 }).then((r) => r.data),
    enabled: !readOnly,
  });

  const { data: effectivePerms = [] } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => rolesApi.getUserPermissions(userId),
    enabled: !!userId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
  };

  const assignMutation = useMutation({
    mutationFn: (roleId: number) => rolesApi.assignRole(userId, roleId),
    onSuccess: () => {
      invalidateAll();
      setShowCombobox(false);
      toast({ title: 'Rol asignado', description: 'El rol ha sido asignado al usuario.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: (roleId: number) => rolesApi.removeRole(userId, roleId),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Rol removido', description: 'El rol ha sido removido del usuario.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const assignedIds = new Set(userRoles.map((r) => r.id));
  const availableRoles = allRoles.filter((r) => !assignedIds.has(r.id));

  const permMatrix = new Map<string, Set<string>>();
  for (const key of Array.isArray(effectivePerms) ? effectivePerms : []) {
    const [mod, action] = key.split(':');
    if (!mod || !action) continue;
    if (!permMatrix.has(mod)) {
      permMatrix.set(mod, new Set());
    }
    permMatrix.get(mod)!.add(action);
  }

  const modules = Array.from(permMatrix.keys()).sort((a, b) =>
    labelModule(a).localeCompare(labelModule(b)),
  );

  return (
    <div className="px-8 py-6">
      <p className="text-[13px] font-semibold text-[#0f0f12]">Roles asignados</p>
      <div className="mt-3 h-px bg-[#f0f0f2]" />

      <p className="mt-4 text-[11px] font-medium text-[#121215]">Roles del usuario *</p>

      <div className="mt-2 flex min-h-[44px] w-full flex-wrap items-center gap-2 rounded-[6px] border border-[#e0e0e5] bg-white px-2.5 py-2">
        {userRoles.map((role: Role) => (
          <span
            key={role.id}
            className="inline-flex items-center gap-1 rounded-full border border-[#c5d3f8] bg-[#eff1ff] px-2.5 py-0.5 text-[11px] font-medium text-[#3a71f7]"
          >
            {role.name}
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeMutation.mutate(role.id)}
                disabled={removeMutation.isPending}
                className="ml-0.5 text-[13px] leading-none hover:text-[#1a4fd6] disabled:opacity-50"
              >
                ×
              </button>
            )}
          </span>
        ))}

        {!readOnly && (
          showCombobox ? (
            <div className="flex items-center gap-2">
              <SearchableCombobox
                options={availableRoles.map((r) => ({
                  value: String(r.id),
                  label: r.name,
                  sublabel: r.description,
                }))}
                onChange={(val) => {
                  if (val) assignMutation.mutate(Number(val));
                }}
                placeholder="Seleccionar rol..."
                searchPlaceholder="Buscar rol..."
                emptyText="No hay roles disponibles"
                isLoading={assignMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowCombobox(false)}
                className="text-[11px] text-[#7d7d87] hover:text-[#0f0f12]"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCombobox(true)}
              className="text-[11px] font-semibold text-[#3a71f7] hover:text-[#1a4fd6]"
            >
              + Agregar rol
            </button>
          )
        )}
      </div>

      <p className="mt-3 text-[11px] text-[#7d7d87]">
        Los roles se combinan para determinar los permisos del usuario. Se aplica la unión de accesos.
      </p>

      <div className="mt-4 h-px bg-[#f0f0f2]" />

      <p className="mt-4 text-[13px] font-semibold text-[#0f0f12]">Permisos resultantes</p>
      <p className="mt-1 text-[11px] text-[#7d7d87]">Accesos otorgados por la combinación de roles asignados</p>

      {modules.length === 0 ? (
        <p className="mt-4 text-[12px] italic text-[#7d7d87]">Sin permisos — asigne al menos un rol.</p>
      ) : (
        <div className="mt-3">
          <div className="flex h-8 items-center bg-[#f9f9fb]">
            <div className="flex-1 pl-2">
              <span className="text-[9px] font-semibold tracking-[0.8px] text-[#7d7d87]">MÓDULO</span>
            </div>
            {ACTIONS.map((action) => (
              <div
                key={action}
                className="flex w-[119px] shrink-0 items-center justify-center border-l border-[#ebebee]"
              >
                <span className="text-[9px] font-semibold tracking-[0.8px] text-[#7d7d87]">
                  {ACTION_LABELS[action]}
                </span>
              </div>
            ))}
          </div>
          <div className="h-px bg-[#e5e5e9]" />

          {modules.map((mod, idx) => {
            const actions = permMatrix.get(mod)!;
            return (
              <div key={mod}>
                <div className={`flex h-9 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                  <div className="flex-1 pl-2">
                    <span className="text-[12px] text-[#0f0f12]">{labelModule(mod)}</span>
                  </div>
                  {ACTIONS.map((action) => (
                    <div
                      key={action}
                      className="flex w-[119px] shrink-0 items-center justify-center border-l border-[#ebebee]"
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
    </div>
  );
};

export default UserRolesSection;
