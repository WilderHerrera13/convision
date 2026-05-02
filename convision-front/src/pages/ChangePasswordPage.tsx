import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import logoBrand from '@/assets/logo-brand.svg';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const schema = z.object({
  new_password: z.string().min(8, { message: 'Mínimo 8 caracteres' }),
  confirm_password: z.string().min(1, { message: 'Confirma tu contraseña' }),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

type FormValues = z.infer<typeof schema>;

const ChangePasswordPage: React.FC = () => {
  const { user, changePassword } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await changePassword(data.new_password, data.confirm_password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          </div>
        </div>

        <div className="relative flex flex-1 flex-col items-center bg-white px-4 pt-10 md:px-0 md:pt-[220px]">
          <Card className="w-full max-w-[420px] rounded-[12px] border border-[#E5E5E9] bg-white shadow-[0_4px_24px_0_rgba(0,0,0,0.06)]">
            <CardContent className="p-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-10 rounded-[8px] bg-[#fff6e3] flex items-center justify-center shrink-0">
                  <ShieldAlert className="size-5 text-[#b57218]" />
                </div>
                <div>
                  <h1 className="text-[20px] font-bold text-[#121215] leading-tight">Cambia tu contraseña</h1>
                  <p className="text-[12px] text-[#7D7D87] mt-0.5">
                    Hola, <span className="font-semibold text-[#121215]">{user?.name}</span>. Por seguridad debes crear una contraseña nueva antes de continuar.
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#E5E5E9] mb-5" />

              {error && (
                <p role="alert" className="mb-4 text-[12px] font-medium text-red-500">
                  {error}
                </p>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem className="space-y-[6px]">
                        <FormLabel className="text-[11px] font-semibold text-[#7D7D87]">Nueva contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-[#B4B5BC]" />
                            <Input
                              {...field}
                              type={showNew ? 'text' : 'password'}
                              placeholder="Mínimo 8 caracteres"
                              className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 pr-9 text-[13px] placeholder:text-[#B4B5BC]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew((v) => !v)}
                              className="absolute right-3 top-3 text-[#B4B5BC] hover:text-[#7D7D87]"
                            >
                              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[12px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem className="space-y-[6px]">
                        <FormLabel className="text-[11px] font-semibold text-[#7D7D87]">Confirmar contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-[#B4B5BC]" />
                            <Input
                              {...field}
                              type={showConfirm ? 'text' : 'password'}
                              placeholder="Repite la nueva contraseña"
                              className="h-10 rounded-[6px] border-[#E5E5E9] bg-[#F9F9FA] pl-9 pr-9 text-[13px] placeholder:text-[#B4B5BC]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm((v) => !v)}
                              className="absolute right-3 top-3 text-[#B4B5BC] hover:text-[#7D7D87]"
                            >
                              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    className="mt-2 h-10 w-full rounded-[6px] bg-[#3a71f7] hover:bg-[#2d5fd6] text-white text-[13px] font-semibold"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
