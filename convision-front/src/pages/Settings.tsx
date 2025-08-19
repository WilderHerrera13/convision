
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Bell, Eye, Monitor, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [theme, setTheme] = React.useState('light');
  const [cardView, setCardView] = React.useState(true);

  const handleSaveSettings = () => {
    // In a real app, this would send the data to the API
    toast({
      title: "Configuración guardada",
      description: "Tus preferencias han sido actualizadas correctamente.",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Configuración
          </h1>
          <p className="text-muted-foreground">
            Personaliza tu experiencia en Convision
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>
                Configura cómo quieres recibir notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones en el sistema</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibe notificaciones dentro de la aplicación
                  </p>
                </div>
                <Switch 
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas por correo</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibe notificaciones importantes por correo electrónico
                  </p>
                </div>
                <Switch 
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Preferencias de visualización
              </CardTitle>
              <CardDescription>
                Personaliza la apariencia de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={theme}
                  onValueChange={setTheme}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La opción "Sistema" se adaptará a las preferencias de tu dispositivo
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Vista de catálogo por defecto</Label>
                  <p className="text-xs text-muted-foreground">
                    Muestra el catálogo en vista de tarjetas o tabla
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="card-view" className="text-sm">Tabla</Label>
                  <Switch 
                    id="card-view"
                    checked={cardView}
                    onCheckedChange={setCardView}
                  />
                  <Label htmlFor="card-view" className="text-sm">Tarjetas</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Catalog View Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preferencias de Catálogo
              </CardTitle>
              <CardDescription>
                Configura cómo visualizar la información del catálogo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Elementos por página</Label>
                <Select defaultValue="12">
                  <SelectTrigger>
                    <SelectValue placeholder="Elementos por página" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 elementos</SelectItem>
                    <SelectItem value="12">12 elementos</SelectItem>
                    <SelectItem value="16">16 elementos</SelectItem>
                    <SelectItem value="24">24 elementos</SelectItem>
                    <SelectItem value="48">48 elementos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar detalles avanzados</Label>
                  <p className="text-xs text-muted-foreground">
                    Muestra especificaciones técnicas en el catálogo
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar disponibilidad</Label>
                  <p className="text-xs text-muted-foreground">
                    Muestra el inventario disponible
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} className="px-6">
            <Save className="h-4 w-4 mr-2" />
            Guardar Preferencias
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
