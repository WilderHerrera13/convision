import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Edit, Eye, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { DataTableColumnDef } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import PageLayout from '@/components/layouts/PageLayout';
import { branchService, Branch, UserBranchAssignment as UserBranchAssignmentPayload } from '@/services/branchService';
import { userService } from '@/services/userService';
import UserBranchAssignment from '@/components/admin/UserBranchAssignment';

const BranchesPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['branch-users'],
    queryFn: () => userService.getAll(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-all'],
    queryFn: () => branchService.listAll(),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, assignments }: { userId: number; assignments: UserBranchAssignmentPayload[] }) =>
      branchService.assignUserBranches(userId, assignments),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches-list'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-all'] });
      toast({ title: 'Asignaciones guardadas', description: 'Las sedes del usuario fueron actualizadas.' });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      toast({ title: 'Error', description: msg || 'Ocurrió un error inesperado', variant: 'destructive' });
    },
  });

  const columns: DataTableColumnDef<Branch>[] = [
    { id: 'name', header: 'Nombre', type: 'text', accessorKey: 'name' },
    { id: 'city', header: 'Ciudad', type: 'text', accessorKey: 'city' },
    { id: 'address', header: 'Dirección', type: 'text', accessorKey: 'address' },
    { id: 'phone', header: 'Teléfono', type: 'text', accessorKey: 'phone' },
    { id: 'email', header: 'Correo', type: 'text', accessorKey: 'email' },
    {
      id: 'is_active',
      header: 'Estado',
      type: 'text',
      accessorKey: 'is_active',
      cell: (branch) => (branch.is_active ? 'Activa' : 'Inactiva'),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (branch) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/admin/sedes/${branch.id}`}
            className="flex size-8 items-center justify-center rounded-[6px] border border-convision-primary/30 bg-convision-light text-convision-primary transition-colors hover:opacity-80"
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-[6px] border border-[#e0e0e4] bg-[#f5f5f7] text-[#7d7d87] transition-colors hover:bg-[#ebebee]"
            title="Editar sede"
            onClick={() => navigate(`/admin/sedes/${branch.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout title="Sedes" subtitle="Admin / Sedes">
      <div className="space-y-4">
        <EntityTable<Branch>
          columns={columns}
          queryKeyBase="branches"
          fetcher={({ page, per_page, search }) => branchService.getForTable({ page, per_page, search })}
          searchPlaceholder="Buscar sedes..."
          onRowClick={(branch) => navigate(`/admin/sedes/${branch.id}`)}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Sedes registradas</span>
              <span className="text-[11px] text-[#7d7d87]">Administra la información y disponibilidad de cada sede.</span>
            </div>
          }
          toolbarTrailing={
            <Button type="button" onClick={() => navigate('/admin/sedes/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva sede
            </Button>
          }
          emptyStateNode={
            <EmptyState
              leadingIcon={Building2}
              accentColor="#8753ef"
              title="Sin sedes registradas"
              description="Crea una sede para comenzar a operar por sucursal."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />

        <UserBranchAssignment
          users={users}
          branches={branches}
          isLoading={assignMutation.isPending}
          onSubmit={(userId, assignments) => assignMutation.mutate({ userId, assignments })}
        />
      </div>
    </PageLayout>
  );
};

export default BranchesPage;
