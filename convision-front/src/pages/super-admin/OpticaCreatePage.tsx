import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchableCombobox from '@/components/ui/SearchableCombobox';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import { superAdminService } from '@/services/superAdmin';

const opticaSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres').max(60).regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guiones bajos'),
  plan: z.enum(['standard', 'premium', 'enterprise'], { required_error: 'Seleccione un plan' }),
  admin: z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

type OpticaFormInput = z.infer<typeof opticaSchema>;

const PLAN_OPTIONS = [
  { value: 'standard', label: 'Estándar' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

const OpticaCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<OpticaFormInput>({
    resolver: zodResolver(opticaSchema),
    defaultValues: { name: '', slug: '', plan: 'standard', admin: { name: '', email: '', password: '' } },
  });

  const onSubmit = async (data: OpticaFormInput) => {
    setIsSubmitting(true);
    try {
      const created = await superAdminService.createOptica(data);
      toast({ title: 'Óptica creada', description: `${data.name} se registró correctamente.` });
      navigate(`/super-admin/opticas/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear la óptica';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="Nueva Óptica"
      subtitle="Super Admin / Ópticas / Nueva"
      actions={
        <Button type="button" variant="outline" className="h-9 rounded-md text-[13px]" onClick={() => navigate('/super-admin/opticas')}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Volver
        </Button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9]">
            <CardTitle className="text-[15px] font-semibold text-[#121215]">Datos de la óptica</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" {...register('name')} placeholder="Óptica El Bosque" />
              {errors.name && <p className="text-[12px] text-red-500">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" {...register('slug')} placeholder="optica_el_bosque" />
              {errors.slug && <p className="text-[12px] text-red-500">{errors.slug.message}</p>}
              <p className="text-[11px] text-[#7d7d87]">Solo minúsculas, números y guiones bajos. Ej: optica_bogota</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Plan *</Label>
              <Controller
                control={control}
                name="plan"
                render={({ field }) => (
                  <SearchableCombobox
                    options={PLAN_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Seleccione un plan"
                  />
                )}
              />
              {errors.plan && <p className="text-[12px] text-red-500">{errors.plan.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9]">
            <CardTitle className="text-[15px] font-semibold text-[#121215]">Administrador inicial</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin.name">Nombre *</Label>
              <Input id="admin.name" {...register('admin.name')} placeholder="María García" />
              {errors.admin?.name && <p className="text-[12px] text-red-500">{errors.admin.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin.email">Correo electrónico *</Label>
              <Input id="admin.email" type="email" {...register('admin.email')} placeholder="admin@optica.com" />
              {errors.admin?.email && <p className="text-[12px] text-red-500">{errors.admin.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin.password">Contraseña *</Label>
              <Input id="admin.password" type="password" {...register('admin.password')} placeholder="Mínimo 6 caracteres" />
              {errors.admin?.password && <p className="text-[12px] text-red-500">{errors.admin.password.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/super-admin/opticas')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#1a1a2e] text-white hover:bg-[#2a2a4e]"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Óptica
          </Button>
        </div>
      </form>
    </PageLayout>
  );
};

export default OpticaCreatePage;
