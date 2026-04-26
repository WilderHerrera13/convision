import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageLayout from '@/components/layouts/PageLayout';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supplierService, type Supplier } from '@/services/supplierService';
import { buildSuppliersTableColumns } from './suppliersTableColumns';

const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const columns = useMemo(
    () =>
      buildSuppliersTableColumns(navigate, (row) =>
        setDeleteTarget({ id: row.id, name: row.name?.trim() ? row.name : 'Sin nombre' }),
      ),
    [navigate],
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supplierService.deleteSupplier(deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast({ title: 'Proveedor eliminado', description: 'Se eliminó correctamente.' });
      setDeleteTarget(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageLayout title="Proveedores" subtitle="Administración / Proveedores">
        <EntityTable<Supplier>
          columns={columns}
          queryKeyBase="admin-suppliers"
          fetcher={async ({ page, per_page, search }) => {
            const res = await supplierService.getSuppliers({ page, per_page, search: search || undefined });
            return {
              data: res.data,
              last_page: res.last_page,
              total: res.total,
            };
          }}
          searchPlaceholder="Buscar proveedor..."
          paginationVariant="figma"
          ledgerBorderMode="figma"
          tableLayout="ledger"
          tableClassName="table-fixed min-w-[960px]"
          showPageSizeSelect={false}
          initialPerPage={10}
          tableAriaLabel="Proveedores"
          emptyStateNode={
            <EmptyState
              variant="default"
              title="Sin proveedores"
              description="Aún no hay proveedores registrados. Crea el primero para gestionar compras y contactos."
              actionLabel="Nuevo proveedor"
              actionLeftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />}
              accentColor="#3a71f7"
              leadingIcon={Filter}
              onAction={() => navigate('/admin/suppliers/new')}
            />
          }
          toolbarLeading={
            <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
              <span className="text-[14px] font-semibold text-[#121215]">Proveedores</span>
              <span className="text-[11px] text-[#7d7d87]">Listado de proveedores registrados</span>
            </div>
          }
          toolbarTrailing={
            <Button
              type="button"
              className="h-[34px] min-w-[128px] shrink-0 rounded-[6px] bg-[#3a71f7] px-3 text-[12px] font-semibold text-white hover:bg-[#2f62db]"
              onClick={() => navigate('/admin/suppliers/new')}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Nuevo proveedor
            </Button>
          }
          onRowClick={(row) => navigate(`/admin/suppliers/${row.id}`)}
        />
      </PageLayout>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar proveedor"
        description={`Eliminar al proveedor ${deleteTarget?.name}? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default SuppliersListPage;
