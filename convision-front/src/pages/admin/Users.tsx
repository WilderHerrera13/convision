import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Users as UsersIcon, UserPlus, Search, Edit, Trash2, ArrowLeft, User as UserIcon, Mail, Lock, Phone, IdCard, UserCog } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { userService, User, CreateUserData } from '@/services/userService';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';

// Form validation schema
const createUserFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  identification: z.string().min(8, 'El número de identificación debe tener al menos 8 caracteres'),
  phone: z.string().min(10, 'El número de teléfono debe tener al menos 10 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'La confirmación de contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'specialist', 'receptionist'], {
    required_error: 'Por favor selecciona un rol',
  }),
}).refine((data) => data.password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
});

const editUserFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  identification: z.string().min(8, 'El número de identificación debe tener al menos 8 caracteres'),
  phone: z.string().min(10, 'El número de teléfono debe tener al menos 10 caracteres'),
  role: z.enum(['admin', 'specialist', 'receptionist'], {
    required_error: 'Por favor selecciona un rol',
  }),
});

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
type EditUserFormValues = z.infer<typeof editUserFormSchema>;
type UserFormValues = CreateUserFormValues | EditUserFormValues;

const Users: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEditMode ? editUserFormSchema : createUserFormSchema),
    defaultValues: isEditMode ? {
      name: '',
      last_name: '',
      email: '',
      identification: '',
      phone: '',
      role: 'receptionist',
    } : {
      name: '',
      last_name: '',
      email: '',
      identification: '',
      phone: '',
      password: '',
      confirm_password: '',
      role: 'receptionist',
    },
  });

  // Check if we're in create mode
  const isCreateMode = location.pathname === '/admin/users/new';

  // Fetch users on component mount if not in create mode
  useEffect(() => {
    if (!isCreateMode) {
      fetchUsers();
    }
  }, [isCreateMode]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAll();
      console.log('Debug - Users component: fetched users data:', data);
      console.log('Debug - Users component: first user role:', data[0]?.role);
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los usuarios');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  });

  // Create or edit user
  const handleUserFormSubmit = async (data: UserFormValues) => {
    setIsLoading(true);
    try {
      if (isEditMode && currentUserId) {
        // Update existing user
        const editData = data as EditUserFormValues;
        await userService.update(currentUserId, {
          name: editData.name,
          last_name: editData.last_name,
          email: editData.email,
          identification: editData.identification,
          phone: editData.phone,
          role: editData.role,
        });
        toast({
          title: "Usuario actualizado",
          description: `${editData.name} ${editData.last_name} ha sido actualizado exitosamente.`,
        });
      } else {
        // Create new user
        const createData = data as CreateUserFormValues;
        await userService.create({
          name: createData.name,
          last_name: createData.last_name,
          email: createData.email,
          identification: createData.identification,
          phone: createData.phone,
          password: createData.password,
          role: createData.role,
        });
        toast({
          title: "Usuario creado",
          description: `${createData.name} ${createData.last_name} ha sido añadido exitosamente.`,
        });
      }
      
      // Reset and close dialog
      form.reset();
      setIsCreateDialogOpen(false);
      setIsEditMode(false);
      setCurrentUserId(null);
      fetchUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    try {
      await userService.delete(userId);
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente.",
      });
      fetchUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el usuario';
      toast({
        title: "Error al eliminar usuario",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const handleEditUser = (user: User) => {
    form.reset({
      name: user.name,
      last_name: user.last_name || '',
      email: user.email,
      identification: user.identification || '',
      phone: user.phone || '',
      role: user.role,
    });
    setCurrentUserId(user.id);
    setIsEditMode(true);
    setIsCreateDialogOpen(true);
  };

  // Open create dialog
  const handleCreateUser = () => {
    form.reset({
      name: '',
      last_name: '',
      email: '',
      identification: '',
      phone: '',
      role: 'receptionist',
    });
    setIsEditMode(false);
    setCurrentUserId(null);
    setIsCreateDialogOpen(true);
  };

  // Get user type translation
  const getUserTypeLabel = (role: User['role']): string => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'specialist':
        return 'Especialista';
      case 'receptionist':
        return 'Recepcionista';
      default:
        return role;
    }
  };

  // In the component, define the columns for the DataTable
  const columns: DataTableColumnDef[] = [
    {
      id: 'name',
      header: 'Nombre',
      type: 'text',
      accessorKey: 'name'
    },
    {
      id: 'email',
      header: 'Correo Electrónico',
      type: 'text',
      accessorKey: 'email'
    },
    {
      id: 'role',
      header: 'Tipo de Usuario',
      type: 'status',
      accessorKey: 'role',
      statusVariants: {
        'admin': 'success',
        'receptionist': 'info',
        'specialist': 'warning',
        'manager': 'secondary'
      },
      statusLabels: {
        'admin': 'Administrador',
        'receptionist': 'Recepcionista',
        'specialist': 'Especialista',
        'manager': 'Gerente'
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditUser(user)}
              title="Editar usuario"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {user.id !== currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteUser(user.id)}
                title="Eliminar usuario"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  // Render create form
  if (isCreateMode) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/users')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold">Crear Nuevo Usuario</h1>
          </div>

          <div className="max-w-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUserFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Nombre
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Apellido
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Apellido" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="identification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <IdCard className="h-4 w-4" />
                          Número de Identificación
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Número de Teléfono
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Correo Electrónico
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="correo@convision.com" 
                          type="email" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Contraseña
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="••••••••" 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Confirmar Contraseña
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="••••••••" 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Tipo de Usuario
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="specialist">Especialista</SelectItem>
                          <SelectItem value="receptionist">Recepcionista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/admin/users')}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creando...' : 'Crear Usuario'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </>
    );
  }

  // Render users list
  console.log('Debug - Users component: filteredUsers data:', filteredUsers);
  console.log('Debug - Users component: columns config:', columns);
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" /> 
            Gestión de Usuarios
          </h1>
          <Button onClick={handleCreateUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            className="pl-8 max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="rounded-md border">
          <DataTable
            data={filteredUsers}
            columns={columns}
            loading={loading}
            error={error || undefined}
            emptyMessage="No hay usuarios registrados."
          />
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Modifica los detalles del usuario existente.' 
                : 'Ingresa los detalles para crear un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUserFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Nombre
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Apellido
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Apellido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="identification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <IdCard className="h-4 w-4" />
                        Número de Identificación
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Número de Teléfono
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Correo Electrónico
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="correo@convision.com" 
                        type="email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Contraseña
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="••••••••" 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Confirmar Contraseña
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="••••••••" 
                            type="password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Tipo de Usuario
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="specialist">Especialista</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading 
                    ? (isEditMode ? 'Actualizando...' : 'Creando...') 
                    : (isEditMode ? 'Actualizar Usuario' : 'Crear Usuario')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Users;
