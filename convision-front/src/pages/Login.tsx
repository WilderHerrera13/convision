import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Check } from 'lucide-react';
import logoBrand from '@/assets/logo-brand.svg';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingScreen } from '@/components/ui/loading-screen';

const loginSchema = z.object({
  email: z.string().email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' })
});

type LoginFormValues = z.infer<typeof loginSchema>;
type AuthView = 'login' | 'recover' | 'confirm';

const Login: React.FC = () => {
  const { login, isAuthenticated, user, isLoggingIn } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

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

  const onSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    try {
      await login(data.email, data.password);
    } catch (error) {
      if (error instanceof Error) {
        setLoginError(error.message || 'Error iniciando sesión. Verifique sus credenciales.');
      } else {
        setLoginError('Error iniciando sesión. Verifique sus credenciales.');
      }
    }
  };

  const topByView: Record<AuthView, string> = {
    login: 'md:pt-[213px]',
    recover: 'md:pt-[265px]',
    confirm: 'md:pt-[307px]'
  };

  return (
    <>
    {isLoggingIn && <LoadingScreen variant="login" />}
    <div className="min-h-screen w-full bg-[#F5F5F6]">
      <div className="flex min-h-screen w-full">
        <div className="relative hidden h-screen w-[680px] flex-shrink-0 overflow-hidden bg-gradient-to-b from-[#363F80] to-[#566EDD] md:block">
          <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/5" />
          <div className="absolute bottom-5 right-[-20px] h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="flex h-full w-full flex-col items-center pt-[200px] text-center text-white">
            <img src={logoBrand} alt="Logo Óptica Convisión" className="h-[220px] w-[220px]" />
            <p className="mt-[14px] text-[38px] font-bold leading-[1.21]">ÓPTICA</p>
            <p className="text-[38px] font-bold leading-[1.21]">CONVISIÓN</p>
            <p className="mt-1 text-[18px] leading-[1.21] text-white/70">Villavicencio</p>
            <p className="mt-[50px] text-[15px] leading-[1.21] text-white/55">El sistema de gestión para tu óptica</p>
          </div>
        </div>
        <div className={`relative flex flex-1 flex-col items-center bg-white px-4 pt-10 md:px-0 ${topByView[view]}`}>
          <Card className={`w-full max-w-[400px] rounded-[12px] border border-[#E5E5E9] bg-white shadow-[0_4px_24px_0_rgba(0,0,0,0.06)]`}>
          <CardContent className="p-10">
            {view === 'login' && (
              <>
                <h1 className="text-[26px] leading-[1.21] font-bold text-[#121215]">Bienvenido</h1>
                <p className="mt-[9px] text-[13px] leading-[1.21] text-[#7D7D87]">Ingresa tus credenciales para acceder al sistema</p>
                <div className="mt-6 h-px bg-[#E5E5E9]" />
                {loginError && <p className="mt-3 text-[12px] font-medium text-red-500">{loginError}</p>}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-[25px]">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-[6px]">
                          <FormLabel className="text-[11px] font-semibold text-[#7D7D87]">Usuario</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-[#B4B5BC]" />
                              <Input {...field} autoComplete="email" placeholder="correo@optica.com" className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 text-[13px] placeholder:text-[#B4B5BC]" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[12px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="mt-5 space-y-[6px]">
                          <FormLabel className="text-[11px] font-semibold text-[#7D7D87]">Contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-[#B4B5BC]" />
                              <Input {...field} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 pr-9 text-[13px] placeholder:text-[#B4B5BC]" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[#B4B5BC]" aria-label="Mostrar contraseña">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-[12px]" />
                        </FormItem>
                      )}
                    />
                    <button type="button" onClick={() => setView('recover')} className="mt-2 block w-full text-right text-[12px] font-semibold text-[#3A71F7]">
                      ¿Olvidaste tu contraseña?
                    </button>
                    <Button type="submit" disabled={isLoggingIn} className="mt-5 h-11 w-full rounded-[8px] bg-[#3A71F7] text-[14px] font-semibold hover:bg-[#2f62db]">
                      Ingresar
                    </Button>
                  </form>
                </Form>
              </>
            )}
            {view === 'recover' && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF1FF]">
                  <Mail className="h-4 w-4 text-[#3A71F7]" />
                </div>
                <h2 className="mt-4 text-center text-[22px] font-bold leading-[1.21] text-[#121215]">Recuperar contraseña</h2>
                <p className="mt-[13px] text-center text-[13px] leading-[1.21] text-[#7D7D87]">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
                <div className="mt-[16px] h-px bg-[#E5E5E9]" />
                <label className="mt-[16px] block text-[11px] font-semibold text-[#7D7D87]">Correo electrónico</label>
                <div className="relative mt-[6px]">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#B4B5BC]" />
                  <Input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="correo@optica.com" className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 text-[13px] placeholder:text-[#B4B5BC]" />
                </div>
                <Button type="button" onClick={() => setView('confirm')} className="mt-[14px] h-11 w-full rounded-[8px] bg-[#3A71F7] text-[13px] font-semibold hover:bg-[#2f62db]">
                  Enviar enlace de recuperación
                </Button>
                <button type="button" onClick={() => setView('login')} className="mt-[13px] flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-[#3A71F7]">
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
                </button>
              </>
            )}
            {view === 'confirm' && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF5EF]">
                  <Check className="h-5 w-5 text-[#228B52]" />
                </div>
                <h2 className="mt-4 text-center text-[22px] font-bold leading-[1.21] text-[#121215]">¡Correo enviado!</h2>
                <p className="mt-[13px] text-center text-[13px] leading-[1.21] text-[#7D7D87]">Revisa tu bandeja de entrada. El enlace expira en 30 minutos.</p>
                <Button type="button" onClick={() => setView('login')} className="mt-5 h-11 w-full rounded-[8px] bg-[#3A71F7] text-[13px] font-semibold hover:bg-[#2f62db]">
                  Volver al inicio de sesión
                </Button>
              </>
            )}
          </CardContent>
        </Card>
          <div className="mt-auto pb-7 text-center text-[11px] leading-[1.21] text-[#B4B5BC]">
            © 2026 Óptica Convisión — Villavicencio
          </div>
          <div className="mt-6 text-center text-[12px] text-[#7D7D87] md:hidden">
            El sistema de gestión para tu óptica
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Login;
