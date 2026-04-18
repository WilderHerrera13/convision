import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageLayout from '@/components/layouts/PageLayout';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { laboratoryService, type Laboratory } from '@/services/laboratoryService';
import { buildLaboratoriesTableColumns } from './laboratoriesTableColumns';

const LaboratoriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteLab, setDeleteLab] = useState<Laboratory | null>(null);

  const columns = useMemo(() => buildLaboratoriesTableColumns(navigate, setDeleteLab), [navigate]);

  const confirmDelete = async () => {
    if (!deleteLab) return;
    try {
      await laboratoryService.deleteLaboratory(deleteLab.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-laboratories'] });
      toast({ title: 'Laboratorio eliminado', description: 'Se eliminó correctamente.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setDeleteLab(null);
    }
  };

  return (
    <>
      <PageLayout title="Laboratorios" subtitle="Gestione los laboratorios asociados para la fabricación de lentes">
        <EntityTable<Laboratory>
          columns={columns}
          queryKeyBase="admin-laboratories"
          fetcher={({ page, per_page, search }) =>
            laboratoryService.getLaboratoriesTable({ page, per_page, search })
          }
          searchPlaceholder="Buscar laboratorio..."
          paginationVariant="figma"
          ledgerBorderMode="figma"
          tableLayout="ledger"
          tableClassName="table-fixed min-w-[960px]"
          enableSorting={false}
          showPageSizeSelect={false}
          initialPerPage={10}
          tableAriaLabel="Laboratorios"
          emptyStateNode={
            <EmptyState
              variant="default"
              title="Sin laboratorios"
              description="No hay laboratorios registrados todavía."
              actionLabel="Agregar laboratorio"
              actionLeftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />}
              accentColor="#3a71f7"
              leadingIcon={Filter}
              onAction={() => navigate('/admin/laboratories/new')}
            />
          }
          toolbarLeading={
            <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
              <span className="text-[14px] font-semibold text-[#121215]">Laboratorios</span>
              <span className="text-[11px] text-[#7d7d87]">Listado de laboratorios registrados</span>
            </div>
          }
          toolbarTrailing={
            <Button
              type="button"
              className="h-[34px] min-w-[128px] shrink-0 rounded-[6px] bg-[#3a71f7] px-3 text-[12px] font-semibold text-white hover:bg-[#2f62db]"
              onClick={() => navigate('/admin/laboratories/new')}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Agregar Laboratorio
            </Button>
          }
          onRowClick={(row) => navigate(`/admin/laboratories/${row.id}`)}
        />
      </PageLayout>

      <AlertDialog open={!!deleteLab} onOpenChange={(o) => !o && setDeleteLab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el laboratorio {deleteLab?.name}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LaboratoriesListPage;
