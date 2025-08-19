import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Search, Plus, X, Trash, Edit, Loader2, Box, Mail, Phone } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import api from '@/lib/axios';
import {
  DataTable,
  DataTableColumnDef,
} from '@/components/ui/data-table';

// Supplier type
type Supplier = {
  id: number;
  name: string;
  nit?: string;
  legal_name?: string;
  legal_representative?: string;
  legal_representative_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
};

// Validation schema for supplier form
const supplierSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  nit: z.string().optional(),
  legal_name: z.string().optional(),
  legal_representative: z.string().optional(),
  legal_representative_id: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ingrese un correo electrónico válido").optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

const Suppliers: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const perPage = 10;

  // Initialize forms
  const createForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      nit: '',
      legal_name: '',
      legal_representative: '',
      legal_representative_id: '',
      address: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      website: '',
      notes: '',
    },
  });

  const editForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      nit: '',
      legal_name: '',
      legal_representative: '',
      legal_representative_id: '',
      address: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      website: '',
      notes: '',
    },
  });

  // Query to fetch suppliers
  const { data, isLoading, isError } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };

      // Add search params if search is provided
      if (search && search.length >= 2) {
        params.search = search;
      }

      const response = await api.get('/api/v1/suppliers', { params });
      console.log('Debug - Suppliers: API response data:', response.data);
      console.log('Debug - Suppliers: First supplier contact info:', response.data?.data?.[0]?.phone, response.data?.data?.[0]?.email);
      return response.data;
    },
  });

  // Mutation to create supplier
  const createSupplierMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const response = await api.post('/api/v1/suppliers', values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsCreateModalOpen(false);
      createForm.reset();
      toast({
        title: "Proveedor creado",
        description: "El proveedor se ha creado correctamente.",
      });
    },
    onError: (error: Error | { response?: { data?: { message?: string } } }) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : error.response?.data?.message || "Error al crear el proveedor.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  // Mutation to update supplier
  const updateSupplierMutation = useMutation({
    mutationFn: async (values: SupplierFormValues & { id: number }) => {
      const { id, ...rest } = values;
      const response = await api.put(`/api/v1/suppliers/${id}`, rest);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsEditModalOpen(false);
      setSelectedSupplier(null);
      toast({
        title: "Proveedor actualizado",
        description: "El proveedor se ha actualizado correctamente.",
      });
    },
    onError: (error: Error | { response?: { data?: { message?: string } } }) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : error.response?.data?.message || "Error al actualizar el proveedor.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  // Mutation to delete supplier
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/v1/suppliers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsDeleteModalOpen(false);
      setSelectedSupplier(null);
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor se ha eliminado correctamente.",
      });
    },
    onError: (error: Error | { response?: { data?: { message?: string } } }) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : error.response?.data?.message || "Error al eliminar el proveedor.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  const onCreateSubmit = (values: SupplierFormValues) => {
    createSupplierMutation.mutate(values);
  };

  const onEditSubmit = (values: SupplierFormValues) => {
    if (selectedSupplier) {
      updateSupplierMutation.mutate({ ...values, id: selectedSupplier.id });
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    editForm.reset({
      name: supplier.name,
      nit: supplier.nit || '',
      legal_name: supplier.legal_name || '',
      legal_representative: supplier.legal_representative || '',
      legal_representative_id: supplier.legal_representative_id || '',
      address: supplier.address || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || '',
      postal_code: supplier.postal_code || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleDeleteConfirm = () => {
    if (selectedSupplier) {
      deleteSupplierMutation.mutate(selectedSupplier.id);
    }
  };

  // Define columns for the DataTable
  const columns: DataTableColumnDef[] = [
    {
      id: 'id',
      header: 'ID',
      type: 'text',
      accessorKey: 'id',
      cell: ({ row }) => {
        const supplier = row.original;
        return <span className="font-medium">{supplier.id}</span>;
      }
    },
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      cell: ({ row }) => {
        const supplier = row.original;
        return supplier.name;
      }
    },
    {
      id: 'nit',
      header: 'NIT',
      type: 'text',
      accessorKey: 'nit',
      cell: ({ row }) => {
        const supplier = row.original;
        return supplier.nit || '-';
      }
    },
    {
      id: 'legal_representative',
      header: 'Representante Legal',
      type: 'text',
      accessorKey: 'legal_representative',
      cell: ({ row }) => {
        const supplier = row.original;
        return supplier.legal_representative || '-';
      }
    },
    {
      id: 'contact',
      header: 'Contacto',
      type: 'text',
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div>
            {supplier.phone && (
              <div className="flex items-center text-sm text-gray-500">
                <Phone className="h-3.5 w-3.5 mr-1" />
                {supplier.phone}
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center text-sm text-gray-500">
                <Mail className="h-3.5 w-3.5 mr-1" />
                {supplier.email}
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(supplier)}
              title="Editar proveedor"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteModal(supplier)}
              title="Eliminar proveedor"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Proveedores</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            Consulta y gestiona la información de los proveedores de lentes
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar proveedores..."
              value={search}
              onChange={handleSearch}
              className="pl-10 pr-10"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={data?.data || []} 
            loading={isLoading}
            emptyMessage="No se encontraron proveedores"
          />

          {/* Pagination */}
          {data?.meta && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Mostrando {data.meta.from || 0} a {data.meta.to || 0} de {data.meta.total} proveedores
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.meta.last_page}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Supplier Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proveedor</DialogTitle>
            <DialogDescription>
              Ingrese la información del nuevo proveedor para facturación.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
            <div className="grid gap-6 py-4">
              <h3 className="font-medium text-lg">Información General</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Comercial *</Label>
                  <Input
                    id="name"
                    placeholder="Nombre de la empresa"
                    {...createForm.register("name")}
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Nombre Legal</Label>
                  <Input
                    id="legal_name"
                    placeholder="Nombre legal completo"
                    {...createForm.register("legal_name")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT</Label>
                  <Input
                    id="nit"
                    placeholder="NIT de la empresa"
                    {...createForm.register("nit")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    placeholder="https://www.ejemplo.com"
                    {...createForm.register("website")}
                  />
                </div>
              </div>

              <h3 className="font-medium text-lg pt-2">Representante Legal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legal_representative">Nombre Representante Legal</Label>
                  <Input
                    id="legal_representative"
                    placeholder="Nombre completo"
                    {...createForm.register("legal_representative")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_representative_id">Identificación Representante</Label>
                  <Input
                    id="legal_representative_id"
                    placeholder="Número de identificación"
                    {...createForm.register("legal_representative_id")}
                  />
                </div>
              </div>

              <h3 className="font-medium text-lg pt-2">Contacto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    {...createForm.register("email")}
                  />
                  {createForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {createForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="+57 300 123 4567"
                    {...createForm.register("phone")}
                  />
                </div>
              </div>

              <h3 className="font-medium text-lg pt-2">Dirección</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Dirección completa"
                  {...createForm.register("address")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    placeholder="Ciudad"
                    {...createForm.register("city")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Departamento/Estado</Label>
                  <Input
                    id="state"
                    placeholder="Departamento o Estado"
                    {...createForm.register("state")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    placeholder="País"
                    {...createForm.register("country")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    placeholder="Código Postal"
                    {...createForm.register("postal_code")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Input
                  id="notes"
                  placeholder="Información adicional relevante"
                  {...createForm.register("notes")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createSupplierMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createSupplierMutation.isPending}
              >
                {createSupplierMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Proveedor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
            <DialogDescription>
              Actualice la información del proveedor para facturación.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <div className="grid gap-6 py-4">
              <h3 className="font-medium text-lg">Información General</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Nombre Comercial *</Label>
                  <Input
                    id="edit_name"
                    placeholder="Nombre de la empresa"
                    {...editForm.register("name")}
                  />
                  {editForm.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_legal_name">Nombre Legal</Label>
                  <Input
                    id="edit_legal_name"
                    placeholder="Nombre legal completo"
                    {...editForm.register("legal_name")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_nit">NIT</Label>
                  <Input
                    id="edit_nit"
                    placeholder="NIT de la empresa"
                    {...editForm.register("nit")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_website">Sitio Web</Label>
                  <Input
                    id="edit_website"
                    placeholder="https://www.ejemplo.com"
                    {...editForm.register("website")}
                  />
                </div>
              </div>

              <h3 className="font-medium text-lg pt-2">Representante Legal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_legal_representative">Nombre Representante Legal</Label>
                  <Input
                    id="edit_legal_representative"
                    placeholder="Nombre completo"
                    {...editForm.register("legal_representative")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_legal_representative_id">Identificación Representante</Label>
                  <Input
                    id="edit_legal_representative_id"
                    placeholder="Número de identificación"
                    {...editForm.register("legal_representative_id")}
                  />
                </div>
              </div>

              <h3 className="font-medium text-lg pt-2">Contacto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Correo Electrónico</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    {...editForm.register("email")}
                  />
                  {editForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Teléfono</Label>
                  <Input
                    id="edit_phone"
                    placeholder="+57 300 123 4567"
                    {...editForm.register("phone")}
                  />
                </div>
              </div>

              <h3 className="font-medium text-lg pt-2">Dirección</h3>
              <div className="space-y-2">
                <Label htmlFor="edit_address">Dirección</Label>
                <Input
                  id="edit_address"
                  placeholder="Dirección completa"
                  {...editForm.register("address")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_city">Ciudad</Label>
                  <Input
                    id="edit_city"
                    placeholder="Ciudad"
                    {...editForm.register("city")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_state">Departamento/Estado</Label>
                  <Input
                    id="edit_state"
                    placeholder="Departamento o Estado"
                    {...editForm.register("state")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_country">País</Label>
                  <Input
                    id="edit_country"
                    placeholder="País"
                    {...editForm.register("country")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_postal_code">Código Postal</Label>
                  <Input
                    id="edit_postal_code"
                    placeholder="Código Postal"
                    {...editForm.register("postal_code")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notas Adicionales</Label>
                <Input
                  id="edit_notes"
                  placeholder="Información adicional relevante"
                  {...editForm.register("notes")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateSupplierMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateSupplierMutation.isPending}
              >
                {updateSupplierMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Proveedor</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar este proveedor? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteSupplierMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteSupplierMutation.isPending}
            >
              {deleteSupplierMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers; 