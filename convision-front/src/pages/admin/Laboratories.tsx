import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  DataTable,
  DataTableColumnDef,
} from '@/components/ui/data-table';

interface Laboratory {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Form validation schema
const laboratorySchema = z.object({
  name: z.string().min(1, { message: 'El nombre del laboratorio es obligatorio' }),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Dirección de correo electrónico inválida' }).optional().or(z.literal('')),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type LaboratoryFormValues = z.infer<typeof laboratorySchema>;

const Laboratories: React.FC = () => {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingLaboratory, setEditingLaboratory] = useState<Laboratory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [laboratoryToDelete, setLaboratoryToDelete] = useState<Laboratory | null>(null);
  const { toast } = useToast();
  
  const form = useForm<LaboratoryFormValues>({
    resolver: zodResolver(laboratorySchema),
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
      notes: '',
    },
  });
  
  // Load laboratories
  const fetchLaboratories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/laboratories');
      setLaboratories(response.data.data);
    } catch (error) {
      console.error('Error fetching laboratories:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar laboratorios',
        description: 'Por favor, inténtelo más tarde',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaboratories();
  }, []);

  // Open dialog for creating a new laboratory
  const showCreateDialog = () => {
    setEditingLaboratory(null);
    form.reset({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
      notes: '',
    });
    setDialogOpen(true);
  };

  // Open dialog for editing an existing laboratory
  const showEditDialog = (laboratory: Laboratory) => {
    setEditingLaboratory(laboratory);
    form.reset({
      name: laboratory.name,
      contact_person: laboratory.contact_person || '',
      phone: laboratory.phone || '',
      email: laboratory.email || '',
      address: laboratory.address || '',
      status: laboratory.status,
      notes: laboratory.notes || '',
    });
    setDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = async (data: LaboratoryFormValues) => {
    try {
      if (editingLaboratory) {
        // Update existing laboratory
        await api.put(`/api/v1/laboratories/${editingLaboratory.id}`, data);
        toast({
          title: 'Laboratorio actualizado',
          description: 'El laboratorio ha sido actualizado con éxito',
        });
      } else {
        // Create new laboratory
        await api.post('/api/v1/laboratories', data);
        toast({
          title: 'Laboratorio creado',
          description: 'El laboratorio ha sido creado con éxito',
        });
      }
      
      setDialogOpen(false);
      fetchLaboratories();
    } catch (error) {
      console.error('Error saving laboratory:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar laboratorio',
        description: error.response?.data?.message || 'Ocurrió un error al guardar el laboratorio',
      });
    }
  };

  // Prepare laboratory for deletion
  const confirmDelete = (laboratory: Laboratory) => {
    setLaboratoryToDelete(laboratory);
    setDeleteDialogOpen(true);
  };

  // Handle laboratory deletion
  const handleDelete = async () => {
    if (!laboratoryToDelete) return;
    
    try {
      await api.delete(`/api/v1/laboratories/${laboratoryToDelete.id}`);
      toast({
        title: 'Laboratorio eliminado',
        description: 'El laboratorio ha sido eliminado con éxito',
      });
      fetchLaboratories();
    } catch (error) {
      console.error('Error deleting laboratory:', error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar laboratorio',
        description: error.response?.data?.message || 'Ocurrió un error al eliminar el laboratorio',
      });
    } finally {
      setDeleteDialogOpen(false);
      setLaboratoryToDelete(null);
    }
  };

  // Define columns for the DataTable
  const columns: DataTableColumnDef[] = [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name',
      cell: ({ row }) => {
        const lab = row.original;
        return <span className="font-medium">{lab.name}</span>;
      }
    },
    {
      id: 'contact_person',
      header: 'Persona de Contacto',
      type: 'text',
      accessorKey: 'contact_person',
      cell: ({ row }) => {
        const lab = row.original;
        return lab.contact_person || 'N/A';
      }
    },
    {
      id: 'phone',
      header: 'Teléfono',
      type: 'text',
      accessorKey: 'phone',
      cell: ({ row }) => {
        const lab = row.original;
        return lab.phone || 'N/A';
      }
    },
    {
      id: 'email',
      header: 'Correo Electrónico',
      type: 'text',
      accessorKey: 'email',
      cell: ({ row }) => {
        const lab = row.original;
        return lab.email || 'N/A';
      }
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: ({ row }) => {
        const lab = row.original;
        return (
          <Badge variant={lab.status === 'active' ? 'default' : 'outline'} className="capitalize">
            {lab.status === 'active' ? 'Activo' : 'Inactivo'}
          </Badge>
        );
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: ({ row }) => {
        const lab = row.original;
        return (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => showEditDialog(lab)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => confirmDelete(lab)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laboratorios</h1>
          <p className="text-muted-foreground">
            Gestione los laboratorios asociados para la fabricación de lentes
          </p>
        </div>
        <Button onClick={showCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Laboratorio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laboratorios</CardTitle>
          <CardDescription>
            Laboratorios que procesan y fabrican lentes para pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={laboratories} 
            loading={loading}
            emptyMessage="No se encontraron laboratorios"
          />
        </CardContent>
      </Card>

      {/* Laboratory Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingLaboratory ? 'Editar Laboratorio' : 'Agregar Laboratorio'}</DialogTitle>
            <DialogDescription>
              {editingLaboratory 
                ? 'Actualice la información del laboratorio a continuación.'
                : 'Complete los detalles para agregar un nuevo laboratorio.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Laboratorio</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el nombre del laboratorio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona de Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el nombre de la persona de contacto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese el número de teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese el correo electrónico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ingrese la dirección del laboratorio" rows={3} {...field} />
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
                          <SelectValue placeholder="Seleccione el estado" />
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
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ingrese notas adicionales" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">
                  {editingLaboratory ? 'Actualizar Laboratorio' : 'Crear Laboratorio'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente el laboratorio "{laboratoryToDelete?.name}".
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Laboratories; 