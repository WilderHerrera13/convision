import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { superAdminService } from '@/services/superAdmin';
import { cn } from '@/lib/utils';

const opticaSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
  plan: z.enum(['standard', 'premium', 'enterprise']),
  admin: z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

type OpticaFormInput = z.infer<typeof opticaSchema>;

type TabKey = 'info' | 'config' | 'flags';

interface FeatureFlagDefault {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

const FEATURE_FLAGS_DEFAULTS: FeatureFlagDefault[] = [
  { key: 'sidebar.appointments',          label: 'Citas',                          description: 'Agenda de citas y consultas',                  defaultEnabled: true },
  { key: 'sidebar.sales',                 label: 'Ventas',                         description: 'Punto de venta y facturación',                 defaultEnabled: true },
  { key: 'sidebar.quotes',                label: 'Cotizaciones',                   description: 'Generación de cotizaciones',                   defaultEnabled: true },
  { key: 'sidebar.laboratory',            label: 'Laboratorio',                    description: 'Órdenes de laboratorio',                       defaultEnabled: true },
  { key: 'sidebar.cash_close',            label: 'Cierre de Caja',                 description: 'Cierre diario de caja y historial',            defaultEnabled: true },
  { key: 'sidebar.advisor_report',        label: 'Gestión Diaria de Asesor',       description: 'Reporte de gestión diario del asesor',         defaultEnabled: true },
  { key: 'sidebar.specialist_management', label: 'Gestión Diaria de Especialista', description: 'Informe de gestión del especialista',          defaultEnabled: true },
  { key: 'sidebar.purchases',             label: 'Compras',                        description: 'Gestión de compras a proveedores',             defaultEnabled: false },
  { key: 'sidebar.inventory',             label: 'Inventario',                     description: 'Control de stock y productos',                 defaultEnabled: false },
  { key: 'sidebar.payroll',               label: 'Nómina',                         description: 'Gestión de nómina y pagos',                   defaultEnabled: false },
  { key: 'sidebar.expenses',              label: 'Gastos',                         description: 'Control de gastos y egresos',                  defaultEnabled: false },
  { key: 'sidebar.reports',               label: 'Informe Gestión Especialista',   description: 'Reportes de gestión por especialista (admin)', defaultEnabled: false },
  { key: 'sidebar.discounts',             label: 'Descuentos',                     description: 'Gestión de solicitudes de descuento',          defaultEnabled: false },
];

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 60);
}

const OpticaCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<OpticaFormInput>({
    resolver: zodResolver(opticaSchema),
    defaultValues: { name: '', slug: '', plan: 'standard', admin: { name: '', email: '', password: '' } },
  });

  const nameValue = watch('name');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    setValue('slug', generateSlug(name));
  };

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

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'info', label: 'Información básica' },
    { key: 'config', label: 'Configuración' },
    { key: 'flags', label: 'Feature Flags' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[#ebebee] bg-white px-6 h-[60px] flex items-center justify-between shrink-0">
        <div>
          <p className="text-[12px] text-[#7d7d87] leading-none mb-1">Panel Super Admin / Nueva Óptica</p>
          <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-none">Nueva Óptica</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-[6px] text-[13px] border-[#e5e5e9] w-[160px]"
            onClick={() => navigate('/super-admin/opticas')}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            className="h-9 rounded-[6px] text-[13px] bg-[#3a71f7] text-white hover:bg-[#2558d4] w-[160px]"
            onClick={handleSubmit(onSubmit)}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Óptica
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="rounded-[8px] border border-[#ebebee] bg-white overflow-hidden">
              <div className="border-b border-[#e5e5e9] bg-[#fafafb] flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'px-4 h-[48px] text-[13px] relative transition-colors',
                      activeTab === tab.key
                        ? 'text-[#0f0f12] font-semibold bg-white'
                        : 'text-[#7d7d87] hover:text-[#121215]',
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3a71f7]" />
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'info' && (
                <div className="p-8">
                  <p className="text-[13px] font-semibold text-[#0f0f12] mb-5">Información de la óptica</p>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#121215]">Nombre comercial *</label>
                      <Input
                        {...register('name')}
                        onChange={handleNameChange}
                        placeholder="Ej: Óptica Convisión"
                        className="h-9 text-[13px] rounded-[6px] border-[#e0e0e5]"
                      />
                      {errors.name && <p className="text-[11px] text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#121215]">Plan *</label>
                      <select
                        {...register('plan')}
                        className="h-9 w-full rounded-[6px] border border-[#e0e0e5] bg-white px-3 text-[13px] text-[#121215] focus:outline-none focus:ring-2 focus:ring-[#3a71f7] focus:ring-offset-0"
                      >
                        <option value="standard">Estándar</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[11px] font-medium text-[#121215]">Schema de base de datos</label>
                      <div className="h-9 rounded-[6px] border border-[#e0e0e5] bg-[#f5f5f7] px-3 flex items-center">
                        <span className="text-[13px] text-[#b4b5bc]">
                          {nameValue ? `optica_${generateSlug(nameValue)}` : 'Se genera automáticamente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-px bg-[#f0f0f2]" />
                  <p className="text-[13px] font-semibold text-[#0f0f12] mb-5">Administrador de la óptica</p>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#121215]">Nombre completo *</label>
                      <Input
                        {...register('admin.name')}
                        placeholder="Ej: Carlos Martínez"
                        className="h-9 text-[13px] rounded-[6px] border-[#e0e0e5]"
                      />
                      {errors.admin?.name && <p className="text-[11px] text-red-500">{errors.admin.name.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#121215]">Correo electrónico *</label>
                      <Input
                        type="email"
                        {...register('admin.email')}
                        placeholder="admin@optica.com"
                        className="h-9 text-[13px] rounded-[6px] border-[#e0e0e5]"
                      />
                      {errors.admin?.email && <p className="text-[11px] text-red-500">{errors.admin.email.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[11px] font-medium text-[#121215]">Contraseña temporal *</label>
                      <Input
                        type="password"
                        {...register('admin.password')}
                        placeholder="Mínimo 6 caracteres"
                        className="h-9 text-[13px] rounded-[6px] border-[#e0e0e5] max-w-[340px]"
                      />
                      {errors.admin?.password && <p className="text-[11px] text-red-500">{errors.admin.password.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'config' && (
                <div className="p-8">
                  <p className="text-[13px] font-semibold text-[#0f0f12] mb-1">Slug / identificador</p>
                  <p className="text-[12px] text-[#7d7d87] mb-5">Identificador único de la óptica. Solo minúsculas, números y guiones bajos.</p>
                  <div className="flex flex-col gap-1.5 max-w-[400px]">
                    <label className="text-[11px] font-medium text-[#121215]">Slug *</label>
                    <Input
                      {...register('slug')}
                      placeholder="optica_ejemplo"
                      className="h-9 text-[13px] rounded-[6px] border-[#e0e0e5] font-mono"
                    />
                    {errors.slug && <p className="text-[11px] text-red-500">Solo minúsculas, números y guiones bajos</p>}
                    <p className="text-[11px] text-[#7d7d87]">Este valor se usa como subdominio y nombre de schema.</p>
                  </div>
                </div>
              )}

              {activeTab === 'flags' && (
                <div>
                  <div className="px-8 pt-6 pb-4">
                    <p className="text-[13px] font-semibold text-[#0f0f12]">Módulos del sistema</p>
                    <p className="text-[12px] text-[#7d7d87] mt-0.5">
                      Estos módulos se activarán al crear la óptica. Pueden modificarse después.
                    </p>
                  </div>
                  <div className="divide-y divide-[#f0f0f3]">
                    {FEATURE_FLAGS_DEFAULTS.map((flag) => (
                      <div key={flag.key} className="flex items-center justify-between px-8 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-[#121215]">{flag.label}</span>
                          <span className="text-[11px] text-[#7d7d87]">{flag.description}</span>
                        </div>
                        <Switch checked={flag.defaultEnabled} disabled />
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#e5e5e9] bg-[#fafafa] px-8 py-3">
                    <p className="text-[11px] text-[#7d7d87]">
                      Todos los módulos se activan por defecto. Puedes desactivar los que no necesites desde el detalle de la óptica.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-[332px] shrink-0 flex flex-col gap-4">
            <div className="rounded-[8px] border border-[#ebebee] bg-white p-5 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[#3a71f7] text-[10px]">◆</span>
                <span className="text-[13px] font-semibold text-[#0f0f12]">Impacto del multi-tenancy</span>
              </div>
              {[
                { title: 'Esquema de datos aislado', desc: 'Cada óptica operará en su propio schema PostgreSQL, garantizando aislamiento total de datos.' },
                { title: 'Administración delegada', desc: 'El admin asignado tendrá control total sobre usuarios, sedes y configuraciones de su óptica.' },
                { title: 'Control de funcionalidades', desc: 'Puedes activar o desactivar módulos específicos para cada óptica mediante feature flags.' },
                { title: 'Módulos personalizables', desc: 'Define qué módulos del sistema estarán disponibles en el sidebar de los usuarios de esta óptica.' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="mt-1.5 size-2 rounded-full bg-[#3a71f7] shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-[#0f0f12]">{title}</span>
                    <span className="text-[11px] text-[#7d7d87] leading-relaxed">{desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[8px] border border-[#3a71f7] bg-[#eff1ff] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[#3a71f7] text-[10px]">◆</span>
                <span className="text-[13px] font-semibold text-[#3a71f7]">Impacto operativo</span>
              </div>
              <p className="text-[12px] text-[#3a71f7] leading-relaxed">
                Al crear una nueva óptica, se generará automáticamente su schema de base de datos, se enviará un correo con credenciales al administrador asignado, y podrás configurar qué módulos del sistema estarán disponibles desde el inicio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#e5e5e9] bg-white h-[64px] px-6 flex items-center shrink-0">
        <p className="text-[12px] text-[#7d7d87]">Campos marcados con * son obligatorios</p>
      </div>
    </div>
  );
};

export default OpticaCreatePage;
