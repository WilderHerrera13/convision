import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/components/ui/use-toast';
import { superAdminService } from '@/services/superAdmin';
import OpticaAdminsTab from './OpticaAdminsTab';

const PLAN_LABELS: Record<string, string> = {
  standard: 'Estándar',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const FEATURE_META: Record<string, { label: string; description: string }> = {
  'sidebar.appointments':          { label: 'Citas',                          description: 'Agenda de citas y consultas' },
  'sidebar.sales':                 { label: 'Ventas',                         description: 'Punto de venta y facturación' },
  'sidebar.purchases':             { label: 'Compras',                        description: 'Gestión de compras a proveedores' },
  'sidebar.inventory':             { label: 'Inventario',                     description: 'Control de stock y productos' },
  'sidebar.laboratory':            { label: 'Laboratorio',                    description: 'Órdenes de laboratorio' },
  'sidebar.reports':               { label: 'Informe Gestión Especialista',   description: 'Reportes de gestión por especialista' },
  'sidebar.payroll':               { label: 'Nómina',                         description: 'Gestión de nómina y pagos' },
  'sidebar.expenses':              { label: 'Gastos',                         description: 'Control de gastos y egresos' },
  'sidebar.clinical':              { label: 'Historia Clínica',               description: 'Módulo de historia clínica avanzada' },
  'sidebar.catalog':               { label: 'Catálogo',                       description: 'Catálogo de productos y servicios' },
  'sidebar.quotes':                { label: 'Cotizaciones',                   description: 'Generación de cotizaciones' },
  'sidebar.discounts':             { label: 'Descuentos',                     description: 'Gestión de solicitudes de descuento' },
  'sidebar.cash_close':            { label: 'Cierre de Caja',                 description: 'Cierre diario de caja y historial' },
  'sidebar.advisor_report':        { label: 'Gestión Diaria de Asesor',       description: 'Reporte de gestión diario del asesor' },
  'sidebar.specialist_management': { label: 'Gestión Diaria de Especialista', description: 'Informe de gestión del especialista' },
};

const FEATURE_ORDER = [
  'sidebar.appointments', 'sidebar.sales', 'sidebar.quotes', 'sidebar.laboratory',
  'sidebar.purchases', 'sidebar.inventory', 'sidebar.payroll', 'sidebar.expenses',
  'sidebar.cash_close', 'sidebar.advisor_report', 'sidebar.specialist_management',
  'sidebar.reports', 'sidebar.clinical', 'sidebar.catalog', 'sidebar.discounts',
];

type Tab = 'info' | 'modules' | 'admins';

const OpticaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const opticaId = id ? Number(id) : NaN;
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const { data: optica, isLoading: loadingOptica, isError: errorOptica } = useQuery({
    queryKey: ['super-admin-optica', opticaId],
    queryFn: () => superAdminService.getOptica(opticaId),
    enabled: Number.isFinite(opticaId),
  });

  const { data: featuresData, isLoading: loadingFeatures } = useQuery({
    queryKey: ['super-admin-optica-features', opticaId],
    queryFn: () => superAdminService.listFeatures(opticaId),
    enabled: Number.isFinite(opticaId) && activeTab === 'modules',
  });

  if (!Number.isFinite(opticaId)) {
    navigate('/super-admin/opticas', { replace: true });
    return null;
  }

  if (loadingOptica) return <LoadingScreen />;

  if (errorOptica || !optica) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center text-sm text-[#7d7d87]">
          No se encontró la óptica.
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/super-admin/opticas')}>Volver</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async (featureKey: string, currentValue: boolean) => {
    setTogglingKey(featureKey);
    try {
      await superAdminService.toggleFeature(opticaId, featureKey, !currentValue);
      await queryClient.invalidateQueries({ queryKey: ['super-admin-optica-features', opticaId] });
      const meta = FEATURE_META[featureKey];
      toast({ title: 'Módulo actualizado', description: `${meta?.label ?? featureKey} ${!currentValue ? 'activado' : 'desactivado'}.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar el módulo';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setTogglingKey(null);
    }
  };

  const features = featuresData?.features ?? [];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Información' },
    { key: 'modules', label: 'Módulos' },
    { key: 'admins', label: 'Administradores' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[#ebebee] bg-white px-6 h-[60px] flex items-center justify-between shrink-0">
        <div>
          <p className="text-[12px] text-[#7d7d87] leading-none mb-1">Panel Super Admin / Ópticas / {optica.name}</p>
          <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-none">{optica.name}</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-[6px] text-[13px] border-[#e5e5e9]"
          onClick={() => navigate('/super-admin/opticas')}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Volver
        </Button>
      </div>

      <div className="border-b border-[#ebebee] bg-white px-6 shrink-0">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-[44px] px-4 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#3a71f7] text-[#3a71f7]'
                  : 'border-transparent text-[#7d7d87] hover:text-[#121215]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'info' && (
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="rounded-[8px] border border-[#ebebee] bg-white overflow-hidden">
                <div className="border-b border-[#e5e5e9] px-6 py-4">
                  <h2 className="text-[14px] font-semibold text-[#121215]">Información de la óptica</h2>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                    {[
                      { label: 'Nombre', value: optica.name },
                      { label: 'Slug', value: optica.slug },
                      { label: 'Schema', value: <code className="text-[12px] bg-[#f5f5f7] px-1.5 py-0.5 rounded text-[#3a71f7]">{optica.schema_name}</code> },
                      { label: 'Plan', value: <Badge variant="outline">{PLAN_LABELS[optica.plan] ?? optica.plan}</Badge> },
                      { label: 'Estado', value: <Badge variant={optica.is_active ? 'default' : 'secondary'}>{optica.is_active ? 'Activa' : 'Inactiva'}</Badge> },
                      { label: 'Creada', value: new Date(optica.created_at).toLocaleDateString('es-CO') },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <dt className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-[0.8px]">{label}</dt>
                        <dd className="font-medium text-[#121215]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
            <div className="w-[280px] shrink-0">
              <div className="rounded-[8px] border border-[#3a71f7] bg-[#eff1ff] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#3a71f7] text-[10px]">◆</span>
                  <span className="text-[13px] font-semibold text-[#3a71f7]">Multi-tenancy</span>
                </div>
                <p className="text-[12px] text-[#3a71f7] leading-relaxed">
                  Cada óptica tiene su propio schema de base de datos aislado. El schema <strong>{optica.schema_name}</strong> contiene todos los datos de esta clínica.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="rounded-[8px] border border-[#ebebee] bg-white overflow-hidden">
                <div className="border-b border-[#e5e5e9] px-6 py-4">
                  <h2 className="text-[14px] font-semibold text-[#121215]">Módulos del sistema</h2>
                  <p className="text-[12px] text-[#7d7d87] mt-0.5">Activa o desactiva los módulos del sidebar para esta óptica</p>
                </div>
                <div className="divide-y divide-[#f0f0f3]">
                  {loadingFeatures ? (
                    <div className="py-10 text-center text-sm text-[#7d7d87]">Cargando módulos...</div>
                  ) : (
                    FEATURE_ORDER.map((key) => {
                      const meta = FEATURE_META[key];
                      if (!meta) return null;
                      const feature = features.find((f) => f.feature_key === key);
                      const isEnabled = feature?.is_enabled ?? false;
                      return (
                        <div key={key} className="flex items-center justify-between px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-medium text-[#121215]">{meta.label}</span>
                            <span className="text-[11px] text-[#7d7d87]">{meta.description}</span>
                          </div>
                          <Switch
                            id={`feature-${key}`}
                            checked={isEnabled}
                            disabled={togglingKey === key}
                            onCheckedChange={() => handleToggle(key, isEnabled)}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-[#e5e5e9] bg-[#fafafa] px-6 py-3">
                  <p className="text-[11px] text-[#7d7d87]">Los cambios se aplican inmediatamente para todos los usuarios de la óptica.</p>
                </div>
              </div>
            </div>
            <div className="w-[280px] shrink-0 flex flex-col gap-4">
              <div className="rounded-[8px] border border-[#ebebee] bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[#3a71f7] text-[10px]">◆</span>
                  <span className="text-[13px] font-semibold text-[#0f0f12]">Resumen de módulos</span>
                </div>
                {loadingFeatures ? (
                  <div className="text-[12px] text-[#7d7d87]">Cargando...</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Módulos activos', value: features.filter((f) => f.is_enabled).length, color: '#228b52' },
                      { label: 'Módulos inactivos', value: features.filter((f) => !f.is_enabled).length, color: '#7d7d87' },
                      { label: 'Total configurados', value: features.length, color: '#3a71f7' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[12px] text-[#7d7d87]">{label}</span>
                        <span className="text-[14px] font-semibold" style={{ color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-[8px] border border-[#3a71f7] bg-[#eff1ff] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#3a71f7] text-[10px]">◆</span>
                  <span className="text-[13px] font-semibold text-[#3a71f7]">Impacto operativo</span>
                </div>
                <p className="text-[12px] text-[#3a71f7] leading-relaxed">
                  Los cambios en los módulos se aplican inmediatamente. Los usuarios verán el sidebar actualizado en su próxima acción.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <OpticaAdminsTab opticaId={opticaId} opticaName={optica.name} />
        )}
      </div>
    </div>
  );
};

export default OpticaDetailPage;
