import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import {
  brandService,
  Brand,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '@/services/brandService';

const brandSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  description: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandSchema>;

const Brands: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const createForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: '', description: '' },
  });

  const editForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBrandRequest) => brandService.createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Marca creada', description: 'La marca ha sido creada exitosamente.' });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Error al crear la marca', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBrandRequest }) =>
      brandService.updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Marca actualizada', description: 'La marca ha sido actualizada exitosamente.' });
      setIsEditModalOpen(false);
      setSelectedBrand(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Error al actualizar la marca', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => brandService.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Marca eliminada', description: 'La marca ha sido eliminada exitosamente.' });
      setIsDeleteModalOpen(false);
      setSelectedBrand(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Error al eliminar la marca', variant: 'destructive' });
    },
  });

  const handleEditBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    editForm.reset({ name: brand.name, description: brand.description || '' });
    setIsEditModalOpen(true);
  };

  const handleDeleteBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedBrand) return;
    deleteMutation.mutate(selectedBrand.id);
  };

  const handleCreateBrand = (data: BrandFormValues) => {
    createMutation.mutate({ name: data.name, description: data.description });
  };

  const handleUpdateBrand = (data: BrandFormValues) => {
    if (!selectedBrand) return;
    updateMutation.mutate({ id: selectedBrand.id, data: { name: data.name, description: data.description } });
  };

  const columns: DataTableColumnDef<Brand>[] = [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
    },
    {
      id: 'description',
      header: 'Descripción',
      type: 'text',
      accessorKey: 'description',
      cell: (brand) => (
        <div className="max-w-xs truncate" title={brand.description}>
          {brand.description || '-'}
        </div>
      ),
    },
    {
      id: 'created_at',
      header: 'Fecha de Creación',
      type: 'date',
      accessorKey: 'created_at',
      cell: (brand) => new Date(brand.created_at).toLocaleDateString('es-ES'),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (brand) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditBrand(brand)} title="Editar marca">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteBrand(brand)} title="Eliminar marca">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <EntityTable<Brand>
        columns={columns}
        fetcher={(params) =>
          brandService.getBrands({
            page: params.page,
            per_page: params.per_page,
            search: params.search,
          })
        }
        queryKeyBase="brands"
        searchPlaceholder="Buscar marcas..."
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Marcas</span>
            <span className="text-[11px] text-[#7d7d87]">Catálogo de marcas</span>
          </div>
        }
        toolbarTrailing={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-[34px] rounded-[6px] bg-[#8753ef] px-4 text-[12px] font-semibold text-white hover:bg-[#7040d8]"
          >
            + Nueva marca
          </Button>
        }
      />

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Marca</DialogTitle>
            <DialogDescription>Complete la información de la nueva marca</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateBrand)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...createForm.register('name')} placeholder="Nombre de la marca" />
              {createForm.formState.errors.name && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" {...createForm.register('description')} placeholder="Descripción de la marca" rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={createMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</>
                ) : (
                  'Crear Marca'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Marca</DialogTitle>
            <DialogDescription>Modifique la información de la marca</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdateBrand)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Nombre</Label>
              <Input id="edit_name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Descripción</Label>
              <Textarea id="edit_description" {...editForm.register('description')} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={updateMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Actualizando...</>
                ) : (
                  'Actualizar Marca'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Eliminar marca"
        description={`Esta accion no se puede deshacer. La marca "${selectedBrand?.name}" sera eliminada permanentemente.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Brands;
