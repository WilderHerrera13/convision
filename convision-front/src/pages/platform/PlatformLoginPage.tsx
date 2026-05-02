import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import api from '@/lib/axios';

const loginSchema = z.object({
  email: z.string().min(1, { message: 'El usuario es requerido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      const response = await api.post('/api/v1/platform/auth/login', data);
      const { access_token, token_type, user } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('auth_user', JSON.stringify({ ...user, feature_flags: [] }));
      localStorage.setItem('auth_branches', JSON.stringify([]));
      localStorage.setItem('require_password_change', 'false');
      navigate('/super-admin/opticas');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Credenciales incorrectas o problema de conexión.';
      setLoginError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5F6] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <p className="text-[13px] text-[#7D7D87]">Administración de plataforma</p>
          <h1 className="text-[24px] font-bold text-[#121215] mt-1">Super Admin</h1>
        </div>
        <Card className="rounded-[12px] border border-[#E5E5E9] bg-white shadow-[0_4px_24px_0_rgba(0,0,0,0.06)]">
          <CardContent className="p-10">
            <h2 className="text-[20px] font-bold text-[#121215]">Iniciar sesión</h2>
            <p className="mt-[6px] text-[13px] text-[#7D7D87]">Ingresa tus credenciales de administrador</p>
            <div className="mt-5 h-px bg-[#E5E5E9]" />
            {loginError && (
              <p role="alert" className="mt-3 text-[12px] font-medium text-red-500">
                {loginError}
              </p>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-[22px]">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-[6px]">
                      <FormLabel className="text-[11px] font-semibold text-[#7D7D87]">Usuario</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-[#B4B5BC]" />
                          <Input
                            {...field}
                            autoComplete="username"
                            placeholder="correo@convision.com"
                            className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 text-[13px] placeholder:text-[#B4B5BC]"
                          />
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
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 pr-9 text-[13px] placeholder:text-[#B4B5BC]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-[#B4B5BC]"
                            aria-label="Mostrar contraseña"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[12px]" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 h-11 w-full rounded-[8px] bg-[#1a1a2e] text-[14px] font-semibold hover:bg-[#0f0f1a]"
                >
                  {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-[11px] text-[#B4B5BC]">
          © 2026 Convision — Plataforma
        </p>
      </div>
    </div>
  );
};

export default PlatformLoginPage;
