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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { inventoryService, Warehouse, WarehouseLocation, InventoryItem } from '@/services/inventoryService';
import { Lens } from '@/services/lensService';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';

// Form schema for adding inventory
const inventoryFormSchema = z.object({
  product_id: z.string().min(1, 'Selecciona un lente'),
  warehouse_id: z.string().min(1, 'Selecciona un almacén'),
  warehouse_location_id: z.string().min(1, 'Selecciona una ubicación'),
  quantity: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  status: z.enum(['available', 'reserved', 'damaged']),
  notes: z.string().optional(),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

interface CreateInventoryItemRequest {
  product_id: number;
  warehouse_id: number;
  warehouse_location_id: number;
  quantity: number;
  status: 'available' | 'reserved' | 'damaged';
  notes?: string | null;
}

// Define an interface for lens with inventory data
interface LensWithInventory extends Lens {
  total_quantity: number;
}

// Component to display lens inventory
export const LensInventoryDetail: React.FC<{ lensId: number, onClose: () => void }> = ({ lensId, onClose }) => {
  const [inventory, setInventory] = useState<{
    lens: Lens;
    inventory: InventoryItem[];
    total_quantity: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getLensInventory(lensId);
      setInventory(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el inventario del lente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [lensId]);

  if (loading) {
    return <div className="py-8 text-center">Cargando inventario...</div>;
  }

  if (!inventory) {
    return (
      <div className="py-8 text-center text-red-500">
        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
        <p>No se pudo cargar el inventario</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Inventario de {inventory.lens.identifier}
        </h3>
        <Badge>Stock Total: {inventory.total_quantity}</Badge>
      </div>

      <div className="text-sm grid grid-cols-2 gap-4">
        <div>
          <p className="font-medium">Código interno: {inventory.lens.internal_code}</p>
          <p>Marca: {inventory.lens.brand?.name || 'Sin marca'}</p>
          <p>Material: {inventory.lens.material?.name || 'Sin material'}</p>
        </div>
        <div>
          <p>Tipo: {inventory.lens.type?.name || 'Sin tipo'}</p>
          <p>Clase: {inventory.lens.lens_class?.name || 'Sin clase'}</p>
          <p>Tratamiento: {inventory.lens.treatment?.name || 'Ninguno'}</p>
        </div>
      </div>

      {inventory.inventory.length === 0 ? (
        <div className="py-4 text-center text-muted-foreground">
          No hay stock de este lente en ninguna ubicación
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Almacén</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.warehouse?.name}</TableCell>
                  <TableCell>{item.warehouseLocation?.name}</TableCell>
                  <TableCell className="font-medium">{item.quantity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'available'
                          ? 'default'
                          : item.status === 'reserved'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {item.status === 'available'
                        ? 'Disponible'
                        : item.status === 'reserved'
                        ? 'Reservado'
                        : 'Dañado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
};

const InventoryStock: React.FC = () => {
  const [lenses, setLenses] = useState<LensWithInventory[]>([]);
  const [selectedLens, setSelectedLens] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [allLocations, setAllLocations] = useState<WarehouseLocation[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const { toast } = useToast();

  const columns: DataTableColumnDef[] = [
    {
      id: 'internal_code',
      header: 'Código',
      type: 'text',
      accessorKey: 'internal_code',
      cell: ({ row }) => {
        const lens = row.original;
        return <div className="font-medium">{lens.internal_code}</div>;
      },
    },
    {
      id: 'identifier',
      header: 'Lente',
      type: 'text',
      accessorKey: 'identifier',
      cell: ({ row }) => {
        const lens = row.original;
        return <div>{lens.identifier}</div>;
      },
    },
    {
      id: 'brand',
      header: 'Marca',
      type: 'text',
      accessorKey: 'brand',
      cell: ({ row }) => {
        const lens = row.original;
        return <div>{lens.brand?.name || 'Sin marca'}</div>;
      },
    },
    {
      id: 'total_quantity',
      header: 'Stock Total',
      type: 'text',
      accessorKey: 'total_quantity',
      cell: ({ row }) => {
        const lens = row.original;
        return (
          <Badge variant="outline" className="font-bold">
            {lens.total_quantity}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'text',
      cell: ({ row }) => {
        const lens = row.original;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedLens(lens.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      product_id: '',
      warehouse_id: '',
      warehouse_location_id: '',
      quantity: 0,
      status: 'available',
      notes: '',
    },
  });

  // Watch the warehouse_id field to update locations
  const selectedWarehouseId = form.watch('warehouse_id');

  const fetchWarehouses = async () => {
    try {
      const response = await inventoryService.getWarehouses({ status: 'active' });
      setWarehouses(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los almacenes',
        variant: 'destructive',
      });
    }
  };

  const fetchAllLocations = async () => {
    try {
      const response = await inventoryService.getLocations({ perPage: 100 });
      setAllLocations(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar todas las ubicaciones',
        variant: 'destructive',
      });
    }
  };

  const fetchLocationsForWarehouse = async (warehouseId: string) => {
    if (!warehouseId) {
      setLocations([]);
      return;
    }
    
    try {
      const response = await inventoryService.getLocations({
        warehouseId: parseInt(warehouseId),
        perPage: 100,
      });
      setLocations(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ubicaciones para este almacén',
        variant: 'destructive',
      });
      setLocations([]);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params: { warehouseId?: number; locationId?: number } = {};
      
      if (selectedWarehouse && selectedWarehouse !== 'all') {
        params.warehouseId = parseInt(selectedWarehouse);
      }
      
      if (selectedLocation && selectedLocation !== 'all') {
        params.locationId = parseInt(selectedLocation);
      }
      
      const response = await inventoryService.getTotalStock(params);
      setLenses(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el inventario',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchAllLocations();
    fetchInventory();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedWarehouse, selectedLocation]);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchLocationsForWarehouse(selectedWarehouseId);
      // Reset the location field when warehouse changes
      form.setValue('warehouse_location_id', '');
    } else {
      setLocations([]);
    }
  }, [selectedWarehouseId, form]);

  const handleAddInventory = async (data: InventoryFormValues) => {
    try {
      await inventoryService.createInventoryItem({
        product_id: parseInt(data.product_id),
        warehouse_id: parseInt(data.warehouse_id),
        warehouse_location_id: parseInt(data.warehouse_location_id),
        quantity: data.quantity,
        status: data.status,
        notes: data.notes || null,
      } as CreateInventoryItemRequest);

      toast({
        title: 'Éxito',
        description: 'Inventario agregado correctamente',
      });

      setIsAddOpen(false);
      form.reset();
      fetchInventory();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el inventario',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      {selectedLens ? (
        <LensInventoryDetail
          lensId={selectedLens}
          onClose={() => setSelectedLens(null)}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold">Inventario de Lentes</h2>
              <p className="text-muted-foreground text-sm">
                Gestiona el stock y las ubicaciones de tus lentes
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Inventario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Inventario</DialogTitle>
                    <DialogDescription>
                      Añade stock de un lente a una ubicación
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddInventory)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="product_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lente</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un lente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {lenses.map((lens) => (
                                  <SelectItem key={lens.id} value={lens.id.toString()}>
                                    {lens.identifier} - {lens.brand?.name || 'Sin marca'}
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
                      <FormField
                        control={form.control}
                        name="warehouse_location_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ubicación</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={!selectedWarehouseId}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    selectedWarehouseId
                                      ? "Selecciona una ubicación"
                                      : "Primero selecciona un almacén"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem key={location.id} value={location.id.toString()}>
                                    {location.name}
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
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Cantidad"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
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
                                  <SelectItem value="available">Disponible</SelectItem>
                                  <SelectItem value="reserved">Reservado</SelectItem>
                                  <SelectItem value="damaged">Dañado</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Notas adicionales"
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
                        <Button type="submit">Guardar</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <Select
                  value={selectedWarehouse}
                  onValueChange={setSelectedWarehouse}
                >
                  <SelectTrigger className="w-full">
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
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  disabled={!selectedWarehouse}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      selectedWarehouse
                        ? "Filtrar por ubicación"
                        : "Primero selecciona un almacén"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ubicaciones</SelectItem>
                    {(selectedWarehouse ? locations : allLocations)
                      .filter(location => !selectedWarehouse || location.warehouse_id.toString() === selectedWarehouse)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name} {location.warehouse ? `(${location.warehouse.name})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <DataTable 
            columns={columns} 
            data={lenses} 
            loading={loading}
            emptyMessage={`No hay lentes en inventario${selectedWarehouse !== 'all' ? ' para este almacén' : ''}. Agrega stock para comenzar.`}
          />
        </>
      )}
    </div>
  );
};

export default InventoryStock; 