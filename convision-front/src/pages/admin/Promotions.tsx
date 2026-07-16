import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/use-toast';
import { BadgePercent, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';
import { promotionService, Promotion } from '@/services/promotionService';
import { brandService } from '@/services/brandService';
import { categoryService } from '@/services/categoryService';
import PromotionFormFields, {
  promotionSchema, PromotionFormValues, emptyPromotionValues, toPromotionInput, promotionToFormValues, TYPE_OPTIONS,
} from '@/components/promotions/PromotionFormFields';

const typeLabel = (t: string) => TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

const discountSummary = (p: Promotion): string => {
  if (p.discount_amount) return formatCurrency(p.discount_amount);
  if (p.discount_percentage) return `${p.discount_percentage}%`;
  return '-';
};

const Promotions: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Promotion | null>(null);

  const { data: brandsData } = useQuery({ queryKey: ['brands', 'all-for-promotions'], queryFn: () => brandService.getBrands({ per_page: 1000 }) });
  const { data: categoriesData } = useQuery({ queryKey: ['categories', 'all-for-promotions'], queryFn: () => categoryService.getAllCategories() });

  const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : (((v as { data?: T[] })?.data) ?? []));
  const brandOptions = useMemo(() => asArray<{ id: number; name: string }>(brandsData?.data ?? brandsData).map((b) => ({ value: String(b.id), label: b.name })), [brandsData]);
  const categoryOptions = useMemo(() => asArray<{ id: number; name: string }>(categoriesData).map((c) => ({ value: String(c.id), label: c.name })), [categoriesData]);

  const createForm = useForm<PromotionFormValues>({ resolver: zodResolver(promotionSchema), defaultValues: emptyPromotionValues });
  const editForm = useForm<PromotionFormValues>({ resolver: zodResolver(promotionSchema), defaultValues: emptyPromotionValues });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['promotions'] });
  const apiError = (error: unknown, fallback: string) => {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    return e?.response?.data?.message || e?.message || fallback;
  };

  const createMutation = useMutation({
    mutationFn: (v: PromotionFormValues) => promotionService.create(toPromotionInput(v)),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Promoción creada', description: 'La promoción se creó exitosamente.' });
      setIsCreateOpen(false);
      createForm.reset(emptyPromotionValues);
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error', description: apiError(e, 'No se pudo crear la promoción') }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: PromotionFormValues }) => promotionService.update(id, toPromotionInput(v)),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Promoción actualizada', description: 'Los cambios se guardaron.' });
      setIsEditOpen(false);
      setSelected(null);
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error', description: apiError(e, 'No se pudo actualizar la promoción') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => promotionService.remove(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Promoción eliminada', description: 'La promoción se eliminó.' });
      setIsDeleteOpen(false);
      setSelected(null);
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error', description: apiError(e, 'No se pudo eliminar la promoción') }),
  });

  const openEdit = (p: Promotion) => {
    setSelected(p);
    editForm.reset(promotionToFormValues(p));
    setIsEditOpen(true);
  };

  const columns: DataTableColumnDef<Promotion>[] = [
    { id: 'name', header: 'Nombre', type: 'text', accessorKey: 'name' },
    { id: 'type', header: 'Tipo', type: 'text', accessorKey: 'type', cell: (p) => typeLabel(p.type) },
    { id: 'discount', header: 'Descuento', type: 'text', accessorKey: 'discount_percentage', cell: (p) => discountSummary(p) },
    {
      id: 'min_cart_total', header: 'Compra mínima', type: 'text', accessorKey: 'min_cart_total',
      cell: (p) => (p.min_cart_total ? formatCurrency(p.min_cart_total) : '-'),
    },
    {
      id: 'active', header: 'Estado', type: 'text', accessorKey: 'active',
      cell: (p) => (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${p.active ? 'bg-[#e5f8ef] text-[#0f8f64]' : 'bg-[#f0f0f2] text-[#7d7d87]'}`}>
          {p.active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    {
      id: 'actions', header: 'Acciones', type: 'actions',
      cell: (p) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar promoción"><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(p); setIsDeleteOpen(true); }} title="Eliminar promoción"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <EntityTable<Promotion>
        columns={columns}
        queryKeyBase="promotions"
        fetcher={({ page, per_page, search }) => promotionService.list({ page, per_page, search })}
        searchPlaceholder="Buscar promociones..."
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Promociones</span>
            <span className="text-[11px] text-[#7d7d87]">Campañas de descuento que se aplican automáticamente en la venta</span>
          </div>
        }
        toolbarTrailing={
          <Button onClick={() => { createForm.reset(emptyPromotionValues); setIsCreateOpen(true); }} data-testid="new-promotion">
            <Plus className="h-4 w-4 mr-2" /> Nueva Promoción
          </Button>
        }
        emptyStateNode={<EmptyState leadingIcon={BadgePercent} accentColor="#8753ef" title="Sin promociones" description="Crea tu primera campaña de promociones." />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Promoción</DialogTitle>
            <DialogDescription>Configura una campaña de descuento automática.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
            <PromotionFormFields form={createForm} brandOptions={brandOptions} categoryOptions={categoryOptions} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="save-promotion">
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : 'Crear Promoción'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Promoción</DialogTitle>
            <DialogDescription>Modifica la campaña de descuento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => selected && updateMutation.mutate({ id: selected.id, v }))} className="space-y-4">
            <PromotionFormFields form={editForm} brandOptions={brandOptions} categoryOptions={categoryOptions} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={updateMutation.isPending}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Eliminar promoción"
        description={`Esta acción no se puede deshacer. La promoción "${selected?.name}" será eliminada.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Promotions;
