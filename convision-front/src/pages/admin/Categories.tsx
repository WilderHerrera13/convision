import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Folder,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  DataTable,
  DataTableColumnDef,
} from '@/components/ui/data-table';
import {
  categoryService,
  ProductCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategorySearchParams,
} from '@/services/categoryService';

const categorySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  slug: z.string().min(1, 'Slug es requerido'),
  description: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const Categories: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  
  const [filters, setFilters] = useState<CategorySearchParams>({
    search: '',
    is_active: undefined,
  });

  const createForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      icon: '',
      is_active: true,
    },
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories', page, perPage, filters],
    queryFn: () => categoryService.getCategories({
      ...filters,
      page,
      per_page: perPage,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryRequest) => categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Categoría creada',
        description: 'La categoría ha sido creada exitosamente.',
      });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear la categoría',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryRequest }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Categoría actualizada',
        description: 'La categoría ha sido actualizada exitosamente.',
      });
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar la categoría',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Categoría eliminada',
        description: 'La categoría ha sido eliminada exitosamente.',
      });
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar la categoría',
        variant: 'destructive',
      });
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateCategory = (data: CategoryFormValues) => {
    const categoryData: CreateCategoryRequest = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      is_active: data.is_active,
    };
    createMutation.mutate(categoryData);
  };

  const handleEditCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    editForm.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      is_active: category.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = (data: CategoryFormValues) => {
    if (!selectedCategory) return;
    const updateData: UpdateCategoryRequest = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      is_active: data.is_active,
    };
    updateMutation.mutate({ id: selectedCategory.id, data: updateData });
  };

  const handleDeleteCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedCategory) return;
    deleteMutation.mutate(selectedCategory.id);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1);
  };

  const applyFilters = (newFilters: Partial<CategorySearchParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      is_active: undefined,
    });
    setSearch('');
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const columns: DataTableColumnDef<ProductCategory>[] = [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
    },
    {
      id: 'slug',
      header: 'Slug',
      type: 'text',
      accessorKey: 'slug',
      cell: (category) => (
        <code className="bg-muted px-2 py-1 rounded text-sm">
          {category.slug}
        </code>
      ),
    },
    {
      id: 'description',
      header: 'Descripción',
      type: 'text',
      accessorKey: 'description',
      cell: (category) => (
        <div className="max-w-xs truncate" title={category.description}>
          {category.description || '-'}
        </div>
      ),
    },
    {
      id: 'icon',
      header: 'Icono',
      type: 'text',
      accessorKey: 'icon',
      cell: (category) => (
        <div className="text-center">
          {category.icon ? (
            <span className="text-lg">{category.icon}</span>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      id: 'is_active',
      header: 'Estado',
      type: 'status',
      accessorKey: 'is_active',
      statusVariants: {
        true: 'success',
        false: 'destructive',
      },
      statusLabels: {
        true: 'Activa',
        false: 'Inactiva',
      },
    },
    {
      id: 'products_count',
      header: 'Productos',
      type: 'number',
      accessorKey: 'products_count',
      cell: (category) => (
        <Badge variant="secondary">
          {category.products_count || 0}
        </Badge>
      ),
    },
    {
      id: 'created_at',
      header: 'Fecha de Creación',
      type: 'date',
      accessorKey: 'created_at',
      cell: (category) => new Date(category.created_at).toLocaleDateString('es-ES'),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (category) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditCategory(category)}
            title="Editar categoría"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteCategory(category)}
            title="Eliminar categoría"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const categories = categoriesData?.data || [];
  const totalPages = categoriesData?.last_page || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Gestiona las categorías de productos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={perPage.toString()}
            onValueChange={(value) => {
              setPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="15">15 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Categorías</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={categories}
            columns={columns}
            loading={isLoading}
            enablePagination={true}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No se encontraron categorías"
          />
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Categoría</DialogTitle>
            <DialogDescription>
              Complete la información de la nueva categoría
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateCategory)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  {...createForm.register('name')}
                  placeholder="Nombre de la categoría"
                  onChange={(e) => {
                    createForm.setValue('name', e.target.value);
                    createForm.setValue('slug', generateSlug(e.target.value));
                  }}
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  {...createForm.register('slug')}
                  placeholder="slug-de-la-categoria"
                />
                {createForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.slug.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...createForm.register('description')}
                placeholder="Descripción de la categoría"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icono (Emoji)</Label>
                <Input
                  id="icon"
                  {...createForm.register('icon')}
                  placeholder="👓"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Estado</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="is_active"
                    checked={createForm.watch('is_active')}
                    onCheckedChange={(checked) => createForm.setValue('is_active', checked)}
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    {createForm.watch('is_active') ? 'Activa' : 'Inactiva'}
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Categoría'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
            <DialogDescription>
              Modifique la información de la categoría
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdateCategory)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nombre</Label>
                <Input
                  id="edit_name"
                  {...editForm.register('name')}
                  onChange={(e) => {
                    editForm.setValue('name', e.target.value);
                    editForm.setValue('slug', generateSlug(e.target.value));
                  }}
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_slug">Slug</Label>
                <Input
                  id="edit_slug"
                  {...editForm.register('slug')}
                />
                {editForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.slug.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Descripción</Label>
              <Textarea
                id="edit_description"
                {...editForm.register('description')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_icon">Icono (Emoji)</Label>
                <Input
                  id="edit_icon"
                  {...editForm.register('icon')}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_is_active">Estado</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="edit_is_active"
                    checked={editForm.watch('is_active')}
                    onCheckedChange={(checked) => editForm.setValue('is_active', checked)}
                  />
                  <Label htmlFor="edit_is_active" className="text-sm">
                    {editForm.watch('is_active') ? 'Activa' : 'Inactiva'}
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Categoría'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Eliminar categoria"
        description={`Esta accion no se puede deshacer. La categoria "${selectedCategory?.name}" sera eliminada permanentemente.${selectedCategory?.products_count && selectedCategory.products_count > 0 ? ` Tiene ${selectedCategory.products_count} producto(s) asociado(s).` : ''}`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtros de Categorías</DialogTitle>
            <DialogDescription>
              Aplique filtros para refinar la búsqueda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filters.is_active?.toString() || ''}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  is_active: value === '' ? undefined : value === 'true' 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="true">Activas</SelectItem>
                  <SelectItem value="false">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
            <Button onClick={() => applyFilters(filters)}>
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories; 