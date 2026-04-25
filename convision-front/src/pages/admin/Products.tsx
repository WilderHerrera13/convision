import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  DataTable,
  DataTableColumnDef,
} from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import {
  productService,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductSearchParams,
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
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [filters, setFilters] = useState<ProductSearchParams>({
    search: '',
    category: '',
    brand_id: undefined,
    supplier_id: undefined,
    status: '',
  });

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

  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products', page, perPage, filters],
    queryFn: () => productService.getProducts({
      ...filters,
      page,
      per_page: perPage,
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getActiveCategories(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandService.getAllBrands(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Producto creado',
        description: 'El producto ha sido creado exitosamente.',
      });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear el producto',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductRequest }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Producto actualizado',
        description: 'El producto ha sido actualizado exitosamente.',
      });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el producto',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Producto eliminado',
        description: 'El producto ha sido eliminado exitosamente.',
      });
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar el producto',
        variant: 'destructive',
      });
    },
  });

  const handleCreateProduct = (data: ProductFormValues) => {
    const productData: CreateProductRequest = {
      internal_code: data.internal_code,
      identifier: data.identifier,
      description: data.description,
      cost: data.cost,
      price: data.price,
      product_category_id: data.product_category_id,
      brand_id: data.brand_id,
      supplier_id: data.supplier_id,
      status: data.status,
    };
    createMutation.mutate(productData);
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
    const updateData: UpdateProductRequest = {
      internal_code: data.internal_code,
      identifier: data.identifier,
      description: data.description,
      cost: data.cost,
      price: data.price,
      product_category_id: data.product_category_id,
      brand_id: data.brand_id,
      supplier_id: data.supplier_id,
      status: data.status,
    };
    updateMutation.mutate({ id: selectedProduct.id, data: updateData });
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedProduct) return;
    deleteMutation.mutate(selectedProduct.id);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1);
  };

  const applyFilters = (newFilters: Partial<ProductSearchParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      brand_id: undefined,
      supplier_id: undefined,
      status: '',
    });
    setSearch('');
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const columns: DataTableColumnDef<Product>[] = [
    {
      id: 'internal_code',
      header: 'Código Interno',
      type: 'text',
      accessorKey: 'internal_code',
    },
    {
      id: 'identifier',
      header: 'Identificador',
      type: 'text',
      accessorKey: 'identifier',
    },
    {
      id: 'description',
      header: 'Descripción',
      type: 'text',
      accessorKey: 'description',
      cell: (product) => (
        <div className="max-w-xs truncate" title={product.description}>
          {product.description || '-'}
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Categoría',
      type: 'text',
      accessorFn: (product) => product.category?.name || '-',
    },
    {
      id: 'brand',
      header: 'Marca',
      type: 'text',
      accessorFn: (product) => product.brand?.name || '-',
    },
    {
      id: 'supplier',
      header: 'Proveedor',
      type: 'text',
      accessorFn: (product) => product.supplier?.name || '-',
    },
    {
      id: 'cost',
      header: 'Costo',
      type: 'money',
      accessorKey: 'cost',
      cell: (product) => formatCurrency(product.cost),
    },
    {
      id: 'price',
      header: 'Precio',
      type: 'money',
      accessorKey: 'price',
      cell: (product) => formatCurrency(product.price),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'status',
      accessorKey: 'status',
      statusVariants: {
        enabled: 'success',
        disabled: 'destructive',
      },
      statusLabels: {
        enabled: 'Activo',
        disabled: 'Inactivo',
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (product) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditProduct(product)}
            title="Editar producto"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteProduct(product)}
            title="Eliminar producto"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const products = productsData?.data || [];
  const totalPages = productsData?.last_page || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de productos de la empresa
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
            Nuevo Producto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Productos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
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
            data={products}
            columns={columns}
            loading={isLoading}
            enablePagination={true}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No se encontraron productos"
          />
        </CardContent>
      </Card>

      {/* Create Product Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>
              Complete la información del nuevo producto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateProduct)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="internal_code">Código Interno</Label>
                <Input
                  id="internal_code"
                  {...createForm.register('internal_code')}
                  placeholder="PROD-001"
                />
                {createForm.formState.errors.internal_code && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.internal_code.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="identifier">Identificador</Label>
                <Input
                  id="identifier"
                  {...createForm.register('identifier')}
                  placeholder="ESS-SV-PREMIUM"
                />
                {createForm.formState.errors.identifier && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.identifier.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...createForm.register('description')}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={createForm.watch('product_category_id')?.toString() || ''}
                  onValueChange={(value) => createForm.setValue('product_category_id', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.product_category_id && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.product_category_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Select
                  value={createForm.watch('brand_id')?.toString() || ''}
                  onValueChange={(value) => createForm.setValue('brand_id', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.brand_id && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.brand_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Select
                  value={createForm.watch('supplier_id')?.toString() || ''}
                  onValueChange={(value) => createForm.setValue('supplier_id', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.supplier_id && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.supplier_id.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Costo</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...createForm.register('cost', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {createForm.formState.errors.cost && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.cost.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...createForm.register('price', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {createForm.formState.errors.price && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={createForm.watch('status')}
                  onValueChange={(value) => createForm.setValue('status', value as 'enabled' | 'disabled')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Activo</SelectItem>
                    <SelectItem value="disabled">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
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
                  'Crear Producto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Modifique la información del producto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdateProduct)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_internal_code">Código Interno</Label>
                <Input
                  id="edit_internal_code"
                  {...editForm.register('internal_code')}
                />
                {editForm.formState.errors.internal_code && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.internal_code.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_identifier">Identificador</Label>
                <Input
                  id="edit_identifier"
                  {...editForm.register('identifier')}
                />
                {editForm.formState.errors.identifier && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.identifier.message}
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_category">Categoría</Label>
                <Select
                  value={editForm.watch('product_category_id')?.toString() || ''}
                  onValueChange={(value) => editForm.setValue('product_category_id', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_brand">Marca</Label>
                <Select
                  value={editForm.watch('brand_id')?.toString() || ''}
                  onValueChange={(value) => editForm.setValue('brand_id', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_supplier">Proveedor</Label>
                <Select
                  value={editForm.watch('supplier_id')?.toString() || ''}
                  onValueChange={(value) => editForm.setValue('supplier_id', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_cost">Costo</Label>
                <Input
                  id="edit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...editForm.register('cost', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_price">Precio</Label>
                <Input
                  id="edit_price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...editForm.register('price', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_status">Estado</Label>
                <Select
                  value={editForm.watch('status')}
                  onValueChange={(value) => editForm.setValue('status', value as 'enabled' | 'disabled')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Activo</SelectItem>
                    <SelectItem value="disabled">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
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
                  'Actualizar Producto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto "{selectedProduct?.identifier}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros de Productos</DialogTitle>
            <DialogDescription>
              Aplique filtros para refinar la búsqueda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={filters.category || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={filters.brand_id?.toString() || ''}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  brand_id: value ? Number(value) : undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las marcas</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select
                value={filters.supplier_id?.toString() || ''}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  supplier_id: value ? Number(value) : undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los proveedores</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="enabled">Activo</SelectItem>
                  <SelectItem value="disabled">Inactivo</SelectItem>
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

export default Products; 