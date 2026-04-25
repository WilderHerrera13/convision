import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Filter, Edit, Trash2, Loader2 } from 'lucide-react';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import {
  productService,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/services/productService';
import { brandService, Brand } from '@/services/brandService';
import { categoryService, ProductCategory } from '@/services/categoryService';

interface Supplier {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const supplierService = {
  async getAllSuppliers(): Promise<Supplier[]> {
    return [];
  }
};

const productSchema = z.object({
  internal_code: z.string().min(1, 'Código interno es requerido'),
  identifier: z.string().min(1, 'Identificador es requerido'),
  description: z.string().optional(),
  cost: z.number().min(0, 'El costo debe ser mayor o igual a 0'),
  price: z.number().min(0.01, 'El precio debe ser mayor a 0'),
  product_category_id: z.number().min(1, 'Categoría es requerida'),
  brand_id: z.number().min(1, 'Marca es requerida'),
  supplier_id: z.number().min(1, 'Proveedor es requerido'),
  status: z.enum(['enabled', 'disabled']).default('enabled'),
});

type ProductFormValues = z.infer<typeof productSchema>;

const Products: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<number | undefined>(undefined);
  const [filterSupplierId, setFilterSupplierId] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState('');

  const createForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      internal_code: '',
      identifier: '',
      description: '',
      cost: 0,
      price: 0,
      product_category_id: 0,
      brand_id: 0,
      supplier_id: 0,
      status: 'enabled',
    },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-active'],
    queryFn: () => categoryService.getActiveCategories(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands-all'],
    queryFn: () => brandService.getAllBrands(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Producto creado', description: 'El producto ha sido creado exitosamente.' });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Error al crear el producto', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductRequest }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Producto actualizado', description: 'El producto ha sido actualizado exitosamente.' });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Error al actualizar el producto', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Producto eliminado', description: 'El producto ha sido eliminado exitosamente.' });
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Error al eliminar el producto', variant: 'destructive' });
    },
  });

  const handleCreateProduct = (data: ProductFormValues) => {
    createMutation.mutate({
      internal_code: data.internal_code,
      identifier: data.identifier,
      description: data.description,
      cost: data.cost,
      price: data.price,
      product_category_id: data.product_category_id,
      brand_id: data.brand_id,
      supplier_id: data.supplier_id,
      status: data.status,
    });
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({
      internal_code: product.internal_code,
      identifier: product.identifier,
      description: product.description || '',
      cost: product.cost,
      price: product.price,
      product_category_id: product.product_category_id,
      brand_id: product.brand_id,
      supplier_id: product.supplier_id,
      status: product.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = (data: ProductFormValues) => {
    if (!selectedProduct) return;
    updateMutation.mutate({
      id: selectedProduct.id,
      data: {
        internal_code: data.internal_code,
        identifier: data.identifier,
        description: data.description,
        cost: data.cost,
        price: data.price,
        product_category_id: data.product_category_id,
        brand_id: data.brand_id,
        supplier_id: data.supplier_id,
        status: data.status,
      },
    });
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedProduct) return;
    deleteMutation.mutate(selectedProduct.id);
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterBrandId(undefined);
    setFilterSupplierId(undefined);
    setFilterStatus('');
    setIsFilterModalOpen(false);
  };

  const columns: DataTableColumnDef<Product>[] = [
    { id: 'internal_code', header: 'Código Interno', type: 'text', accessorKey: 'internal_code' },
    { id: 'identifier', header: 'Identificador', type: 'text', accessorKey: 'identifier' },
    {
      id: 'description',
      header: 'Descripción',
      type: 'text',
      accessorKey: 'description',
      cell: (product) => (
        <div className="max-w-xs truncate" title={product.description}>{product.description || '-'}</div>
      ),
    },
    { id: 'category', header: 'Categoría', type: 'text', accessorFn: (product) => product.category?.name || '-' },
    { id: 'brand', header: 'Marca', type: 'text', accessorFn: (product) => product.brand?.name || '-' },
    { id: 'supplier', header: 'Proveedor', type: 'text', accessorFn: (product) => product.supplier?.name || '-' },
    { id: 'cost', header: 'Costo', type: 'money', accessorKey: 'cost', cell: (product) => formatCurrency(product.cost) },
    { id: 'price', header: 'Precio', type: 'money', accessorKey: 'price', cell: (product) => formatCurrency(product.price) },
    {
      id: 'status',
      header: 'Estado',
      type: 'status',
      accessorKey: 'status',
      statusVariants: { enabled: 'success', disabled: 'destructive' },
      statusLabels: { enabled: 'Activo', disabled: 'Inactivo' },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (product) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)} title="Editar producto">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)} title="Eliminar producto">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <EntityTable<Product>
        columns={columns}
        fetcher={(params) =>
          productService.getProducts({
            page: params.page,
            per_page: params.per_page,
            search: params.search,
            category: filterCategory || undefined,
            brand_id: filterBrandId,
            supplier_id: filterSupplierId,
            status: filterStatus || undefined,
          })
        }
        queryKeyBase="products"
        extraFilters={{ category: filterCategory, brand_id: filterBrandId, supplier_id: filterSupplierId, status: filterStatus }}
        searchPlaceholder="Buscar productos..."
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Productos</span>
            <span className="text-[11px] text-[#7d7d87]">Catálogo de lentes y productos</span>
          </div>
        }
        toolbarTrailing={
          <>
            <Button
              variant="outline"
              onClick={() => setIsFilterModalOpen(true)}
              className="h-[34px] rounded-[6px] border-[#e5e5e9] text-[12px]"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtros
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-[34px] rounded-[6px] bg-[#8753ef] px-4 text-[12px] font-semibold text-white hover:bg-[#7040d8]"
            >
              + Nuevo producto
            </Button>
          </>
        }
      />

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>Complete la información del nuevo producto</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateProduct)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="internal_code">Código Interno</Label>
                <Input id="internal_code" {...createForm.register('internal_code')} placeholder="PROD-001" />
                {createForm.formState.errors.internal_code && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.internal_code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="identifier">Identificador</Label>
                <Input id="identifier" {...createForm.register('identifier')} placeholder="ESS-SV-PREMIUM" />
                {createForm.formState.errors.identifier && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.identifier.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" {...createForm.register('description')} placeholder="Descripción del producto" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={createForm.watch('product_category_id')?.toString() || ''} onValueChange={(v) => createForm.setValue('product_category_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {(categories as ProductCategory[]).map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.product_category_id && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.product_category_id.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={createForm.watch('brand_id')?.toString() || ''} onValueChange={(v) => createForm.setValue('brand_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
                  <SelectContent>
                    {(brands as Brand[]).map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.brand_id && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.brand_id.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={createForm.watch('supplier_id')?.toString() || ''} onValueChange={(v) => createForm.setValue('supplier_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {(suppliers as Supplier[]).map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.supplier_id && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.supplier_id.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Costo</Label>
                <Input id="cost" type="number" step="0.01" min="0" {...createForm.register('cost', { valueAsNumber: true })} placeholder="0.00" />
                {createForm.formState.errors.cost && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.cost.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input id="price" type="number" step="0.01" min="0.01" {...createForm.register('price', { valueAsNumber: true })} placeholder="0.00" />
                {createForm.formState.errors.price && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={createForm.watch('status')} onValueChange={(v) => createForm.setValue('status', v as 'enabled' | 'disabled')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Activo</SelectItem>
                    <SelectItem value="disabled">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={createMutation.isPending}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>Modifique la información del producto</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdateProduct)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_internal_code">Código Interno</Label>
                <Input id="edit_internal_code" {...editForm.register('internal_code')} />
                {editForm.formState.errors.internal_code && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.internal_code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_identifier">Identificador</Label>
                <Input id="edit_identifier" {...editForm.register('identifier')} />
                {editForm.formState.errors.identifier && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.identifier.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Descripción</Label>
              <Textarea id="edit_description" {...editForm.register('description')} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={editForm.watch('product_category_id')?.toString() || ''} onValueChange={(v) => editForm.setValue('product_category_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {(categories as ProductCategory[]).map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={editForm.watch('brand_id')?.toString() || ''} onValueChange={(v) => editForm.setValue('brand_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
                  <SelectContent>
                    {(brands as Brand[]).map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={editForm.watch('supplier_id')?.toString() || ''} onValueChange={(v) => editForm.setValue('supplier_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {(suppliers as Supplier[]).map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_cost">Costo</Label>
                <Input id="edit_cost" type="number" step="0.01" min="0" {...editForm.register('cost', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_price">Precio</Label>
                <Input id="edit_price" type="number" step="0.01" min="0.01" {...editForm.register('price', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.watch('status')} onValueChange={(v) => editForm.setValue('status', v as 'enabled' | 'disabled')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Activo</SelectItem>
                    <SelectItem value="disabled">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={updateMutation.isPending}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Actualizando...</> : 'Actualizar Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Eliminar producto"
        description={`Esta accion no se puede deshacer. El producto "${selectedProduct?.identifier}" sera eliminado permanentemente.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros de Productos</DialogTitle>
            <DialogDescription>Aplique filtros para refinar la búsqueda</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las categorías</SelectItem>
                  {(categories as ProductCategory[]).map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={filterBrandId?.toString() || ''} onValueChange={(v) => setFilterBrandId(v ? Number(v) : undefined)}>
                <SelectTrigger><SelectValue placeholder="Todas las marcas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las marcas</SelectItem>
                  {(brands as Brand[]).map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={filterSupplierId?.toString() || ''} onValueChange={(v) => setFilterSupplierId(v ? Number(v) : undefined)}>
                <SelectTrigger><SelectValue placeholder="Todos los proveedores" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los proveedores</SelectItem>
                  {(suppliers as Supplier[]).map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="enabled">Activo</SelectItem>
                  <SelectItem value="disabled">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>Limpiar Filtros</Button>
            <Button onClick={() => setIsFilterModalOpen(false)}>Aplicar Filtros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
