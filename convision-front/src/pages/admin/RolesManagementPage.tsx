import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageLayout from '@/components/layouts/PageLayout';
import rolesApi, { Role } from '@/services/roles';

function buildRolesColumns(
  navigate: ReturnType<typeof useNavigate>,
  onDelete: (role: Role) => void,
): DataTableColumnDef<Role>[] {
  return [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      enableSorting: false,
      cell: (role) => (
        <span className="font-semibold text-[#121215]">{role.name}</span>
      ),
    },
    {
      id: 'description',
      header: 'Descripción',
      type: 'text',
      accessorKey: 'description',
      enableSorting: false,
      className: 'text-[#7d7d87]',
      cell: (role) => (
        <span
          className="block max-w-xs truncate text-[13px] text-[#7d7d87]"
          title={role.description}
        >
          {role.description || '—'}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      type: 'text',
      accessorKey: 'is_system',
      enableSorting: false,
      className: 'w-[140px]',
      cell: (role) =>
        role.is_system ? (
          <span className="inline-flex rounded-full bg-[#eff1ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#3a71f7]">
            Sistema
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-[11px] font-semibold text-[#4b4b57]">
            Personalizado
          </span>
        ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'text',
      accessorKey: 'id',
      enableSorting: false,
      headerClassName: 'text-right',
      className: 'w-[120px] min-w-[108px]',
      cell: (role) => (
        <div className="flex justify-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#c5d3f8] bg-[#eff4ff] p-0 text-[#3a71f7] hover:bg-[#e8eeff]"
            title="Ver usuarios"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/roles/${role.id}/users`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#e0e0e4] bg-[#f5f5f7] p-0 text-[#3a71f7] hover:bg-[#ebebef] disabled:opacity-40"
            title={role.is_system ? 'No se puede editar un rol del sistema' : 'Editar rol'}
            disabled={role.is_system}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/roles/${role.id}/edit`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-[6px] border border-[#f5baba] bg-[#fff0f0] p-0 text-[#b82626] hover:bg-[#ffe8e8] disabled:opacity-40"
            title="Eliminar rol"
            disabled={role.is_system}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(role);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

const RolesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Rol eliminado', description: 'El rol ha sido eliminado exitosamente.' });
      setDeleteRole(null);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const columns = useMemo(
    () => buildRolesColumns(navigate, setDeleteRole),
    [navigate],
  );

  return (
    <>
      <PageLayout title="Gestión de Roles" subtitle="Administración / Gestión de Roles">
        <EntityTable<Role>
          columns={columns}
          queryKeyBase="roles"
          fetcher={({ page, per_page, search }) =>
            rolesApi.getForTable({ page, per_page, name: search })
          }
          searchPlaceholder="Buscar rol..."
          paginationVariant="figma"
          ledgerBorderMode="figma"
          tableLayout="ledger"
          showPageSizeSelect={false}
          initialPerPage={15}
          tableAriaLabel="Roles del sistema"
          onRowClick={(row) => navigate(`/admin/roles/${row.id}/users`)}
          toolbarLeading={
            <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
              <span className="text-[14px] font-semibold text-[#121215]">Roles del sistema</span>
              <span className="text-[11px] text-[#7d7d87]">Roles y conjuntos de permisos configurados</span>
            </div>
          }
          toolbarTrailing={
            <Button
              type="button"
              className="h-[34px] min-w-[128px] shrink-0 rounded-[6px] bg-[#3a71f7] px-3 text-[12px] font-semibold text-white hover:bg-[#2f62db]"
              onClick={() => navigate('/admin/roles/new')}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nuevo Rol
            </Button>
          }
          emptyStateNode={
            <EmptyState
              leadingIcon={ShieldCheck}
              accentColor="#3a71f8"
              title="No hay roles configurados"
              description="Crea tu primer rol para comenzar a gestionar los permisos de acceso al sistema."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />
      </PageLayout>

      <ConfirmDialog
        open={!!deleteRole}
        onOpenChange={(o) => !o && setDeleteRole(null)}
        title="Eliminar rol"
        description={`¿Eliminar el rol "${deleteRole?.name}"? Los usuarios que lo tienen asignado perderán estos permisos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => deleteRole && deleteMutation.mutate(deleteRole.id)}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

export default RolesManagementPage;
