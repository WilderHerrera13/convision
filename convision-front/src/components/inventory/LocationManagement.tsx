import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, AlertCircle, Package, Warehouse as WarehouseIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { inventoryService, WarehouseLocation, Warehouse } from '@/services/inventoryService';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/badge';

// Form schema
const locationFormSchema = z.object({
  warehouse_id: z.string().min(1, 'El almacén es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  type: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  description: z.string().optional(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

const locationTypes = [
  { value: 'shelf', label: 'Estante' },
  { value: 'zone', label: 'Zona' },
  { value: 'bin', label: 'Contenedor' },
  { value: 'rack', label: 'Rack' },
  { value: 'other', label: 'Otro' },
];

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [deleteLocationId, setDeleteLocationId] = useState<number | null>(null);
  const [deleteLocationName, setDeleteLocationName] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      warehouse_id: '',
      name: '',
      code: '',
      type: '',
      status: 'active',
      description: '',
    },
  });

  const fetchWarehouses = async () => {
    try {
      const response = await inventoryService.getWarehouses({ status: 'active', perPage: 100 });
      setWarehouses(response.data);
      
      // Auto-select the first warehouse if there's only one
      if (response.data.length === 1) {
        setSelectedWarehouse(response.data[0].id.toString());
        form.setValue('warehouse_id', response.data[0].id.toString());
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los almacenes',
        variant: 'destructive',
      });
    }
  };

  const fetchLocations = async (warehouseId?: string) => {
    try {
      setLoading(true);
      let response;
      
      if (warehouseId && warehouseId !== 'all') {
        response = await inventoryService.getLocations({ 
          warehouseId: parseInt(warehouseId),
          perPage: 100
        });
      } else {
        response = await inventoryService.getLocations({ perPage: 100 });
      }
      
      setLocations(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ubicaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchLocations(selectedWarehouse);
    } else {
      fetchLocations();
    }
  }, [selectedWarehouse]);

  const handleAddLocation = async (data: LocationFormValues) => {
    try {
      await inventoryService.createLocation({
        warehouse_id: parseInt(data.warehouse_id),
        name: data.name,
        code: data.code,
        type: data.type || null,
        status: data.status,
        description: data.description || null,
      });
      
      toast({
        title: 'Éxito',
        description: 'Ubicación creada correctamente',
      });
      
      setIsAddOpen(false);
      form.reset();
      fetchLocations(selectedWarehouse);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la ubicación',
        variant: 'destructive',
      });
    }
  };

  const handleEditLocation = async (data: LocationFormValues) => {
    if (!editingLocation) return;

    try {
      await inventoryService.updateLocation(editingLocation.id, {
        warehouse_id: parseInt(data.warehouse_id),
        name: data.name,
        code: data.code,
        type: data.type || null,
        status: data.status,
        description: data.description || null,
      });
      
      toast({
        title: 'Éxito',
        description: 'Ubicación actualizada correctamente',
      });
      
      setEditingLocation(null);
      fetchLocations(selectedWarehouse);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la ubicación',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLocation = async (id: number) => {
    try {
      await inventoryService.deleteLocation(id);
      
      toast({
        title: 'Éxito',
        description: 'Ubicación eliminada correctamente',
      });
      
      fetchLocations(selectedWarehouse);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la ubicación. Es posible que tenga inventario asociado.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (location: WarehouseLocation) => {
    setEditingLocation(location);
    form.reset({
      warehouse_id: location.warehouse_id.toString(),
      name: location.name,
      code: location.code,
      type: location.type || '',
      status: location.status,
      description: location.description || '',
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Ubicaciones de Almacén</h2>
            <p className="text-muted-foreground text-sm">
              Administra las ubicaciones dentro de tus almacenes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedWarehouse}
              onValueChange={setSelectedWarehouse}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Filtrar por almacén" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los almacenes</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Ubicación
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Ubicación</DialogTitle>
                  <DialogDescription>
                    Completa la información para crear una nueva ubicación dentro del almacén.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddLocation)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="warehouse_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Almacén</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un almacén" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                  {warehouse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Zona A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: ZONA-A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {locationTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              El tipo de ubicación (opcional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="inactive">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Información adicional sobre la ubicación"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button type="submit">Crear</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {warehouses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay almacenes disponibles</CardTitle>
            <CardDescription>
              Debes crear al menos un almacén antes de poder crear ubicaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                // This should navigate to warehouses tab
                // For now, we'll just show a toast as a placeholder
                toast({
                  title: 'Acción requerida',
                  description: 'Ve a la pestaña de Almacenes para crear uno nuevo.',
                });
              }}
            >
              <WarehouseIcon className="h-4 w-4" />
              <span>Ir a Gestión de Almacenes</span>
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-8">Cargando ubicaciones...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p>No hay ubicaciones disponibles{selectedWarehouse !== 'all' ? ` para este almacén` : ''}. Crea una nueva para comenzar.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.code}</TableCell>
                  <TableCell>
                    {location.warehouse?.name || 
                      warehouses.find(w => w.id === location.warehouse_id)?.name || 
                      'Desconocido'}
                  </TableCell>
                  <TableCell>
                    {location.type ? 
                      locationTypes.find(t => t.value === location.type)?.label || location.type 
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={location.status === 'active' ? 'default' : 'secondary'}
                    >
                      {location.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog open={!!editingLocation && editingLocation.id === location.id} onOpenChange={(open) => !open && setEditingLocation(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(location)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Ubicación</DialogTitle>
                            <DialogDescription>
                              Actualiza la información de la ubicación.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleEditLocation)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="warehouse_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Almacén</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecciona un almacén" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {warehouses.map((warehouse) => (
                                          <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                            {warehouse.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nombre</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="code"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Código</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="type"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Tipo</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un tipo" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {locationTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                              {type.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="status"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Estado</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un estado" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="active">Activo</SelectItem>
                                          <SelectItem value="inactive">Inactivo</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        className="min-h-[80px]"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline" onClick={() => setEditingLocation(null)}>Cancelar</Button>
                                </DialogClose>
                                <Button type="submit">Guardar Cambios</Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteLocationId(location.id); setDeleteLocationName(location.name); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog
        open={deleteLocationId !== null}
        onOpenChange={(open) => !open && setDeleteLocationId(null)}
        title="Eliminar ubicacion"
        description={`Esta accion no se puede deshacer. Se eliminara permanentemente la ubicacion ${deleteLocationName}. No se pueden eliminar ubicaciones con inventario.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { if (deleteLocationId !== null) handleDeleteLocation(deleteLocationId); setDeleteLocationId(null); }}
      />
    </div>
  );
};

export default LocationManagement; 