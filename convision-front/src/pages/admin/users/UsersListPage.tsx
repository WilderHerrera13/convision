import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageLayout from '@/components/layouts/PageLayout';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { userService, type User } from '@/services/userService';
import { useQueryClient } from '@tanstack/react-query';
import { buildUsersTableColumns } from './usersTableColumns';

const UsersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const columns = useMemo(
    () => buildUsersTableColumns(navigate, authUser?.id, setDeleteUser),
    [navigate, authUser?.id],
  );

  const confirmDelete = async () => {
    if (!deleteUser) return;
    try {
      await userService.delete(deleteUser.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuario eliminado', description: 'El usuario se eliminó correctamente.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDeleteUser(null);
    }
  };

  return (
    <>
      <PageLayout title="Gestión de Usuarios" subtitle="Administración / Gestión de Usuarios">
        <EntityTable<User>
          columns={columns}
          queryKeyBase="admin-users"
          fetcher={({ page, per_page, search }) => userService.getUsers({ page, per_page, search })}
          searchPlaceholder="Buscar usuarios..."
          paginationVariant="figma"
          ledgerBorderMode="figma"
          tableLayout="ledger"
          tableClassName="table-fixed min-w-[960px]"
          enableSorting={false}
          showPageSizeSelect={false}
          initialPerPage={15}
          tableAriaLabel="Usuarios del sistema"
          toolbarLeading={
            <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
              <span className="text-[14px] font-semibold text-[#121215]">Usuarios del sistema</span>
              <span className="text-[11px] text-[#7d7d87]">Personal con acceso a la plataforma</span>
            </div>
          }
          toolbarTrailing={
            <Button
              type="button"
              className="h-[34px] min-w-[128px] shrink-0 rounded-[6px] bg-[#3a71f7] px-3 text-[12px] font-semibold text-white hover:bg-[#2f62db]"
              onClick={() => navigate('/admin/users/new')}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nuevo Usuario
            </Button>
          }
        />
      </PageLayout>

      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
        title="Eliminar usuario"
        description={`Eliminar a ${deleteUser ? [deleteUser.name, deleteUser.last_name].filter(Boolean).join(' ') : ''}? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default UsersListPage;
