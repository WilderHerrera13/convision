import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { authService, BranchInfo } from '@/services/auth';
import { User } from '@/types/user';
import { LoadingScreen } from '@/components/ui/loading-screen';

const ROLE_COLORS: Record<string, { primary: string; dark: string; light: string }> = {
  admin:        { primary: '#3a71f8', dark: '#2558d4', light: '#eff1ff' },
  specialist:   { primary: '#0f8f64', dark: '#0a6e4d', light: '#e5f8ef' },
  receptionist: { primary: '#8753ef', dark: '#6a3cc4', light: '#f1ebff' },
};

function applyRoleColors(role: string | undefined) {
  const colors = ROLE_COLORS[role ?? ''] ?? ROLE_COLORS.admin;
  const root = document.documentElement;
  root.style.setProperty('--role-primary', colors.primary);
  root.style.setProperty('--role-dark', colors.dark);
  root.style.setProperty('--role-light', colors.light);
}

interface AuthContextType {
  user: User | null;
  branches: BranchInfo[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
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
  const [branches, setBranches] = useState<BranchInfo[]>(() => authService.getBranches());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
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
    setIsLoggingIn(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);

      const userBranches = response.branches ?? [];
      setBranches(userBranches);

      if (userBranches.length === 1) {
        localStorage.setItem('convision_branch_id', String(userBranches[0].id));
        localStorage.setItem('convision_branch_name', userBranches[0].name);

        if (response.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (response.user.role === 'specialist') {
          navigate('/specialist/dashboard');
        } else {
          navigate('/receptionist/dashboard');
        }
      } else {
        navigate('/select-branch');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Credenciales incorrectas o problema de conexión.';
      throw new Error(message);
    } finally {
      setIsLoggingIn(false);
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
      setBranches([]);
      localStorage.removeItem('convision_branch_id');
      localStorage.removeItem('convision_branch_name');
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

  useEffect(() => {
    applyRoleColors(user?.role);
  }, [user?.role]);

  const isAdmin = () => user?.role === 'admin';
  const isSpecialist = () => user?.role === 'specialist';
  const isReceptionist = () => user?.role === 'receptionist';

  const value = {
    user,
    branches,
    isAuthenticated: !!user && !!user.role,
    isLoading,
    isLoggingIn,
    isLoggingOut,
    login,
    logout,
    isAdmin,
    isSpecialist,
    isReceptionist,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoggingOut && <LoadingScreen variant="logout" />}
      {children}
    </AuthContext.Provider>
  );
}; 