import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Home } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-convision-background p-4">
      <div className="flex flex-col items-center justify-center text-center max-w-lg w-full mx-auto">
        <div className="inline-flex items-center justify-center rounded-full bg-yellow-100 p-6 mb-6 shadow-lg">
          <Shield className="h-16 w-16 text-convision-warning" />
        </div>
        
        <h1 className="text-8xl font-bold mb-4 text-gray-800">403</h1>
        <h2 className="text-3xl font-bold mb-4 text-gray-700">Acceso Denegado</h2>
        <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-md">
          No tienes los permisos necesarios para acceder a esta página.
          Por favor contacta a un administrador si necesitas acceso.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3"
          >
            Volver atrás
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
