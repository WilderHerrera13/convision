import React from 'react';
import { Building2, Edit, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { DataTableColumnDef } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import PageLayout from '@/components/layouts/PageLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { branchService, Branch, BranchPayload, UserBranchAssignment as UserBranchAssignmentPayload } from '@/services/branchService';
import { userService } from '@/services/userService';
import BranchForm, { BranchFormValues } from '@/components/admin/BranchForm';
import UserBranchAssignment from '@/components/admin/UserBranchAssignment';

const toPayload = (values: BranchFormValues): BranchPayload => ({
  name: values.name,
  address: values.address ?? '',
  city: values.city ?? '',
  phone: values.phone ?? '',
  email: values.email ?? '',
  is_active: values.is_active,
});

const BranchesPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['branch-users'],
    queryFn: () => userService.getAll(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-all'],
    queryFn: () => branchService.listAll(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: BranchPayload) => branchService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-all'] });
      setIsCreateOpen(false);
      toast({ title: 'Sede creada', description: 'La sede fue creada correctamente.' });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      toast({ title: 'Error', description: msg || 'Ocurrió un error inesperado', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BranchPayload> }) => branchService.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      await queryClient.invalidateQueries({ queryKey: ['branches-all'] });
      setEditingBranch(null);
      toast({ title: 'Sede actualizada', description: 'Los datos de la sede se guardaron correctamente.' });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      toast({ title: 'Error', description: msg || 'Ocurrió un error inesperado', variant: 'destructive' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, assignments }: { userId: number; assignments: UserBranchAssignmentPayload[] }) =>
      branchService.assignUserBranches(userId, assignments),
    onSuccess: () => {
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
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingBranch(branch)}>
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <PageLayout title="Gestión de Sedes" subtitle="Admin / Gestión de Sedes">
      <div className="space-y-4">
        <EntityTable<Branch>
          columns={columns}
          queryKeyBase="branches"
          fetcher={({ page, per_page, search }) => branchService.getForTable({ page, per_page, search })}
          searchPlaceholder="Buscar sedes..."
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Sedes registradas</span>
              <span className="text-[11px] text-[#7d7d87]">Administra la información y disponibilidad de cada sede.</span>
            </div>
          }
          toolbarTrailing={
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Nueva sede</DialogTitle>
            <DialogDescription>Registra una nueva sede para asignarla al equipo.</DialogDescription>
          </DialogHeader>
          <BranchForm
            isSubmitting={createMutation.isPending}
            submitLabel="Crear sede"
            onSubmit={(values) => createMutation.mutate(toPayload(values))}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Editar sede</DialogTitle>
            <DialogDescription>Actualiza la información general de la sede.</DialogDescription>
          </DialogHeader>
          <BranchForm
            initialValues={
              editingBranch
                ? {
                    name: editingBranch.name,
                    address: editingBranch.address,
                    city: editingBranch.city,
                    phone: editingBranch.phone,
                    email: editingBranch.email,
                    is_active: editingBranch.is_active,
                  }
                : undefined
            }
            isSubmitting={updateMutation.isPending}
            submitLabel="Guardar cambios"
            onSubmit={(values) => {
              if (!editingBranch) {
                return;
              }
              updateMutation.mutate({ id: editingBranch.id, payload: toPayload(values) });
            }}
            onCancel={() => setEditingBranch(null)}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default BranchesPage;
