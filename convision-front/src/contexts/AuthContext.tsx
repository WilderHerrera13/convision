import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { authService } from '@/services/auth';
import { User } from '@/types/user';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isSpecialist: () => boolean;
  isReceptionist: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        const storedUser = authService.getUser();
        
        if (!token || !storedUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        setUser(storedUser);
        
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (verificationError) {
          const errorResponse = verificationError as { response?: { status?: number } };
          
          if (errorResponse?.response?.status === 401 || errorResponse?.response?.status === 403) {
            await authService.logout();
            setUser(null);
          } else {
            setUser(storedUser);
          }
        }
      } catch (error: unknown) {
        const storedUser = authService.getUser();
        const token = authService.getToken();
        
        if (token && storedUser) {
          setUser(storedUser);
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido(a), ${response.user.name}!`,
      });
      
      if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.user.role === 'specialist') {
        navigate('/specialist/dashboard');
      } else if (response.user.role === 'receptionist') {
        navigate('/receptionist/dashboard');
      } else {
        navigate('/catalog');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: (error instanceof Error) ? error.message : "Credenciales incorrectas o problema de conexión.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await Promise.all([
        authService.logout(),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
      setUser(null);
      setTimeout(() => {
        navigate('/login');
        setIsLoggingOut(false);
      }, 500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: (error instanceof Error) ? error.message : "Ha ocurrido un problema al cerrar sesión.",
      });
      setIsLoggingOut(false);
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isSpecialist = () => user?.role === 'specialist';
  const isReceptionist = () => user?.role === 'receptionist';

  const value = {
    user,
    isAuthenticated: !!user && !!user.role,
    isLoading,
    isLoggingOut,
    login,
    logout,
    isAdmin,
    isSpecialist,
    isReceptionist,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoggingOut && <LoadingScreen message="Cerrando sesión..." />}
      {children}
    </AuthContext.Provider>
  );
}; 