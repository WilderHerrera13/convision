import React from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Glasses, AlertTriangle, Home } from 'lucide-react';

interface ErrorPageProps {
  status?: 404 | 403 | 500;
  title?: string;
  message?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  status = 404,
  title,
  message,
}) => {
  const navigate = useNavigate();
  const error = useRouteError();
  
  // Default error messages
  const errorMessages = {
    404: {
      title: 'Página no encontrada',
      message: 'Lo sentimos, la página que estás buscando no existe.'
    },
    403: {
      title: 'Acceso denegado',
      message: 'No tienes permisos para acceder a esta página.'
    },
    500: {
      title: 'Error del servidor',
      message: 'Lo sentimos, ha ocurrido un error en el servidor.'
    }
  };

  // Use props values or defaults
  const errorTitle = title || errorMessages[status]?.title || 'Error';
  const errorMessage = message || errorMessages[status]?.message || 'Ha ocurrido un error inesperado.';
  
  // Log error for debugging
  console.error('Error encountered:', error);
  
  const getIconColor = () => {
    switch (status) {
      case 404:
        return 'bg-blue-100';
      case 403:
        return 'bg-yellow-100';
      case 500:
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-convision-background p-4">
      <div className="flex flex-col items-center justify-center text-center max-w-lg w-full mx-auto">
        <div className={`inline-flex items-center justify-center rounded-full ${getIconColor()} p-6 mb-6 shadow-lg`}>
          {status === 404 ? (
            <Glasses className="h-16 w-16 text-convision-primary" />
          ) : status === 403 ? (
            <AlertTriangle className="h-16 w-16 text-convision-warning" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-convision-error" />
          )}
        </div>
        
        <h1 className="text-8xl font-bold mb-4 text-gray-800">{status}</h1>
        <h2 className="text-3xl font-bold mb-4 text-gray-700">{errorTitle}</h2>
        <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-md">{errorMessage}</p>
        
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

// Special export for 404
export const NotFound = () => <ErrorPage status={404} />;

// Special export for 403
export const Forbidden = () => <ErrorPage status={403} />;

// Special export for 500
export const ServerError = () => <ErrorPage status={500} />;

export default ErrorPage;
