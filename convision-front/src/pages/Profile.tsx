import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { User, Key, Check } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the data to the API
    setTimeout(() => {
      setIsEditingProfile(false);
      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido actualizados correctamente.",
      });
    }, 500);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the data to the API
    setTimeout(() => {
      setIsChangingPassword(false);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente.",
      });
    }, 500);
  };

  const getUserTypeLabel = () => {
    switch(user?.role) {
      case 'admin': return 'Administrador';
      case 'specialist': return 'Especialista';
      case 'receptionist': return 'Recepcionista';
      default: return 'Usuario';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          Mi Perfil
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu información de usuario
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                    id="name" 
                    defaultValue={user?.name} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    defaultValue={user?.email} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuario</Label>
                  <Input 
                    id="role" 
                    value={getUserTypeLabel()} 
                    disabled 
                  />
                  <p className="text-xs text-muted-foreground">
                    El rol solo puede ser modificado por un administrador.
                  </p>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Check className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <p className="text-sm font-medium">{user?.name}</p>
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico</Label>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Usuario</Label>
                  <p className="text-sm font-medium">{getUserTypeLabel()}</p>
                </div>
                <Button 
                  onClick={() => setIsEditingProfile(true)} 
                  className="w-full"
                >
                  Editar Perfil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isChangingPassword ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    required 
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsChangingPassword(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Check className="h-4 w-4 mr-2" />
                    Actualizar Contraseña
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Mantén tu cuenta segura con una contraseña fuerte
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setIsChangingPassword(true)} 
                  className="w-full"
                >
                  Cambiar Contraseña
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
