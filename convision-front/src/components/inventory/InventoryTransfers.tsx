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
import { Plus, AlertCircle, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  inventoryService, 
  Warehouse, 
  WarehouseLocation, 
  InventoryTransfer,
  InventoryItem
} from '@/services/inventoryService';
import { lensService, Lens } from '@/services/lensService';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

// Form schema for creating transfers
const transferFormSchema = z.object({
  lens_id: z.string().min(1, 'Selecciona un lente'),
  source_location_id: z.string().min(1, 'Selecciona la ubicación de origen'),
  destination_location_id: z.string().min(1, 'Selecciona la ubicación de destino')
    .refine(val => val !== z.string().min(1).parse('source_location_id'), {
      message: 'Las ubicaciones de origen y destino no pueden ser la misma',
    }),
  quantity: z.string().transform((val) => parseInt(val))
    .refine(val => val > 0, { message: 'La cantidad debe ser mayor a cero' }),
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed']),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

// Define an interface for inventory item with lens data (making lens optional but present in our data)
interface InventoryItemWithLens extends InventoryItem {
  lens?: Lens; // Still optional in the type but we'll ensure it's present in our data
}

const InventoryTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [sourceLocationInventory, setSourceLocationInventory] = useState<InventoryItemWithLens[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      lens_id: '',
      source_location_id: '',
      destination_location_id: '',
      quantity: '1', // String is correct here - will be parsed to number by the schema
      notes: '',
      status: 'pending',
    },
  });
  
  // Watch source location to update available inventory
  const selectedSourceLocation = form.watch('source_location_id');
  const selectedLensId = form.watch('lens_id');
  
  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getTransfers({ perPage: 50 });
      setTransfers(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las transferencias',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLenses = async () => {
    try {
      const response = await inventoryService.getTotalStock();
      setLenses(response.data.filter((lens: Lens & { total_quantity: number }) => lens.total_quantity > 0));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los lentes',
        variant: 'destructive',
      });
    }
  };
  
  const fetchLocations = async () => {
    try {
      const response = await inventoryService.getLocations({ perPage: 100 });
      setLocations(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ubicaciones',
        variant: 'destructive',
      });
    }
  };
  
  const fetchSourceLocationInventory = async (locationId: string) => {
    if (!locationId) {
      setSourceLocationInventory([]);
      return;
    }
    
    try {
      const response = await inventoryService.getLocationInventory(parseInt(locationId));
      // Filter to only items with lens data
      const itemsWithLens = response.data.filter(item => item.lens) as InventoryItemWithLens[];
      setSourceLocationInventory(itemsWithLens);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el inventario de la ubicación',
        variant: 'destructive',
      });
      setSourceLocationInventory([]);
    }
  };
  
  useEffect(() => {
    fetchTransfers();
    fetchLenses();
    fetchLocations();
  }, []);
  
  useEffect(() => {
    if (selectedSourceLocation) {
      fetchSourceLocationInventory(selectedSourceLocation);
    } else {
      setSourceLocationInventory([]);
    }
  }, [selectedSourceLocation]);
  
  useEffect(() => {
    // Reset lens_id when changing source location
    if (selectedSourceLocation && selectedLensId) {
      const hasLensInLocation = sourceLocationInventory.some(
        item => item.lens_id.toString() === selectedLensId
      );
      
      if (!hasLensInLocation) {
        form.setValue('lens_id', '');
      }
    }
  }, [sourceLocationInventory, selectedLensId, form]);
  
  const handleCreateTransfer = async (data: TransferFormValues) => {
    try {
      await inventoryService.createTransfer({
        lens_id: parseInt(data.lens_id),
        source_location_id: parseInt(data.source_location_id),
        destination_location_id: parseInt(data.destination_location_id),
        quantity: data.quantity,
        notes: data.notes || null,
        status: data.status,
      });
      
      toast({
        title: 'Éxito',
        description: 'Transferencia creada correctamente',
      });
      
      setIsCreateOpen(false);
      form.reset();
      fetchTransfers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la transferencia',
        variant: 'destructive',
      });
    }
  };
  
  const handleCompleteTransfer = async (id: number) => {
    try {
      await inventoryService.updateTransfer(id, {
        status: 'completed',
      });
      
      toast({
        title: 'Éxito',
        description: 'Transferencia completada correctamente',
      });
      
      fetchTransfers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo completar la transferencia',
        variant: 'destructive',
      });
    }
  };
  
  // Helper function to get lens by ID
  const getLensById = (id: number): Lens | undefined => {
    return lenses.find(lens => lens.id === id);
  };
  
  // Helper function to get location by ID
  const getLocationById = (id: number): WarehouseLocation | undefined => {
    return locations.find(location => location.id === id);
  };
  
  // Helper function to get maximum quantity available for a lens in a location
  const getMaxQuantityAvailable = (lensId: string, locationId: string): number => {
    if (!lensId || !locationId) return 0;
    
    const item = sourceLocationInventory.find(
      item => item.lens_id.toString() === lensId && item.warehouse_location_id.toString() === locationId
    );
    
    return item ? item.quantity : 0;
  };
  
  // Filter lenses based on selected source location
  const getAvailableLenses = () => {
    if (!selectedSourceLocation || sourceLocationInventory.length === 0) {
      return [];
    }
    
    return sourceLocationInventory.map(item => ({
      id: item.lens_id,
      identifier: item.lens?.identifier,
      brand: item.lens?.brand.name,
      quantity: item.quantity,
    }));
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold">Transferencias de Inventario</h2>
          <p className="text-muted-foreground text-sm">
            Gestiona los movimientos de lentes entre ubicaciones
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transferencia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Transferencia</DialogTitle>
              <DialogDescription>
                Mueve lentes entre ubicaciones de almacén
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateTransfer)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="source_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación de Origen</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset lens and destination when source changes
                          form.setValue('lens_id', '');
                          form.setValue('quantity', '1'); // String value - will be parsed to number by the schema
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la ubicación de origen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name} ({location.warehouse?.name})
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
                  name="lens_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lente</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedSourceLocation || sourceLocationInventory.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedSourceLocation
                                ? "Primero selecciona una ubicación de origen"
                                : sourceLocationInventory.length === 0
                                ? "No hay inventario en esta ubicación"
                                : "Selecciona un lente"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getAvailableLenses().map((lens) => (
                            <SelectItem key={lens.id} value={lens.id.toString()}>
                              {lens.identifier} - {lens.brand} (Disp: {lens.quantity})
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
                  name="destination_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación de Destino</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedSourceLocation}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la ubicación de destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations
                            .filter((location) => location.id.toString() !== selectedSourceLocation)
                            .map((location) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name} ({location.warehouse?.name})
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
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={getMaxQuantityAvailable(selectedLensId, selectedSourceLocation)}
                          placeholder="Cantidad"
                          {...field}
                        />
                      </FormControl>
                      {selectedLensId && selectedSourceLocation && (
                        <p className="text-xs text-muted-foreground">
                          Disponible: {getMaxQuantityAvailable(selectedLensId, selectedSourceLocation)} unidades
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Transferencia</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente (crear solicitud)</SelectItem>
                          <SelectItem value="completed">Inmediata (ejecutar ahora)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionales para esta transferencia"
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
                  <Button type="submit">Crear Transferencia</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">Cargando transferencias...</div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p>No hay transferencias registradas. Crea una nueva para comenzar.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Lente</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => {
                const lens = transfer.lens || getLensById(transfer.lens_id);
                const sourceLocation = transfer.sourceLocation || getLocationById(transfer.source_location_id);
                const destinationLocation = transfer.destinationLocation || getLocationById(transfer.destination_location_id);
                
                return (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      {format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lens ? lens.identifier : `Lente ID: ${transfer.lens_id}`}
                    </TableCell>
                    <TableCell>
                      {sourceLocation ? sourceLocation.name : `Ubicación ID: ${transfer.source_location_id}`}
                    </TableCell>
                    <TableCell>
                      {destinationLocation ? destinationLocation.name : `Ubicación ID: ${transfer.destination_location_id}`}
                    </TableCell>
                    <TableCell>{transfer.quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transfer.status === 'completed'
                            ? 'default'
                            : transfer.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {transfer.status === 'completed'
                          ? 'Completada'
                          : transfer.status === 'pending'
                          ? 'Pendiente'
                          : 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCompleteTransfer(transfer.id)}
                          title="Completar transferencia"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default InventoryTransfers; 