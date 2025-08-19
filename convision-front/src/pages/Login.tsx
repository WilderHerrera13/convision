import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Glasses, LockKeyhole, Mail, AlertCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define login form schema with validation rules
const loginSchema = z.object({
  email: z.string().email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const navigate = useNavigate();

  // Initialize form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Trigger staggered animations after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'specialist':
          navigate('/specialist/dashboard');
          break;
        case 'receptionist':
          navigate('/receptionist/dashboard');
          break;
        default:
          navigate('/unauthorized');
          break;
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setLoginError(null);
    try {
      await login(data.email, data.password);
    } catch (error) {
      if (error instanceof Error) {
        setLoginError(error.message || 'Error iniciando sesión. Verifique sus credenciales.');
      } else {
        setLoginError('Error iniciando sesión. Verifique sus credenciales.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden relative">
      {/* Left panel with branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-convision-primary to-blue-800 animate-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute w-96 h-96 -top-20 -left-20 rounded-full bg-white/20 blur-xl animate-float"></div>
          <div className="absolute w-96 h-96 bottom-20 right-10 rounded-full bg-white/20 blur-xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="flex flex-col justify-center items-center w-full p-12 z-10">
          <div 
            className={`text-white mb-8 transition-all duration-1000 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 mx-auto shadow-lg animate-float">
              <Glasses className="h-14 w-14 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-center">Convision</h1>
            <p className="text-xl text-center text-white/80">Sistema avanzado de gestión óptica</p>
          </div>
          
          <div 
            className={`relative mt-10 w-full max-w-md transition-all duration-1000 delay-300 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl text-white shadow-lg border border-white/20">
              <h3 className="text-xl font-medium mb-3">Gestión completa para su óptica</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mr-2"></div>
                  <span>Administración de pacientes</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mr-2"></div>
                  <span>Control de inventario</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mr-2"></div>
                  <span>Gestión de citas</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mr-2"></div>
                  <span>Historial médico</span>
                </li>
              </ul>
            </div>
            
            <svg className="absolute -bottom-px -z-10 w-full h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
              <path fill="white" fillOpacity="0.1" d="M0,128L48,144C96,160,192,192,288,186.7C384,181,480,139,576,144C672,149,768,203,864,208C960,213,1056,171,1152,154.7C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Right panel with login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-convision-primary to-blue-600 flex items-center justify-center mb-4 animate-float">
              <Glasses className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Convision</h1>
            <p className="text-gray-500">Sistema de Gestión de Lentes</p>
          </div>
          
          <Card 
            className={`w-full border-0 shadow-lg transition-all duration-700 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          >
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</CardTitle>
              <CardDescription className="text-gray-500">Inicie sesión para continuar</CardDescription>
            </CardHeader>
            
            <CardContent>
              {loginError && (
                <Alert variant="destructive" className="mb-4 animate-in fade-in-50 slide-in-from-top-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem 
                        className={`transition-all duration-700 delay-100 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                      >
                        <FormLabel className="text-gray-700">Correo Electrónico</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input 
                              placeholder="nombre@optica.com" 
                              {...field} 
                              autoComplete="email"
                              className="pl-10 bg-white border border-gray-200 focus:border-convision-primary focus:ring-1 focus:ring-convision-primary transition-all"
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem 
                        className={`transition-all duration-700 delay-200 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                      >
                        <FormLabel className="text-gray-700">Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              autoComplete="current-password"
                              className="pl-10 pr-10 bg-white border border-gray-200 focus:border-convision-primary focus:ring-1 focus:ring-convision-primary transition-all"
                            />
                            <button 
                              type="button" 
                              onClick={togglePasswordVisibility}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-convision-primary transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <div 
                    className={`transition-all duration-700 delay-300 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-gradient-to-r from-convision-primary to-blue-600 hover:from-blue-600 hover:to-convision-primary shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                      disabled={isSubmitting}
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        {isSubmitting && <Glasses className="absolute left-1/2 transform -translate-x-1/2 h-5 w-5 animate-spin mr-2" />}
                        <span className={`transition-all duration-300 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                          Iniciar Sesión
                        </span>
                      </span>
                      <div className="absolute inset-0 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left bg-gradient-to-r from-blue-700 to-convision-dark"></div>
                    </Button>
                    
                    <div className="mt-3 h-0.5 w-full bg-gray-100 relative overflow-hidden">
                      {isSubmitting && (
                        <div className="h-full bg-gradient-to-r from-convision-primary to-blue-600 animate-progress"></div>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter 
              className={`flex justify-between pt-0 transition-all duration-700 delay-400 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            >
              <div className="w-full text-center">
                <a href="#" className="text-sm text-convision-primary hover:text-convision-dark transition-colors">
                  ¿Olvidó su contraseña?
                </a>
              </div>
            </CardFooter>
          </Card>
          
          <div 
            className={`mt-6 text-center text-sm text-gray-500 transition-all duration-700 delay-500 transform ${animationComplete ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          >
            Aplicación de uso interno de Convision Óptica
            <div className="mt-2 text-xs">© {new Date().getFullYear()} Convision - Todos los derechos reservados</div>
          </div>
        </div>
      </div>
      
      {/* Background decorations */}
      <div className="hidden md:block absolute -bottom-32 -right-32 w-96 h-96 bg-blue-50 rounded-full opacity-50 blur-3xl"></div>
      <div className="hidden md:block absolute top-0 left-1/3 w-32 h-32 bg-convision-light rounded-full opacity-50 blur-xl"></div>
    </div>
  );
};

export default Login;
