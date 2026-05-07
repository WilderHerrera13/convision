import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import rolesApi, { Role, Permission, CreateRoleInput } from '@/services/roles';
import { MODULE_ORDER, labelModule, ACTION_LABELS } from '@/lib/permission-labels';

const ACTIONS_ORDER = ['view', 'create', 'edit', 'delete'];
const ACTIONS_ES = ACTION_LABELS;

function groupByModule(permissions: Permission[]): Record<string, Permission[]> {
  const order = MODULE_ORDER;
  const grouped = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);
  const sorted: Record<string, Permission[]> = {};
  order.forEach((m) => { if (grouped[m]) sorted[m] = grouped[m]; });
  Object.keys(grouped).forEach((m) => { if (!sorted[m]) sorted[m] = grouped[m]; });
  return sorted;
}


const roleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  permission_ids: z.array(z.number()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

type Props = {
  mode: 'create' | 'edit';
  role?: Role | null;
  onSubmit: (data: CreateRoleInput) => void;
  onCancel: () => void;
  isPending: boolean;
};

const RoleFormShell: React.FC<Props> = ({ mode, role, onSubmit, onCancel, isPending }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info');

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.getPermissions,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '', permission_ids: [] },
  });

  useEffect(() => {
    form.reset({
      name: role?.name ?? '',
      description: role?.description ?? '',
      permission_ids: role?.permissions?.map((p) => p.id) ?? [],
    });
  }, [role]);

  const permIds = form.watch('permission_ids');
  const grouped = groupByModule(permissions);

  const getModulePerms = (mod: string, action: string): Permission[] =>
    (grouped[mod] ?? []).filter((p) => p.action === action);

  const hasAction = (mod: string, action: string): boolean =>
    getModulePerms(mod, action).some((p) => permIds.includes(p.id));

  const allChecked = (mod: string): boolean =>
    (grouped[mod] ?? []).every((p) => permIds.includes(p.id));

  const toggleAction = (mod: string, action: string, checked: boolean) => {
    const perms = getModulePerms(mod, action).map((p) => p.id);
    const current = form.getValues('permission_ids');
    form.setValue(
      'permission_ids',
      checked ? [...new Set([...current, ...perms])] : current.filter((id) => !perms.includes(id)),
      { shouldDirty: true },
    );
  };

  const toggleAll = (mod: string, checked: boolean) => {
    const modIds = (grouped[mod] ?? []).map((p) => p.id);
    const current = form.getValues('permission_ids');
    form.setValue(
      'permission_ids',
      checked ? [...new Set([...current, ...modIds])] : current.filter((id) => !modIds.includes(id)),
      { shouldDirty: true },
    );
  };

  const handleSubmit = (values: RoleFormValues) => {
    onSubmit({ name: values.name, description: values.description ?? '', permission_ids: values.permission_ids });
  };

  const title = mode === 'create' ? 'Nuevo Rol' : 'Editar Rol';
  const breadcrumb = mode === 'create' ? 'Gestión de Roles / Nuevo Rol' : 'Gestión de Roles / Editar Rol';

  return (
    <PageLayout
      title={title}
      subtitle={breadcrumb}
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-w-[140px]" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="role-form"
            className="min-w-[140px] bg-convision-primary text-white hover:bg-convision-dark"
            disabled={isPending || loadingPerms}
          >
            {isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Guardando...</> : mode === 'create' ? 'Crear Rol' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <form id="role-form" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex min-h-0 gap-6 items-start">
          <Card className="flex-1 min-w-0 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
            <div className="border-b border-[#e5e5e9] bg-[#fafafb] flex">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-5 h-12 text-[12px] font-semibold border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-convision-primary text-[#0f0f12] bg-white'
                    : 'border-transparent text-[#7d7d87] hover:text-[#0f0f12]'
                }`}
              >
                Información del rol
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
                Permisos
              </button>
            </div>
            <CardContent className="p-8">
              {activeTab === 'info' && (
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-[13px] font-semibold text-[#0f0f12] mb-3">Información básica</p>
                    <div className="h-px bg-[#e5e5e9] mb-5" />
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-[#4b4b57]">
                          Nombre del rol <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...form.register('name')}
                          placeholder="ej. Vendedor Senior"
                          className="text-[13px]"
                        />
                        {form.formState.errors.name && (
                          <p className="text-[11px] text-red-500">{form.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-[#4b4b57]">Descripción</label>
                        <Textarea
                          {...form.register('description')}
                          placeholder="Describe el propósito y alcance de este rol..."
                          className="text-[13px] min-h-[72px] resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-[#0f0f12] mb-3">Matriz de permisos</p>
                    <div className="h-px bg-[#e5e5e9] mb-4" />
                    {loadingPerms ? (
                      <div className="flex items-center gap-2 py-6 text-[12px] text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Cargando permisos...
                      </div>
                    ) : (
                      <PermissionMatrix
                        grouped={grouped}
                        hasAction={hasAction}
                        allChecked={allChecked}
                        toggleAction={toggleAction}
                        toggleAll={toggleAll}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'permissions' && (
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12] mb-3">Matriz de permisos</p>
                  <div className="h-px bg-[#e5e5e9] mb-4" />
                  {loadingPerms ? (
                    <div className="flex items-center gap-2 py-6 text-[12px] text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Cargando permisos...
                    </div>
                  ) : (
                    <PermissionMatrix
                      grouped={grouped}
                      hasAction={hasAction}
                      allChecked={allChecked}
                      toggleAction={toggleAction}
                      toggleAll={toggleAll}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="w-[332px] shrink-0 flex flex-col gap-4">
            <Card className="border border-[#ebebee] shadow-sm">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Diamond className="size-3 text-convision-primary fill-convision-primary shrink-0" />
                  <p className="text-[13px] font-semibold text-[#0f0f12]">¿Qué es un rol?</p>
                </div>
                <div className="flex flex-col gap-4">
                  <InfoItem
                    title="Agrupa permisos"
                    description="Define qué puede hacer un usuario en cada módulo"
                  />
                  <InfoItem
                    title="Reutilizable"
                    description="Asigna el mismo rol a múltiples usuarios"
                  />
                  <InfoItem
                    title="Flexible"
                    description="Un usuario puede tener uno o varios roles"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#ebebee] shadow-sm bg-[#f8f8fb]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Diamond className="size-3 text-convision-primary fill-convision-primary shrink-0" />
                  <p className="text-[12px] font-semibold text-[#0f0f12]">Consejo: Roles vs Usuarios</p>
                </div>
                <p className="text-[11px] text-[#4b4b57] leading-[1.6]">
                  Los permisos de todos los roles asignados se combinan. Si un usuario tiene "Vendedor" y "Supervisor", tendrá los permisos de ambos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <div className="mt-6 border-t border-[#e5e5e9] pt-4 text-[12px] text-[#7d7d87]">
        Campos marcados con * son obligatorios
      </div>
    </PageLayout>
  );
};

type MatrixProps = {
  grouped: Record<string, Permission[]>;
  hasAction: (mod: string, action: string) => boolean;
  allChecked: (mod: string) => boolean;
  toggleAction: (mod: string, action: string, checked: boolean) => void;
  toggleAll: (mod: string, checked: boolean) => void;
};

const PermissionMatrix: React.FC<MatrixProps> = ({
  grouped, hasAction, allChecked, toggleAction, toggleAll,
}) => {
  const modules = Object.keys(grouped);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#e5e5e9]">
            <th className="text-left py-2 px-2 font-semibold text-[#7d7d87] uppercase tracking-wide w-[240px]">Módulo</th>
            {ACTIONS_ORDER.map((action) => (
              <th key={action} className="text-center py-2 px-3 font-semibold text-[#7d7d87] uppercase tracking-wide w-[80px]">
                {ACTIONS_ES[action]}
              </th>
            ))}
            <th className="text-center py-2 px-3 font-semibold text-[#7d7d87] uppercase tracking-wide w-[80px]">Todos</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((mod, i) => {
            const modPerms = grouped[mod];
            const rowAll = allChecked(mod);
            const someChecked = modPerms.some((p) => {
              return hasAction(mod, p.action);
            });
            return (
              <tr key={mod} className={`border-b border-[#f0f0f4] ${i % 2 === 0 ? '' : 'bg-[#fafafb]'}`}>
                <td className="py-2.5 px-2 text-[13px] font-medium text-[#0f0f12]">{labelModule(mod)}</td>
                {ACTIONS_ORDER.map((action) => {
                  const actionPerms = (grouped[mod] ?? []).filter((p) => p.action === action);
                  if (actionPerms.length === 0) {
                    return <td key={action} className="text-center py-2.5 px-3" />;
                  }
                  return (
                    <td key={action} className="text-center py-2.5 px-3">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={hasAction(mod, action)}
                          onCheckedChange={(checked) => toggleAction(mod, action, !!checked)}
                          className="size-[18px]"
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="text-center py-2.5 px-3">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={rowAll ? true : someChecked ? 'indeterminate' : false}
                      onCheckedChange={(checked) => toggleAll(mod, !!checked)}
                      className="size-[18px]"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {modules.length === 0 && (
        <p className="text-center py-8 text-[12px] text-muted-foreground">No hay permisos disponibles</p>
      )}
    </div>
  );
};

const InfoItem: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex gap-3">
    <div className="size-2 rounded-full bg-convision-primary mt-1.5 shrink-0" />
    <div className="flex flex-col gap-0.5">
      <p className="text-[12px] font-semibold text-[#0f0f12]">{title}</p>
      <p className="text-[11px] text-[#7d7d87] leading-[1.5]">{description}</p>
    </div>
  </div>
);

export default RoleFormShell;
